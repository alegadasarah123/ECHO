from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
from datetime import datetime, date
import uuid
import requests
import time
import traceback
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from .models import CalendarEvent
from django.db import models
from openai import OpenAI
import openai
import re
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from typing import Optional, Dict, Any # For type hints
import base64
from django.contrib.auth.decorators import login_required
from django.urls import get_resolver
import traceback
import threading
from rest_framework.permissions import AllowAny
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta



logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY
BUCKET_NAME = "kutsero_op_profile"

# ------------------------------------------------ AI ASSISTANT API ------------------------------------------------

@api_view(['POST'])
def ai_assistant(request):
    """
    AI assistant restricted to horse health.
    Chat history is stored per user for 7 days and then automatically removed.
    """
    try:
        user_prompt = request.data.get("prompt")

        if not user_prompt:
            return Response({"success": False, "error": "Prompt is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        system_message = (
            "You are an AI assistant that ONLY answers questions about horse health "
            "(feeding, diseases, injuries, grooming, care, well-being). "
            "If the user asks anything unrelated to horse health, "
            "respond strictly with: 'I can only answer questions about horse health.'"
        )

        ai_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )

        answer = ai_response.choices[0].message.content.strip()

        # ✅ Save chat history in cache for 7 days
        session_id = str(request.user.id) if request.user.is_authenticated else "guest"
        history_key = f"chat_history_{session_id}"

        history = cache.get(history_key, [])
        history.append({
            "id": str(uuid.uuid4()),
            "prompt": user_prompt,
            "answer": answer
        })
        cache.set(history_key, history, timeout=7*24*60*60)  # 7 days in seconds

        return Response({"success": True, "prompt": user_prompt, "answer": answer},
                        status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"success": False, "error": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_chat_history(request):
    """
    Retrieve chat history for the current user (kept for 7 days).
    """
    session_id = str(request.user.id) if request.user.is_authenticated else "guest"
    history_key = f"chat_history_{session_id}"

    history = cache.get(history_key, [])

    return Response({"success": True, "history": history}, status=status.HTTP_200_OK)








# ------------------------------------------------ Messages ------------------------------------------------
# Philippine timezone
PHILIPPINE_TZ = ZoneInfo('Asia/Manila')

def format_timestamp(ts):
    """Helper to format ISO timestamp to readable string in Philippine time."""
    if not ts:
        return ""
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    # Convert to Philippine timezone
    dt_local = dt.astimezone(PHILIPPINE_TZ)
    return dt_local.strftime('%Y-%m-%d %I:%M %p')


@api_view(['GET'])
def get_messages(request):
    """
    Get all messages between two users.
    """
    try:
        user_id = request.GET.get("user_id")
        other_user_id = request.GET.get("other_user_id")
        if not user_id or not other_user_id:
            return Response({"error": "user_id and other_user_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch messages between two users
        messages_response = service_client.table("message").select(
            "mes_id, user_id, receiver_id, mes_content, mes_date, is_read"
        ).or_(
            f"and(user_id.eq.{user_id},receiver_id.eq.{other_user_id}),"
            f"and(user_id.eq.{other_user_id},receiver_id.eq.{user_id})"
        ).order("mes_date", desc=False).execute()

        messages = []
        for msg in messages_response.data or []:
            # Parse the timestamp and convert to Philippine time
            created_at = datetime.fromisoformat(msg['mes_date'].replace('Z', '+00:00'))
            created_at_ph = created_at.astimezone(PHILIPPINE_TZ)
            
            messages.append({
                'id': str(msg['mes_id']),
                'text': msg['mes_content'],
                'isUser': str(msg['user_id']) == str(user_id),
                'timestamp': created_at_ph.strftime('%I:%M %p'),  # Philippine time
                'created_at': msg['mes_date']  # Keep original UTC timestamp
            })

        # Mark unread messages as read
        service_client.table("message").update({"is_read": True}).eq("user_id", other_user_id).eq("receiver_id", user_id).eq("is_read", False).execute()

        return Response({
            'success': True,
            'messages': messages
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching messages: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def send_message(request):
    try:
        sender_id = request.data.get("sender_id")
        profile_receiver_id = request.data.get("receiver_id")  # profile table ID
        content = request.data.get("content", "").strip()

        if not sender_id or not profile_receiver_id:
            return Response({"error": "sender_id and receiver_id are required"}, status=400)
        if not content:
            return Response({"error": "Message content is required"}, status=400)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Convert profile ID to user_id in `users` table
        user_resp = service_client.table("users").select("id").eq("id", profile_receiver_id).execute()
        if not user_resp.data:
            return Response({"error": "Receiver does not exist in users table"}, status=400)

        receiver_user_id = user_resp.data[0]['id']

        # Insert message
        message_resp = service_client.table("message").insert({
            "user_id": sender_id,
            "receiver_id": receiver_user_id,
            "mes_content": content,
            "is_read": False
        }).execute()

        if not message_resp.data:
            return Response({"error": "Failed to send message"}, status=500)

        msg = message_resp.data[0]
        created_at = datetime.fromisoformat(msg['mes_date'].replace('Z', '+00:00')).astimezone(PHILIPPINE_TZ)

        return Response({
            "success": True,
            "message": {
                "id": str(msg['mes_id']),
                "text": msg['mes_content'],
                "isUser": True,
                "timestamp": created_at.strftime('%I:%M %p'),
                "created_at": msg['mes_date']
            }
        }, status=201)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)




@api_view(['GET'])
def available_users(request):
    """
    Get all users that can be messaged:
    - Kutseros
    - Kutsero Presidents (use user_id!)
    - Horse Operators
    - CTU Vets
    - DVMF Users
    """
    try:
        current_user_id = request.GET.get("user_id")
        search_query = request.GET.get("search", "").lower()
        role_filter = request.GET.get("role")

        if not current_user_id:
            return Response({"error": "user_id is required"}, status=400)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        users = []

        # Helper function to fetch profile table users
        def fetch_profiles(table_name, id_col, fname_col, lname_col, role_name, avatar, profile_image_col=None, use_user_id=False):
            try:
                select_cols = f"{id_col},{fname_col},{lname_col}"
                if profile_image_col:
                    select_cols += f",{profile_image_col}"
                profiles = service_client.table(table_name).select(select_cols).neq(id_col, current_user_id).execute()

                for p in profiles.data or []:
                    user_id_val = p['user_id'] if use_user_id else p[id_col]  # use user_id only for Kutsero Presidents

                    # Skip if not in users table
                    user_resp = service_client.table("users").select("id,status").eq("id", user_id_val).execute()
                    if not user_resp.data:
                        continue
                    user_status = user_resp.data[0].get("status", "active")
                    if user_status in ['declined', 'pending']:
                        continue

                    # Build display name
                    display_name = str(p.get(fname_col, "Unknown"))
                    if p.get(lname_col):
                        display_name += f" {p[lname_col]}"

                    if search_query and search_query not in display_name.lower():
                        continue

                    users.append({
                        "id": user_id_val,
                        "name": display_name,
                        "role": role_name,
                        "avatar": avatar,
                        "status": user_status,
                        "profile_image": p.get(profile_image_col) if profile_image_col else None
                    })
            except Exception as e:
                print(f"Error fetching {role_name}: {e}")

        # Fetch each role
        if role_filter in [None, "kutsero"]:
            fetch_profiles("kutsero_profile", "kutsero_id", "kutsero_fname", "kutsero_lname", "kutsero", "🐴", "kutsero_image")

        if role_filter in [None, "Kutsero President"]:
            fetch_profiles("kutsero_pres_profile", "pres_id", "pres_fname", "pres_lname", "Kutsero President", "👑", use_user_id=True)

        if role_filter in [None, "horse_operator"]:
            fetch_profiles("horse_op_profile", "op_id", "op_fname", "op_lname", "horse_operator", "👨‍💼", "op_image")

        if role_filter in [None, "ctu_vet", "Ctu-Vetmed"]:
            fetch_profiles("ctu_vet_profile", "ctu_id", "ctu_fname", "ctu_lname", "Ctu-Vetmed", "🧑‍⚕️")

        if role_filter in [None, "dvmf_user", "Dvmf"]:
            fetch_profiles("dvmf_user_profile", "dvmf_id", "dvmf_fname", "dvmf_lname", "Dvmf", "🧑‍💼")

        # Sort by name
        users.sort(key=lambda x: x['name'])
        return Response({'users': users, 'total_count': len(users)}, status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)



@api_view(['GET'])
def conversations(request):
    """
    Fetch all conversations for a given user, grouped by conversation partner.
    Only show unread count for messages sent TO the current user.
    """
    print("=" * 80)
    print("CONVERSATIONS ENDPOINT CALLED")
    print("=" * 80)
    
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        print(f"Fetching conversations for user: {user_id}")
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch all messages involving the user
        messages_response = service_client.table("message").select("*").or_(
            f"user_id.eq.{user_id},receiver_id.eq.{user_id}"
        ).order("mes_date", desc=True).execute()

        messages = messages_response.data or []
        print(f"Found {len(messages)} total messages")

        # Dictionary to hold conversations
        conversations_dict = {}

        for msg in messages:
            # Determine the other user ID and ensure it's a string
            other_user_id = str(msg['receiver_id']) if str(msg['user_id']) == str(user_id) else str(msg['user_id'])

            if other_user_id not in conversations_dict:
                # Check if this message is unread
                # Only count as unread if: message was sent TO current user AND is_read is False
                is_unread = (str(msg['receiver_id']) == str(user_id) and not msg.get('is_read', False))
                
                conversations_dict[other_user_id] = {
                    'other_user_id': other_user_id,
                    'last_message': msg.get('mes_content'),
                    'last_message_time': msg.get('mes_date'),
                    'is_read': msg.get('is_read', False),
                    'unread_count': 1 if is_unread else 0
                }

        print(f"Grouped into {len(conversations_dict)} conversations")
        print(f"Other user IDs: {list(conversations_dict.keys())}")

        # Now count all unread messages for each conversation
        for other_user_id in conversations_dict.keys():
            # Count unread messages: where sender is other_user_id, receiver is current user, and is_read is False
            unread_response = service_client.table("message").select(
                "mes_id", count="exact"
            ).eq("user_id", other_user_id).eq("receiver_id", user_id).eq("is_read", False).execute()
            
            unread_count = unread_response.count if unread_response.count else 0
            conversations_dict[other_user_id]['unread_count'] = unread_count
            conversations_dict[other_user_id]['is_read'] = (unread_count == 0)
            
            print(f"User {other_user_id}: {unread_count} unread messages")

        # Fetch partner information for each conversation
        conversations_list = []
        for other_user_id, conv_data in conversations_dict.items():
            print(f"\n{'='*60}")
            print(f"Looking up user: {other_user_id}")
            user_info = None
            
            # Check kutsero_profile table
            try:
                kutsero_response = service_client.table("kutsero_profile").select("*").eq("kutsero_id", other_user_id).execute()
                
                if kutsero_response.data and len(kutsero_response.data) > 0:
                    user = kutsero_response.data[0]
                    
                    fname = str(user.get('kutsero_fname', '')).strip()
                    lname = str(user.get('kutsero_lname', '')).strip()
                    username = str(user.get('kutsero_username', '')).strip()
                    
                    # Build name with fallbacks
                    if fname and lname:
                        name = f"{fname} {lname}"
                    elif fname:
                        name = fname
                    elif lname:
                        name = lname
                    elif username:
                        name = username
                    else:
                        name = 'Kutsero User'
                    
                    user_info = {
                        'name': name,
                        'email': user.get('kutsero_email', ''),
                        'role': 'kutsero',
                        'avatar': '🐴',
                        'status': user.get('kutsero_status', 'pending'),
                        'profile_image': user.get('kutsero_image')
                    }
                    print(f"✓ SUCCESS - Found in kutsero_profile: {name}")
            except Exception as e:
                print(f"✗ ERROR checking kutsero_profile: {e}")
            
            # Check kutsero_pres_profile table
            if not user_info:
                try:
                    pres_response = service_client.table("kutsero_pres_profile").select("*").eq("pres_id", other_user_id).execute()
                    
                    if pres_response.data and len(pres_response.data) > 0:
                        user = pres_response.data[0]
                        
                        fname = str(user.get('pres_fname', '')).strip()
                        lname = str(user.get('pres_lname', '')).strip()
                        
                        if fname and lname:
                            name = f"{fname} {lname}"
                        elif fname:
                            name = fname
                        elif lname:
                            name = lname
                        else:
                            name = 'Kutsero President'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('pres_email', ''),
                            'role': 'Kutsero President',
                            'avatar': '👑',
                            'status': 'active',
                            'profile_image': None
                        }
                        print(f"✓ SUCCESS - Found in kutsero_pres_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking kutsero_pres_profile: {e}")
            
            # REMOVED vet_profile check - vets should not be in conversations
            
            # Check horse_op_profile table - FIXED: using correct column names
            if not user_info:
                try:
                    operator_response = service_client.table("horse_op_profile").select("*").eq("op_id", other_user_id).execute()
                    
                    if operator_response.data and len(operator_response.data) > 0:
                        user = operator_response.data[0]
                        
                        fname = str(user.get('op_fname', '')).strip()
                        lname = str(user.get('op_lname', '')).strip()
                        
                        if fname and lname:
                            name = f"{fname} {lname}"
                        elif fname:
                            name = fname
                        elif lname:
                            name = lname
                        else:
                            name = 'Operator User'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('op_email', ''),
                            'role': 'horse_operator',
                            'avatar': '👨‍💼',
                            'status': user.get('op_status', 'pending'),
                            'profile_image': user.get('op_image')
                        }
                        print(f"✓ SUCCESS - Found in horse_op_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking horse_op_profile: {e}")
            
            # Check CTU vet profile
            if not user_info:
                try:
                    ctu_response = service_client.table("ctu_vet_profile").select("*").eq("ctu_id", other_user_id).execute()
                    
                    if ctu_response.data and len(ctu_response.data) > 0:
                        user = ctu_response.data[0]
                        
                        fname = str(user.get('ctu_fname', '')).strip()
                        lname = str(user.get('ctu_lname', '')).strip()
                        
                        if fname and lname:
                            name = f"Dr. {fname} {lname}"
                        elif fname:
                            name = f"Dr. {fname}"
                        else:
                            name = 'CTU Vet'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('ctu_email', ''),
                            'role': 'Ctu-Vetmed',
                            'avatar': '🧑‍⚕️',
                            'status': 'active',
                            'profile_image': None  # CTU vets use hardcoded image in frontend
                        }
                        print(f"✓ SUCCESS - Found in ctu_vet_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking ctu_vet_profile: {e}")
            
            # Check DVMF user profile
            if not user_info:
                try:
                    dvmf_response = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", other_user_id).execute()
                    
                    if dvmf_response.data and len(dvmf_response.data) > 0:
                        user = dvmf_response.data[0]
                        
                        fname = str(user.get('dvmf_fname', '')).strip()
                        lname = str(user.get('dvmf_lname', '')).strip()
                        
                        if fname and lname:
                            name = f"{fname} {lname}"
                        elif fname:
                            name = fname
                        else:
                            name = 'DVMF User'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('dvmf_email', ''),
                            'role': 'Dvmf',
                            'avatar': '🧑‍💼',
                            'status': 'active',
                            'profile_image': None  # DVMF users use hardcoded image in frontend
                        }
                        print(f"✓ SUCCESS - Found in dvmf_user_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking dvmf_user_profile: {e}")
            
            # If user not found in any table
            if not user_info:
                print(f"\n⚠ WARNING: User {other_user_id} NOT FOUND in any profile table!")
                user_info = {
                    'name': 'Unknown User',
                    'email': '',
                    'role': 'unknown',
                    'avatar': '👤',
                    'status': 'unknown',
                    'profile_image': None
                }
            
            # Format timestamp to Philippine time
            timestamp_ph = ""
            if conv_data['last_message_time']:
                try:
                    dt = datetime.fromisoformat(conv_data['last_message_time'].replace('Z', '+00:00'))
                    dt_ph = dt.astimezone(PHILIPPINE_TZ)
                    timestamp_ph = dt_ph.strftime('%I:%M %p')
                except Exception as e:
                    print(f"Error formatting timestamp: {e}")
            
            # Combine conversation data with user info
            unread_count = conv_data['unread_count']
            conversation_data = {
                'id': f"{user_id}_{other_user_id}",
                'partner_id': other_user_id,
                'sender': user_info['name'],
                'partner_name': user_info['name'],
                'email': user_info['email'],
                'role': user_info['role'],
                'avatar': user_info['avatar'],
                'status': user_info['status'],
                'profile_image': user_info.get('profile_image'),
                'last_message': conv_data['last_message'],
                'preview': conv_data['last_message'],
                'last_message_time': conv_data['last_message_time'],
                'timestamp': timestamp_ph,
                'is_read': conv_data['is_read'],
                'unread': unread_count > 0,
                'unread_count': unread_count
            }
            print(f"Adding conversation - Name: {user_info['name']}, Role: {user_info['role']}, Profile Image: {user_info.get('profile_image')}")
            conversations_list.append(conversation_data)

        # Sort by last message time
        conversations_list = sorted(
            conversations_list,
            key=lambda x: x['last_message_time'] if x['last_message_time'] else '',
            reverse=True
        )

        print(f"\n{'='*60}")
        print(f"Returning {len(conversations_list)} conversations")
        
        for c in conversations_list:
            print(f"  - {c['sender']}: {c['unread_count']} unread | Time: {c['timestamp']}")
        
        print("=" * 80)

        return Response({
            'conversations': conversations_list,
            'total_count': len(conversations_list)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ ERROR in conversations endpoint: {e}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
def debug_user_lookup(request):
    """
    Debug endpoint to check where a user exists
    """
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        results = {}
        
        # Check users table
        try:
            users_response = service_client.table("users").select("*").eq("id", user_id).execute()
            results['users_table'] = users_response.data
        except Exception as e:
            results['users_table_error'] = str(e)
        
        # Check kutsero table
        try:
            kutsero_response = service_client.table("kutsero").select("*").eq("kutsero_id", user_id).execute()
            results['kutsero_table'] = kutsero_response.data
        except Exception as e:
            results['kutsero_table_error'] = str(e)
        
        # Check vet table
        try:
            vet_response = service_client.table("vet").select("*").eq("vet_id", user_id).execute()
            results['vet_table'] = vet_response.data
        except Exception as e:
            results['vet_table_error'] = str(e)
        
        # Check horse_operator table
        try:
            operator_response = service_client.table("horse_operator").select("*").eq("operator_id", user_id).execute()
            results['horse_operator_table'] = operator_response.data
        except Exception as e:
            results['horse_operator_table_error'] = str(e)
        
        return Response(results, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
# ------------------------------------------------ HORSE ASSIGNMENT API ------------------------------------------------
BUCKET_NAME = "horse_image"

@api_view(['GET'])
def available_horses(request):
    """
    Get all horses with their op info, health status, and image URL from Supabase Storage
    """
    op_id = request.GET.get("op_id")
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())

        # Get all horses including horse_status
        horses_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, horse_status, op_id"
        ).execute()

        if not horses_response.data:
            return Response({
                'horses': [],
                'total_count': 0,
                'available_count': 0,
                'assigned_count': 0
            }, status=status.HTTP_200_OK)

        # Get all ops
        ops_response = service_client.table("horse_op_profile").select(
            "op_id, op_fname, op_lname"
        ).execute()

        # Get all active assignments (where date_end is null)
        active_assignments_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, kutsero_id, date_start, date_end"
        ).is_("date_end", "null").execute()

        # Create lookup dictionaries
        ops_dict = {op['op_id']: op for op in ops_response.data} if ops_response.data else {}
        assignments_dict = {assign['horse_id']: assign for assign in active_assignments_response.data} if active_assignments_response.data else {}

        horses = []
        for horse in horses_response.data:
            # Generate image URL from Supabase storage
            image_path = horse.get("horse_image")
            if image_path:
                try:
                    image_url = service_client.storage.from_(BUCKET_NAME).get_public_url(image_path).get("publicUrl")
                    if not image_url:
                        image_url = "https://via.placeholder.com/150?text=No+Image"
                except Exception:
                    image_url = "https://via.placeholder.com/150?text=No+Image"
            else:
                image_url = "https://via.placeholder.com/150?text=No+Image"

            # Get op info
            op_name = "No Op Assigned"
            if horse.get('op_id'):
                op = ops_dict.get(horse['op_id'])
                if op:
                    if op.get('op_fname') and op.get('op_lname'):
                        op_name = f"{op['op_fname']} {op['op_lname']}"
                    elif op.get('op_fname'):
                        op_name = op['op_fname']
                    elif op.get('op_lname'):
                        op_name = op['op_lname']
                    else:
                        op_name = "Unnamed Op"
                else:
                    op_name = "Op Not Found"

            # Get health status from database
            # Map database values to expected frontend format
            db_health_status = horse.get('horse_status', '').strip().lower()
            
            if db_health_status == 'healthy':
                health_status = 'Healthy'
            elif db_health_status == 'unhealthy':
                health_status = 'Unhealthy'
            elif db_health_status == 'sick':
                health_status = 'Sick'
            else:
                # Default to Healthy if status is missing or unrecognized
                health_status = 'Healthy'

            # Check assignment status
            assignment = assignments_dict.get(horse['horse_id'])
            if assignment:
                assignment_status = 'assigned'
                status_text = 'Currently assigned'
                current_assignment_id = assignment['assign_id']
                assignment_start = assignment['date_start']
                assignment_end = assignment['date_end']
            else:
                assignment_status = 'available'
                status_text = 'Ready for work'
                current_assignment_id = None
                assignment_start = None
                assignment_end = None

            horses.append({
                'id': horse['horse_id'],
                'name': horse.get('horse_name', 'Unnamed Horse'),
                'breed': horse.get('horse_breed', 'Mixed Breed'),
                'age': horse.get('horse_age', 5),
                'color': horse.get('horse_color', 'Brown'),
                'image': image_url,
                'healthStatus': health_status,  # Now using actual database value
                'status': status_text,
                'opName': op_name,
                'assignmentStatus': assignment_status,
                'currentAssignmentId': current_assignment_id,
                'checkedInAt': assignment_start,
                'checkedOutAt': assignment_end
            })

        # Calculate statistics
        total_count = len(horses)
        available_count = len([h for h in horses if h['assignmentStatus'] == 'available'])
        assigned_count = len([h for h in horses if h['assignmentStatus'] == 'assigned'])

        return Response({
            'horses': horses,
            'total_count': total_count,
            'available_count': available_count,
            'assigned_count': assigned_count
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching horses for assignment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def checkout(request):
    """
    Check out from a horse assignment (set date_end to current timestamp)
    This represents the kutsero checking out from the horse
    """
    try:
        assignment_id = request.data.get("assignment_id")
        kutsero_id = request.data.get("kutsero_id")
        
        print(f"Checkout request - assignment_id: {assignment_id}, kutsero_id: {kutsero_id}")
        
        if not assignment_id:
            return Response({
                "error": "assignment_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Use timezone-aware datetime for consistency
        from datetime import timezone
        checkout_time = datetime.now(timezone.utc).isoformat()
        
        # Verify the assignment exists and belongs to the kutsero (if kutsero_id provided)
        assignment_query = service_client.table("horse_assignment").select(
            "assign_id, kutsero_id, horse_id, date_start, date_end"
        ).eq("assign_id", assignment_id)
        
        if kutsero_id:
            assignment_query = assignment_query.eq("kutsero_id", kutsero_id)
            
        assignment_response = assignment_query.execute()
        
        if not assignment_response.data:
            return Response({
                "error": "Assignment not found or you don't have permission to check out from this assignment"
            }, status=status.HTTP_404_NOT_FOUND)
        
        assignment = assignment_response.data[0]
        
        # Check if already checked out
        if assignment.get('date_end'):
            return Response({
                "error": f"Already checked out on {assignment['date_end']}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get horse details for response
        horse_response = service_client.table("horse_profile").select(
            "horse_id, horse_name"
        ).eq("horse_id", assignment['horse_id']).execute()
        
        horse_name = "Unknown Horse"
        if horse_response.data:
            horse_name = horse_response.data[0].get('horse_name', 'Unknown Horse')
        
        # Set check-out time
        update_result = service_client.table("horse_assignment").update({
            "date_end": checkout_time
        }).eq("assign_id", assignment_id).execute()
        
        if update_result.data:
            # Calculate work duration with proper timezone handling
            try:
                # Parse both datetimes as timezone-aware
                checkin_time_str = assignment['date_start']
                if checkin_time_str.endswith('Z'):
                    checkin_time_str = checkin_time_str.replace('Z', '+00:00')
                elif not ('+' in checkin_time_str[-6:] or checkin_time_str.endswith('Z')):
                    # If no timezone info, assume UTC
                    checkin_time_str += '+00:00'
                
                checkout_time_str = checkout_time
                if checkout_time_str.endswith('Z'):
                    checkout_time_str = checkout_time_str.replace('Z', '+00:00')
                elif not ('+' in checkout_time_str[-6:] or checkout_time_str.endswith('Z')):
                    # If no timezone info, assume UTC
                    checkout_time_str += '+00:00'
                
                checkin_time = datetime.fromisoformat(checkin_time_str)
                checkout_time_dt = datetime.fromisoformat(checkout_time_str)
                work_duration = checkout_time_dt - checkin_time
                
            except Exception as duration_error:
                print(f"Error calculating work duration: {duration_error}")
                work_duration = "Unable to calculate"
            
            print(f"Successfully checked out from assignment {assignment_id}")
            return Response({
                "message": f"Successfully checked out from {horse_name}",
                "assignment": {
                    "assign_id": assignment_id,
                    "horse_id": assignment['horse_id'],
                    "horse_name": horse_name,
                    "checked_in_at": assignment['date_start'],
                    "checked_out_at": checkout_time,
                    "work_duration": str(work_duration)
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Failed to update checkout time"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print(f"Error during checkout: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def unassign_horse(request):
    """
    Unassign a horse (same as checkout - for backward compatibility)
    """
    return checkout(request)


@api_view(['GET'])
def current_assignment(request):
    """
    Get current horse assignment for a kutsero (only if checked in and active).
    """
    kutsero_id = request.GET.get("kutsero_id")

    if not kutsero_id:
        return Response({
            "error": "kutsero_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # 🔍 Find active assignment (date_end IS NULL)
        assignment_response = (
            service_client.table("horse_assignment")
            .select("assign_id, horse_id, date_start, date_end")
            .eq("kutsero_id", kutsero_id)
            .is_("date_end", "null")  # only active
            .order("date_start", desc=True)
            .limit(1)
            .execute()
        )

        assignments = assignment_response.data or []
        print(f"Found {len(assignments)} active assignments for kutsero {kutsero_id}")

        if assignments:
            assignment = assignments[0]
            print(f"Active assignment ID: {assignment['assign_id']}")

            # 🔍 Fetch horse details
            horse_response = (
                service_client.table("horse_profile")
                .select("horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, op_id")
                .eq("horse_id", assignment["horse_id"])
                .execute()
            )

            if horse_response.data:
                horse = horse_response.data[0]

                # 🔍 Fetch operator details
                op_name = "Unknown Operator"
                if horse.get("op_id"):
                    op_response = (
                        service_client.table("horse_op_profile")
                        .select("op_fname, op_mname, op_lname")
                        .eq("op_id", horse["op_id"])
                        .execute()
                    )
                    if op_response.data:
                        op = op_response.data[0]
                        name_parts = [
                            part for part in [
                                op.get("op_fname"),
                                op.get("op_mname"),
                                op.get("op_lname")
                            ] if part
                        ]
                        if name_parts:
                            op_name = " ".join(name_parts)

                # ✅ Successful response
                return Response({
                    "assignment": {
                        "assignmentId": assignment["assign_id"],
                        "checkedInAt": assignment["date_start"],
                        "checkedOutAt": assignment["date_end"],  # should still be NULL
                        "horse": {
                            "id": horse["horse_id"],
                            "name": horse.get("horse_name") or "Unnamed Horse",
                            "breed": horse.get("horse_breed") or "Mixed Breed",
                            "age": horse.get("horse_age") or 5,
                            "color": horse.get("horse_color") or "Brown",
                            "image": horse.get("horse_image"),
                            "healthStatus": "Healthy",
                            "status": "Currently checked in",
                            "opName": op_name,
                            "ownerName": op_name,
                            "operatorName": op_name,
                            "lastCheckup": f"{(datetime.now() - datetime(2024, 5, 25)).days} days ago",
                            "nextCheckup": "June 15, 2025"
                        }
                    }
                }, status=status.HTTP_200_OK)

        # 🚫 No active assignment
        print("No active assignment found")
        return Response({
            "assignment": None,
            "message": "No active horse assignment found"
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error getting kutsero assignment: {e}")
        print(traceback.format_exc())
        return Response({
            "error": "Failed to fetch current assignment",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def assign_horse(request):
    """
    Assign a horse to a kutsero (creates a new assignment record)
    This represents the kutsero checking in with a horse
    """
    kutsero_id = request.data.get("kutsero_id")
    horse_id = request.data.get("horse_id")
    date_start = request.data.get("date_start")
    force_switch = request.data.get("force_switch", False)
    
    print(f"🔄 Assignment request - kutsero_id: {kutsero_id}, horse_id: {horse_id}, date: {date_start}")
    
    if not all([kutsero_id, horse_id, date_start]):
        return Response({
            "error": "kutsero_id, horse_id, and date_start are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Step 1: Handle existing assignments if force_switch is enabled
        previous_assignments_ended = 0
        
        if force_switch:
            # Find and end any active assignments for this kutsero
            existing_assignments = service_client.table("horse_assignment").select(
                "assign_id, horse_id"
            ).eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
            
            if existing_assignments.data:
                print(f"🔄 Found {len(existing_assignments.data)} existing assignments to end")
                for assignment in existing_assignments.data:
                    # End the existing assignment
                    service_client.table("horse_assignment").update({
                        "date_end": current_time
                    }).eq("assign_id", assignment["assign_id"]).execute()
                    previous_assignments_ended += 1
                    print(f"✅ Ended assignment {assignment['assign_id']}")
        
        # Step 2: Check if the target horse is available
        # Look for active assignments (date_end IS NULL) for this horse
        horse_assignments = service_client.table("horse_assignment").select(
            "assign_id, kutsero_id"
        ).eq("horse_id", horse_id).is_("date_end", "null").execute()
        
        if horse_assignments.data:
            # Horse is assigned to someone else
            assigned_kutsero = horse_assignments.data[0]["kutsero_id"]
            if assigned_kutsero != kutsero_id:
                return Response({
                    "error": f"Horse is already assigned to another kutsero (ID: {assigned_kutsero})"
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": "You already have this horse assigned"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 3: Create new assignment record
        assignment_id = str(uuid.uuid4())
        
        assignment_payload = {
            "assign_id": assignment_id,
            "kutsero_id": kutsero_id,
            "horse_id": horse_id,
            "date_start": current_time,  # This is the check-in timestamp
            "date_end": None,  # Will be set when kutsero checks out
            "created_at": current_time
        }
        
        print(f"🔧 Creating assignment with payload: {assignment_payload}")
        
        # Insert the new assignment
        assignment_result = service_client.table("horse_assignment").insert(assignment_payload).execute()
        
        if not assignment_result.data:
            return Response({
                "error": "Failed to create horse assignment"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        created_assignment = assignment_result.data[0]
        print(f"✅ Created assignment: {created_assignment}")
        
        # Step 4: Fetch horse details for response
        horse_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, op_id"
        ).eq("horse_id", horse_id).execute()
        
        horse_data = {"horse_name": "Unknown Horse"}  # Default fallback
        if horse_response.data:
            horse_data = horse_response.data[0]
        
        # Step 5: Fetch operator details if available
        op_name = "Unknown Operator"
        if horse_data.get("op_id"):
            op_response = service_client.table("horse_op_profile").select(
                "op_fname, op_mname, op_lname"
            ).eq("op_id", horse_data["op_id"]).execute()
            
            if op_response.data:
                op = op_response.data[0]
                name_parts = [
                    part for part in [
                        op.get("op_fname"),
                        op.get("op_mname"), 
                        op.get("op_lname")
                    ] if part
                ]
                if name_parts:
                    op_name = " ".join(name_parts)
        
        # Step 6: Build comprehensive response
        response_data = {
            "message": "Horse assigned successfully",
            "assignment": {
                "assign_id": assignment_id,
                "kutsero_id": kutsero_id,
                "horse_id": horse_id,
                "date_start": current_time,
                "date_end": None,
                "status": "active"
            },
            "horse": {
                "id": horse_id,
                "name": horse_data.get("horse_name", "Unknown Horse"),
                "breed": horse_data.get("horse_breed", "Mixed Breed"),
                "age": horse_data.get("horse_age", 5),
                "color": horse_data.get("horse_color", "Brown"),
                "image": horse_data.get("horse_image"),
                "healthStatus": "Healthy",
                "status": "Currently assigned",
                "opName": op_name,
                "ownerName": op_name,
                "operatorName": op_name,
                "assignmentStatus": "assigned",
                "currentAssignmentId": assignment_id,
                "lastCheckup": f"{(datetime.now() - datetime(2024, 5, 25)).days} days ago",
                "nextCheckup": "June 15, 2025"
            },
            "previous_assignments_ended": previous_assignments_ended
        }
        
        print(f"✅ Assignment successful - returning response: {response_data}")
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"❌ Error in assign_horse: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_assignment_history(request):
    """
    Get assignment history for a kutsero with check-in/check-out details
    """
    kutsero_id = request.GET.get("kutsero_id")
    
    if not kutsero_id:
        return Response({
            "error": "kutsero_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all assignments for this kutsero (ordered by most recent first)
        assignments_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, date_start, date_end"
        ).eq("kutsero_id", kutsero_id)\
         .order("date_start", desc=True)\
         .execute()
        
        if not assignments_response.data:
            return Response({
                'assignments': [],
                'total_count': 0
            }, status=status.HTTP_200_OK)
        
        # Get horse details for each assignment
        horse_ids = [a['horse_id'] for a in assignments_response.data]
        horses_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, op_id"
        ).in_("horse_id", horse_ids).execute()
        
        # Create lookup dictionary for horses
        horses_dict = {h['horse_id']: h for h in (horses_response.data or [])}
        
        # Get op details for horses that have them
        op_ids = [h.get('op_id') for h in (horses_response.data or []) if h.get('op_id')]
        ops_dict = {}
        if op_ids:
            ops_response = service_client.table("horse_op_profile").select(
                "op_id, op_fname, op_lname"
            ).in_("op_id", op_ids).execute()
            ops_dict = {op['op_id']: op for op in (ops_response.data or [])}
        
        # Build assignment history
        assignments = []
        
        for assignment in assignments_response.data:
            horse = horses_dict.get(assignment['horse_id'])
            if not horse:
                continue
                
            # Get op name
            op_name = "Unknown Op"
            if horse.get('op_id'):
                op = ops_dict.get(horse['op_id'])
                if op:
                    if op.get('op_fname') and op.get('op_lname'):
                        op_name = f"{op['op_fname']} {op['op_lname']}"
                    elif op.get('op_fname'):
                        op_name = op['op_fname']
                    elif op.get('op_lname'):
                        op_name = op['op_lname']
            
            # Calculate work duration if checked out
            work_duration = None
            if assignment['date_start'] and assignment['date_end']:
                try:
                    start_time = datetime.fromisoformat(assignment['date_start'].replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(assignment['date_end'].replace('Z', '+00:00'))
                    work_duration = str(end_time - start_time)
                except:
                    work_duration = "Unable to calculate"
            
            # Determine if assignment is active (not checked out yet)
            is_active = assignment['date_end'] is None
            
            assignments.append({
                'assignmentId': assignment['assign_id'],
                'checkedInAt': assignment['date_start'],
                'checkedOutAt': assignment['date_end'],
                'workDuration': work_duration,
                'isActive': is_active,
                'status': 'Active (Checked In)' if is_active else 'Completed (Checked Out)',
                'horse': {
                    'id': horse['horse_id'],
                    'name': horse['horse_name'] or 'Unnamed Horse',
                    'breed': horse['horse_breed'] or 'Mixed Breed',
                    'age': horse['horse_age'] or 5,
                    'color': horse['horse_color'] or 'Brown',
                    'image': horse['horse_image'],
                    'opName': op_name,
                }
            })
        
        return Response({
            'assignments': assignments,
            'total_count': len(assignments),
            'active_count': len([a for a in assignments if a['isActive']]),
            'completed_count': len([a for a in assignments if not a['isActive']])
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error getting assignment history: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")

api_view(['GET'])
def get_user_assignments(request, kutsero_id):
    """
    Get all horse assignments for a specific kutsero
    Example: /api/assignments/kutsero/123
    """
    try:
        # Get assignments with horse details
        data = supabase.table("horse_assignment").select("""
            *,
            horse_profile:horse_id (
                id,
                horse_name,
                horse_breed,
                horse_age,
                health_status,
                status,
                last_checkup,
                next_checkup,
                horse_image
            )
        """).eq("kutsero_id", kutsero_id).order("created_at", desc=True).execute()
        
        # Transform data for frontend
        assignments = []
        for assignment in data.data:
            horse = assignment.get("horse_profile")
            if horse:
                assignment_data = {
                    "assign_id": assignment.get("assign_id"),
                    "date_start": assignment.get("date_start"),
                    "date_end": assignment.get("date_end"),
                    "status": assignment.get("status"),
                    "horse": {
                        "id": str(horse.get("id")),
                        "name": horse.get("horse_name"),
                        "breed": horse.get("horse_breed"),
                        "age": horse.get("horse_age"),
                        "healthStatus": horse.get("health_status", "Healthy"),
                        "status": horse.get("status", "Ready for work"),
                        "lastCheckup": horse.get("last_checkup"),
                        "nextCheckup": horse.get("next_checkup"),
                        "image": horse.get("horse_image")
                    }
                }
                assignments.append(assignment_data)
        
        return Response(assignments, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def test_connection(request):
    return Response({"message": "Kutsero API is working"}, status=status.HTTP_200_OK)


# ------------------------------------------------ FEED AND WATER MANAGEMENT API ------------------------------------------------
@api_view(['GET'])
def get_feed_schedule(request):
    """Get feeding schedule for a specific horse and kutsero"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Query feed_detail table
        response = supabase.table('feed_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .order('fd_time', desc=False)\
            .execute()
        
        feed_schedule = response.data if response.data else []
        
        # Transform the data for better frontend consumption
        transformed_schedule = []
        for feed in feed_schedule:
            transformed_schedule.append({
                'id': feed.get('fd_id'),
                'kutsero_id': feed.get('kutsero_id'),
                'horse_id': feed.get('horse_id'),
                'op_id': feed.get('op_id'),
                'meal_type': feed.get('fd_meal_type', ''),
                'food_type': feed.get('fd_food_type', ''),
                'quantity': feed.get('fd_qty', ''),
                'time': feed.get('fd_time', ''),
                'completed': feed.get('completed', False),
                'completed_at': feed.get('completed_at'),
                'created_at': feed.get('created_at'),
                'user_type': feed.get('user_type', ''),
                'notes': f"{feed.get('fd_meal_type', '')} - {feed.get('fd_food_type', '')}"
            })
        
        return Response({
            'success': True,
            'count': len(transformed_schedule),
            'data': transformed_schedule
        })
        
    except Exception as e:
        print(f"Error in get_feed_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_water_schedule(request):
    """Get watering schedule for a specific horse and kutsero"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Query water_detail table
        response = supabase.table('water_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .order('water_time', desc=False)\
            .execute()
        
        water_schedule = response.data if response.data else []
        
        # Transform the data for better frontend consumption
        transformed_schedule = []
        for water in water_schedule:
            transformed_schedule.append({
                'id': water.get('water_id'),
                'kutsero_id': water.get('kutsero_id'),
                'horse_id': water.get('horse_id'),
                'op_id': water.get('op_id'),
                'period': water.get('water_period', ''),
                'amount': water.get('water_amount', ''),
                'time': water.get('water_time', ''),
                'completed': water.get('completed', False),
                'completed_at': water.get('completed_at'),
                'created_at': water.get('created_at'),
                'user_type': water.get('user_type', ''),
                'notes': f"Water - {water.get('water_period', '')}"
            })
        
        return Response({
            'success': True,
            'count': len(transformed_schedule),
            'data': transformed_schedule
        })
        
    except Exception as e:
        print(f"Error in get_water_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_today_schedule(request):
    """Get today's complete care schedule (feed + water)"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get feed schedule
        feed_response = supabase.table('feed_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .order('fd_time', desc=False)\
            .execute()
        
        # Get water schedule
        water_response = supabase.table('water_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .order('water_time', desc=False)\
            .execute()
        
        # Combine and sort by time
        all_tasks = []
        
        for feed in feed_response.data if feed_response.data else []:
            all_tasks.append({
                'id': feed.get('fd_id'),
                'type': 'feed',
                'title': f"{feed.get('fd_meal_type', '')} Feeding",
                'description': f"{feed.get('fd_qty', '')} of {feed.get('fd_food_type', '')}",
                'time': feed.get('fd_time', ''),
                'completed': feed.get('completed', False),
                'completed_at': feed.get('completed_at'),
                'original_data': feed
            })
        
        for water in water_response.data if water_response.data else []:
            all_tasks.append({
                'id': water.get('water_id'),
                'type': 'water',
                'title': f"{water.get('water_period', '')} Water",
                'description': f"{water.get('water_amount', '')} of water",
                'time': water.get('water_time', ''),
                'completed': water.get('completed', False),
                'completed_at': water.get('completed_at'),
                'original_data': water
            })
        
        # Sort by time
        all_tasks.sort(key=lambda x: x['time'])
        
        return Response({
            'success': True,
            'count': len(all_tasks),
            'feed_count': len(feed_response.data) if feed_response.data else 0,
            'water_count': len(water_response.data) if water_response.data else 0,
            'data': all_tasks
        })
        
    except Exception as e:
        print(f"Error in get_today_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def mark_feed_completed(request):
    """Mark a feed task as completed"""
    try:
        feed_id = request.data.get('feed_id')
        kutsero_id = request.data.get('kutsero_id')
        
        if not feed_id or not kutsero_id:
            return Response({
                'success': False,
                'error': 'feed_id and kutsero_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the feed detail record
        response = supabase.table('feed_detail')\
            .update({
                'completed': True,
                'completed_at': datetime.utcnow().isoformat()
            })\
            .eq('fd_id', feed_id)\
            .eq('kutsero_id', kutsero_id)\
            .execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Feed task marked as completed',
                'data': response.data[0]
            })
        else:
            return Response({
                'success': False,
                'error': 'Feed task not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        print(f"Error in mark_feed_completed: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def mark_water_completed(request):
    """Mark a water task as completed"""
    try:
        water_id = request.data.get('water_id')
        kutsero_id = request.data.get('kutsero_id')
        
        if not water_id or not kutsero_id:
            return Response({
                'success': False,
                'error': 'water_id and kutsero_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the water detail record
        response = supabase.table('water_detail')\
            .update({
                'completed': True,
                'completed_at': datetime.utcnow().isoformat()
            })\
            .eq('water_id', water_id)\
            .eq('kutsero_id', kutsero_id)\
            .execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Water task marked as completed',
                'data': response.data[0]
            })
        else:
            return Response({
                'success': False,
                'error': 'Water task not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        print(f"Error in mark_water_completed: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# ------------------------------------------------ PROFILE ------------------------------------------------

@api_view(['GET'])
def available_horses(request):
    """
    Get all horses with their op info, health status, and image URL from Supabase Storage
    """
    op_id = request.GET.get("op_id")
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())

        # Get all horses including horse_status from database
        horses_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, horse_status, op_id"
        ).execute()

        if not horses_response.data:
            return Response({
                'horses': [],
                'total_count': 0,
                'available_count': 0,
                'assigned_count': 0
            }, status=status.HTTP_200_OK)

        # Get all ops
        ops_response = service_client.table("horse_op_profile").select(
            "op_id, op_fname, op_lname"
        ).execute()

        # Get all active assignments (where date_end is null)
        active_assignments_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, kutsero_id, date_start, date_end"
        ).is_("date_end", "null").execute()

        # Create lookup dictionaries
        ops_dict = {op['op_id']: op for op in ops_response.data} if ops_response.data else {}
        assignments_dict = {assign['horse_id']: assign for assign in active_assignments_response.data} if active_assignments_response.data else {}

        horses = []
        for horse in horses_response.data:
            # Generate image URL from Supabase storage
            image_path = horse.get("horse_image")
            if image_path:
                try:
                    image_url = service_client.storage.from_(BUCKET_NAME).get_public_url(image_path)
                    if not image_url:
                        image_url = "https://via.placeholder.com/150?text=No+Image"
                except Exception:
                    image_url = "https://via.placeholder.com/150?text=No+Image"
            else:
                image_url = "https://via.placeholder.com/150?text=No+Image"

            # Get op info
            op_name = "No Op Assigned"
            if horse.get('op_id'):
                op = ops_dict.get(horse['op_id'])
                if op:
                    if op.get('op_fname') and op.get('op_lname'):
                        op_name = f"{op['op_fname']} {op['op_lname']}"
                    elif op.get('op_fname'):
                        op_name = op['op_fname']
                    elif op.get('op_lname'):
                        op_name = op['op_lname']
                    else:
                        op_name = "Unnamed Op"
                else:
                    op_name = "Op Not Found"

            # Get health status directly from database
            # The database stores: 'healthy', 'unhealthy', 'sick', or other values
            db_health_status = horse.get('horse_status', '').strip().lower()
            
            # Map database values to frontend format
            if db_health_status == 'healthy':
                health_status = 'Healthy'
            elif db_health_status in ['unhealthy', 'sick']:
                health_status = 'Sick'
            elif db_health_status == 'deceased':
                health_status = 'Deceased'
            else:
                # Default to Healthy if status is missing or unrecognized
                health_status = 'Healthy'

            # Check assignment status
            assignment = assignments_dict.get(horse['horse_id'])
            if assignment:
                assignment_status = 'assigned'
                status_text = 'Currently assigned'
                current_assignment_id = assignment['assign_id']
                assignment_start = assignment['date_start']
                assignment_end = assignment['date_end']
            else:
                assignment_status = 'available'
                status_text = 'Ready for work'
                current_assignment_id = None
                assignment_start = None
                assignment_end = None

            horses.append({
                'id': horse['horse_id'],
                'name': horse.get('horse_name', 'Unnamed Horse'),
                'breed': horse.get('horse_breed', 'Mixed Breed'),
                'age': horse.get('horse_age', 5),
                'color': horse.get('horse_color', 'Brown'),
                'image': image_url,
                'healthStatus': health_status,  # Using actual database value
                'status': status_text,
                'opName': op_name,
                'operatorName': op_name,  # Added for frontend compatibility
                'ownerName': op_name,  # Added for frontend compatibility
                'assignmentStatus': assignment_status,
                'currentAssignmentId': current_assignment_id,
                'checkedInAt': assignment_start,
                'checkedOutAt': assignment_end,
                'lastCheckup': 'N/A',  # You can add this field to your database if needed
                'nextCheckup': 'N/A',  # You can add this field to your database if needed
            })

        # Calculate statistics based on actual database values
        total_count = len(horses)
        available_count = len([h for h in horses if h['assignmentStatus'] == 'available'])
        assigned_count = len([h for h in horses if h['assignmentStatus'] == 'assigned'])

        return Response({
            'horses': horses,
            'total_count': total_count,
            'available_count': available_count,
            'assigned_count': assigned_count
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching horses for assignment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_kutsero_profile(request, kutsero_id):
    try:
        print(f"[DEBUG] Updating profile for kutsero_id: {kutsero_id}")
        print(f"[DEBUG] Request content type: {request.content_type}")
        print(f"[DEBUG] Request data keys: {list(request.data.keys())}")

        # Define Supabase URLs and headers
        profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile?kutsero_id=eq.{kutsero_id}"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }

        # Get current profile
        current_profile_response = requests.get(profile_url, headers=headers)
        if current_profile_response.status_code != 200:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        current_profiles = current_profile_response.json()
        if not current_profiles:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        current_profile = current_profiles[0]

        # Prepare update data
        update_data = {}
        
        # Map frontend fields to database fields
        field_mapping = {
            'firstName': 'kutsero_fname',
            'middleName': 'kutsero_mname', 
            'lastName': 'kutsero_lname',
            'email': 'kutsero_email',
            'username': 'kutsero_username',
            'phoneNumber': 'kutsero_phone_num',
            'dateOfBirth': 'kutsero_dob',
            'sex': 'kutsero_sex',
            'province': 'kutsero_province',
            'city': 'kutsero_city',
            'municipality': 'kutsero_municipality',
            'barangay': 'kutsero_brgy',
            'zipCode': 'kutsero_zipcode',
        }

        for frontend_field, db_field in field_mapping.items():
            if frontend_field in request.data:
                value = request.data[frontend_field]
                # Skip file objects in field mapping
                if not hasattr(value, 'read'):
                    update_data[db_field] = value

        # Handle profile picture - THIS IS THE KEY PART
        # Frontend sends "profileImage" not "profilePicture"
        profile_picture = request.data.get("profileImage") or request.data.get("profilePicture") or request.FILES.get("profilePicture")
        
        if profile_picture:
            try:
                file_bytes = None
                ext = 'jpg'  # default extension
                
                # Check if it's a file upload (InMemoryUploadedFile or similar)
                if hasattr(profile_picture, 'read'):
                    print(f"[DEBUG] Processing uploaded file: {profile_picture.name}")
                    file_bytes = profile_picture.read()
                    # Get extension from filename
                    if hasattr(profile_picture, 'name') and '.' in profile_picture.name:
                        ext = profile_picture.name.split('.')[-1].lower()
                    elif hasattr(profile_picture, 'content_type'):
                        # Get extension from content type
                        ext = profile_picture.content_type.split('/')[-1]
                    print(f"[DEBUG] File size: {len(file_bytes)} bytes, extension: {ext}")
                
                # Check if it's a base64 string
                elif isinstance(profile_picture, str) and profile_picture.strip():
                    print(f"[DEBUG] Processing base64 string, length: {len(profile_picture)}")
                    
                    # Check if it's already a URL (user didn't change the image)
                    if profile_picture.startswith("http://") or profile_picture.startswith("https://"):
                        print(f"[DEBUG] Image is already a URL, keeping it: {profile_picture}")
                        update_data['kutsero_image'] = profile_picture
                        file_bytes = None  # Don't upload, just keep existing URL
                    elif ";base64," in profile_picture:
                        # Extract format and base64 data
                        format_part, imgstr = profile_picture.split(";base64,", 1)
                        ext = format_part.split("/")[-1]
                        # Decode base64 to bytes
                        file_bytes = base64.b64decode(imgstr)
                        print(f"[DEBUG] Decoded image size: {len(file_bytes)} bytes")
                    else:
                        print(f"[ERROR] Invalid base64 format - missing 'data:image/...;base64,' prefix")
                        # Don't fail the whole request, just skip the image
                        file_bytes = None
                else:
                    print(f"[WARNING] Unrecognized profile picture format: {type(profile_picture)}")
                
                # Upload to Supabase if we have file bytes
                if file_bytes:
                    # Validate file size (5MB limit)
                    if len(file_bytes) > 5 * 1024 * 1024:
                        return Response({
                            "error": "Image too large",
                            "message": "Please upload an image smaller than 5MB"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Delete old image if exists (optional cleanup)
                    old_image = current_profile.get('kutsero_image')
                    if old_image and 'kutsero_op_profile/' in old_image:
                        try:
                            old_file_name = old_image.split('kutsero_op_profile/')[-1]
                            delete_url = f"{SUPABASE_URL}/storage/v1/object/kutsero_op_profile/{old_file_name}"
                            delete_headers = {
                                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                            }
                            requests.delete(delete_url, headers=delete_headers)
                            print(f"[DEBUG] Deleted old image: {old_file_name}")
                        except Exception as del_error:
                            print(f"[WARNING] Could not delete old image: {del_error}")
                    
                    # Generate unique filename
                    timestamp = int(datetime.now().timestamp())
                    file_name = f"profile_{kutsero_id}_{timestamp}.{ext}"
                    
                    # Upload to Supabase Storage bucket "kutsero_op_profile"
                    print(f"[DEBUG] Uploading profile picture to kutsero_op_profile: {file_name}")
                    upload_url = f"{SUPABASE_URL}/storage/v1/object/kutsero_op_profile/{file_name}"
                    upload_headers = {
                        "apikey": SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                        "Content-Type": f"image/{ext}",
                    }
                    
                    upload_response = requests.post(upload_url, data=file_bytes, headers=upload_headers)
                    print(f"[DEBUG] Upload status: {upload_response.status_code}")
                    print(f"[DEBUG] Upload response: {upload_response.text}")
                    
                    if upload_response.status_code in [200, 201]:
                        # Construct FULL public URL for the uploaded image
                        profile_picture_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{file_name}"
                        update_data['kutsero_image'] = profile_picture_url
                        print(f"[DEBUG] Profile picture URL: {profile_picture_url}")
                    else:
                        print(f"[ERROR] Upload failed with status {upload_response.status_code}")
                        # Don't fail the whole request, just skip the image update
                        print(f"[WARNING] Continuing without updating profile picture")
                    
            except Exception as e:
                print(f"[ERROR] Profile picture upload failed: {e}")
                import traceback
                traceback.print_exc()
                # Don't fail the whole request, just skip the image
                print(f"[WARNING] Continuing profile update without image")

        # Only update if there's data to update
        if not update_data:
            return Response({
                "success": True,
                "message": "No changes to update",
                "data": current_profile
            }, status=status.HTTP_200_OK)

        print(f"[DEBUG] Update data to send: {list(update_data.keys())}")

        # Update the profile
        update_response = requests.patch(profile_url, json=update_data, headers=headers)
        
        if update_response.status_code == 204 or update_response.status_code == 200:
            # Fetch updated profile
            updated_profile_response = requests.get(profile_url, headers=headers)
            if updated_profile_response.status_code == 200:
                updated_profiles = updated_profile_response.json()
                if updated_profiles and len(updated_profiles) > 0:
                    updated_profile = updated_profiles[0]
                    
                    # Ensure the image URL is always a full Supabase URL
                    if updated_profile.get('kutsero_image') and not updated_profile['kutsero_image'].startswith('http'):
                        updated_profile['kutsero_image'] = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{updated_profile['kutsero_image']}"
                    
                    return Response({
                        "success": True,
                        "message": "Profile updated successfully",
                        "data": {
                            "firstName": updated_profile.get("kutsero_fname"),
                            "middleName": updated_profile.get("kutsero_mname"),
                            "lastName": updated_profile.get("kutsero_lname"),
                            "email": updated_profile.get("kutsero_email"),
                            "username": updated_profile.get("kutsero_username"),
                            "phoneNumber": updated_profile.get("kutsero_phone_num"),
                            "dateOfBirth": updated_profile.get("kutsero_dob"),
                            "sex": updated_profile.get("kutsero_sex"),
                            "province": updated_profile.get("kutsero_province"),
                            "city": updated_profile.get("kutsero_city"),
                            "municipality": updated_profile.get("kutsero_municipality"),
                            "barangay": updated_profile.get("kutsero_brgy"),
                            "zipCode": updated_profile.get("kutsero_zipcode"),
                            "profileImage": updated_profile.get("kutsero_image"),
                        }
                    }, status=status.HTTP_200_OK)
            
            return Response({
                "success": True,
                "message": "Profile updated but could not fetch updated data",
                "data": {**current_profile, **update_data}
            }, status=status.HTTP_200_OK)
        else:
            print(f"[ERROR] Profile update failed: {update_response.text}")
            return Response({
                "error": "Failed to update profile",
                "details": update_response.text
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print(f"[ERROR] Update profile exception: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": "Internal server error",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
def create_kutsero_profile(request):
    """
    Create new kutsero profile from frontend formData
    """
    try:
        form_data = request.data
        print(f"[DEBUG] Creating kutsero profile with data: {form_data}")
        
        # Basic validation for required fields
        if not form_data.get('firstName', '').strip():
            return Response({
                'success': False,
                'message': 'First name is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if not form_data.get('lastName', '').strip():
            return Response({
                'success': False,
                'message': 'Last name is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if not form_data.get('phoneNumber', '').strip():
            return Response({
                'success': False,
                'message': 'Phone number is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Map frontend formData to database fields
        profile_data = {
            'kutsero_id': form_data.get('kutsero_id'),
            # Personal Info
            'kutsero_fname': form_data.get('firstName', ''),
            'kutsero_mname': form_data.get('middleName', ''),
            'kutsero_lname': form_data.get('lastName', ''),
            'kutsero_dob': form_data.get('dateOfBirth'),
            'kutsero_sex': form_data.get('sex'),
            'kutsero_phone_num': form_data.get('phoneNumber', ''),  # Fixed field name
            'kutsero_province': form_data.get('province'),
            # Location Info
            'kutsero_city': form_data.get('city'),
            'kutsero_municipality': form_data.get('municipality'),
            'kutsero_brgy': form_data.get('barangay'),  # Fixed field name
            'kutsero_zipcode': form_data.get('zipCode'),
            # Account Info
            'kutsero_email': form_data.get('email'),
            'kutsero_fb': form_data.get('facebook'),
            'kutsero_username': form_data.get('username'),
        }
        
        # Remove None values
        profile_data = {k: v for k, v in profile_data.items() if v is not None and v != ''}
        
        # Insert new profile using REST API (consistent with other functions)
        insert_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        print(f"[DEBUG] Inserting profile data: {profile_data}")
        response = requests.post(insert_url, json=profile_data, headers=headers)
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            return Response({
                'success': True,
                'message': 'Profile created successfully',
                'data': response_data[0] if response_data else None
            }, status=status.HTTP_201_CREATED)
        else:
            print(f"[ERROR] Profile creation failed: {response.text}")
            return Response({
                'success': False,
                'message': 'Failed to create profile',
                'details': response.text
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        print(f"[ERROR] Create profile exception: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_kutsero_profiles(request):
    """
    Get all kutsero profiles with filtering
    """
    try:
        # Get query parameters for filtering
        limit = request.GET.get('limit', 50)
        offset = request.GET.get('offset', 0)
        city_filter = request.GET.get('city')
        province_filter = request.GET.get('province')
        
        # Build the URL for REST API
        base_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
        
        # Build query parameters
        params = {
            'select': '*',
            'limit': limit,
            'offset': offset
        }
        
        # Add filters if provided
        if city_filter:
            params['kutsero_city'] = f'eq.{city_filter}'
        if province_filter:
            params['kutsero_province'] = f'eq.{province_filter}'
        
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        }
        
        # Execute the query using REST API
        response = requests.get(base_url, params=params, headers=headers)
        
        if response.status_code != 200:
            return Response({
                'success': False,
                'message': 'Failed to fetch profiles',
                'details': response.text
            }, status=status.HTTP_400_BAD_REQUEST)
        
        profiles_data = response.json()
        
        # Format each profile for frontend
        formatted_profiles = []
        for profile in profiles_data:
            # Ensure image URL is full Supabase URL
            image_url = profile.get('kutsero_image')
            if image_url and not image_url.startswith('http'):
                image_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{image_url}"
            
            formatted_profile = {
                'id': profile.get('id'),
                'kutsero_id': profile.get('kutsero_id'),
                'fullName': f"{profile.get('kutsero_fname', '')} {profile.get('kutsero_lname', '')}".strip(),
                'firstName': profile.get('kutsero_fname', ''),
                'lastName': profile.get('kutsero_lname', ''),
                'phoneNumber': profile.get('kutsero_phone_num', ''),  # Fixed field name
                'email': profile.get('kutsero_email', ''),
                'city': profile.get('kutsero_city', ''),
                'province': profile.get('kutsero_province', ''),
                'image': image_url,
                'created_at': profile.get('created_at')
            }
            formatted_profiles.append(formatted_profile)
        
        return Response({
            'success': True,
            'message': f'Fetched {len(formatted_profiles)} profiles',
            'data': formatted_profiles
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"[ERROR] Get all profiles exception: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def search_kutsero_profiles(request):
    """
    Search kutsero profiles - matches frontend search needs
    """
    try:
        search_term = request.GET.get('q', '').strip()
        search_type = request.GET.get('type', 'name')  # name, city, province, phone
        
        if not search_term:
            return Response({
                'success': False,
                'message': 'Search term is required',
                'data': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build search query based on type
        if search_type == 'name':
            response = supabase.table('kutsero_profile').select('*').or_(
                f'kutsero_fname.ilike.%{search_term}%,kutsero_lname.ilike.%{search_term}%'
            ).execute()
        elif search_type == 'city':
            response = supabase.table('kutsero_profile').select('*').ilike('kutsero_city', f'%{search_term}%').execute()
        elif search_type == 'province':
            response = supabase.table('kutsero_profile').select('*').ilike('kutsero_province', f'%{search_term}%').execute()
        elif search_type == 'phone':
            response = supabase.table('kutsero_profile').select('*').ilike('kutsero_phone', f'%{search_term}%').execute()
        else:
            return Response({
                'success': False,
                'message': 'Invalid search type. Use: name, city, province, or phone',
                'data': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Format results for frontend
        formatted_profiles = []
        for profile in response.data:
            formatted_profile = {
                'id': profile.get('id'),
                'kutsero_id': profile.get('kutsero_id'),
                'fullName': f"{profile.get('kutsero_fname', '')} {profile.get('kutsero_lname', '')}".strip(),
                'firstName': profile.get('kutsero_fname', ''),
                'lastName': profile.get('kutsero_lname', ''),
                'phoneNumber': profile.get('kutsero_phone', ''),
                'email': profile.get('kutsero_email', ''),
                'city': profile.get('kutsero_city', ''),
                'province': profile.get('kutsero_province', ''),
            }
            formatted_profiles.append(formatted_profile)
        
        return Response({
            'success': True,
            'message': f'Found {len(formatted_profiles)} profiles',
            'data': formatted_profiles
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'POST'])
def kutsero_profile(request, kutsero_id):
    """
    Handle kutsero profile - GET to retrieve, PUT/POST to update
    """
    if request.method == 'GET':
        try:
            # Fetch profile using REST API for consistency
            profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile?kutsero_id=eq.{kutsero_id}"
            headers = {
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            }
            
            response = requests.get(profile_url, headers=headers)
            
            if response.status_code == 200:
                profiles = response.json()
                if profiles and len(profiles) > 0:
                    profile_data = profiles[0]
                    
                    # IMPORTANT: Convert relative image paths to full Supabase URLs
                    image_url = profile_data.get('kutsero_image')
                    if image_url:
                        # If it's a relative path, convert to full Supabase URL
                        if not image_url.startswith('http'):
                            # Remove any leading path separators
                            clean_path = image_url.strip('/')
                            # Remove 'kutsero_op_profile/' prefix if present
                            if clean_path.startswith('kutsero_op_profile/'):
                                clean_path = clean_path.replace('kutsero_op_profile/', '', 1)
                            # Construct full URL
                            image_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{clean_path}"
                            print(f"[DEBUG] Converted image path to URL: {image_url}")
                    
                    # Map database fields to frontend format
                    mapped_data = {
                        'city': profile_data.get('kutsero_city', ''),
                        'municipality': profile_data.get('kutsero_municipality', ''),
                        'barangay': profile_data.get('kutsero_brgy', ''),
                        'zipCode': profile_data.get('kutsero_zipcode', ''),
                        'firstName': profile_data.get('kutsero_fname', ''),
                        'middleName': profile_data.get('kutsero_mname', ''),
                        'lastName': profile_data.get('kutsero_lname', ''),
                        'dateOfBirth': profile_data.get('kutsero_dob', ''),
                        'sex': profile_data.get('kutsero_sex', ''),
                        'phoneNumber': profile_data.get('kutsero_phone_num', ''),
                        'province': profile_data.get('kutsero_province', ''),
                        'email': profile_data.get('kutsero_email', ''),
                        'facebook': profile_data.get('kutsero_fb', ''),
                        'username': profile_data.get('kutsero_username', ''),
                        'profileImage': image_url,  # Now always a full URL or None
                    }
                    
                    print(f"[DEBUG] Returning profile with image URL: {image_url}")
                    
                    return Response({
                        'success': True,
                        'message': 'Profile retrieved successfully',
                        'data': mapped_data
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'success': False,
                        'message': 'Profile not found',
                        'data': None
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to fetch profile',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"[ERROR] Error fetching profile: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'message': 'Failed to fetch profile',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method in ['PUT', 'POST']:
        # Use the update_kutsero_profile function instead
        return update_kutsero_profile(request, kutsero_id)
    
    return Response({
        "success": False,
        "message": "Method not allowed"
    }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

# ------------------------------------------------ ANNOUNCEMENT ------------------------------------------------

@api_view(["GET"])
def get_announcements(request):
    """
    Fetch announcements from Supabase with comment counts and multiple images.
    Each announcement includes the first and last name of the user who posted it.
    """
    try:
        logger.info("Fetching announcements...")

        if 'supabase' not in globals():
            logger.error("Supabase client not initialized")
            return Response(
                {"error": "Database connection not available"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Fetch announcements
        announcements_response = supabase.table("announcement") \
            .select("*") \
            .order("announce_date", desc=True) \
            .execute()

        logger.info(f"Found {len(announcements_response.data) if announcements_response.data else 0} announcements")

        if not announcements_response.data:
            return Response({"announcements": []}, status=status.HTTP_200_OK)

        announcements_with_counts = []
        SUPABASE_BASE_URL = "https://drgknejiqupegkyxfaab.supabase.co"
        BUCKET_NAME = "announcement-img"

        # Create service client
        service_client = create_client(SUPABASE_BASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        for announcement in announcements_response.data:
            announce_id = announcement.get("announce_id")
            if not announce_id:
                continue

            # 🔹 Get comment count
            comment_count = 0
            try:
                comment_count_response = supabase.table("comment") \
                    .select("id", count="exact") \
                    .eq("announcement_id", announce_id) \
                    .execute()
                comment_count = comment_count_response.count or 0
            except Exception as comment_error:
                logger.warning(f"Error getting comment count for {announce_id}: {comment_error}")

            # 🔹 Get user info (fetch actual first and last name)
            user_info = None
            user_name = "Unknown User"

            user_id = (
                announcement.get("user_id")
                or announcement.get("created_by")
                or announcement.get("author_id")
                or announcement.get("ctu_id")
                or announcement.get("dvmf_id")
            )

            if user_id:
                try:
                    # Try CTU user first
                    user_response = service_client.table("ctu_vet_profile") \
                        .select("ctu_fname, ctu_lname") \
                        .eq("ctu_id", user_id) \
                        .execute()

                    if user_response.data and len(user_response.data) > 0:
                        user_info = user_response.data[0]
                        fname = user_info.get("ctu_fname", "").strip()
                        lname = user_info.get("ctu_lname", "").strip()
                        user_name = f"{fname} {lname}".strip() if (fname or lname) else "Unknown User"
                        logger.info(f"CTU user found: {user_name}")
                    else:
                        # Try DVMF user next
                        user_response = service_client.table("dvmf_user_profile") \
                            .select("dvmf_fname, dvmf_lname") \
                            .eq("dvmf_id", user_id) \
                            .execute()

                        if user_response.data and len(user_response.data) > 0:
                            user_info = user_response.data[0]
                            fname = user_info.get("dvmf_fname", "").strip()
                            lname = user_info.get("dvmf_lname", "").strip()
                            user_name = f"{fname} {lname}".strip() if (fname or lname) else "Unknown User"
                            logger.info(f"DVMF user found: {user_name}")
                        else:
                            logger.warning(f"User not found in either table for ID {user_id}")
                except Exception as user_error:
                    logger.error(f"Error fetching user info: {user_error}")

            # 🔹 Handle multiple image URLs
            image_urls = []
            announce_img = announcement.get("announce_img")

            if announce_img:
                try:
                    import json
                    if isinstance(announce_img, str) and announce_img.startswith('['):
                        img_array = json.loads(announce_img)
                        for img in img_array:
                            if isinstance(img, str):
                                if img.startswith('http'):
                                    image_urls.append(img)
                                elif img.strip():
                                    image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{img.strip()}")
                    elif isinstance(announce_img, str) and announce_img.startswith('http'):
                        image_urls.append(announce_img)
                    elif isinstance(announce_img, str) and ',' in announce_img:
                        filenames = [f.strip() for f in announce_img.split(',') if f.strip()]
                        for f in filenames:
                            if f.startswith('http'):
                                image_urls.append(f)
                            else:
                                image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{f}")
                    elif isinstance(announce_img, str) and announce_img.strip():
                        image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{announce_img.strip()}")
                except Exception as img_error:
                    logger.warning(f"Error parsing images for {announce_id}: {img_error}")

            # 🔹 Combine all info into one response object
            announcement_data = {
                "id": str(announce_id),
                "announce_id": announce_id,
                "announce_title": announcement.get("announce_title", "Untitled"),
                "announce_content": announcement.get("announce_content", ""),
                "announce_date": announcement.get("announce_date", ""),
                "announce_status": announcement.get("announce_status", "active"),
                "created_at": announcement.get("created_at", ""),
                "comment_count": comment_count,
                "user_name": user_name,  # ✅ First + Last name only
                "user_info": user_info,
                "image_url": image_urls or None
            }

            announcements_with_counts.append(announcement_data)

        logger.info(f"Returning {len(announcements_with_counts)} announcements")
        return Response(
            {"announcements": announcements_with_counts},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in get_announcements: {e}")
        logger.error(traceback.format_exc())
        return Response(
            {"error": "Internal server error occurred while fetching announcements"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    
def fetch_user_details(service_client, user_id, logger):
    """
    Fetch user details from multiple tables in priority order:
    1. horse_op_profile (horse operators)
    2. kutsero_profile
    3. ctu_vet_profile
    4. dvmf_user_profile
    5. users
    6. auth.users (fallback)
    Returns a dict with fname, lname, username, and email (if available)
    """
    try:
        if not user_id:
            return {
                "fname": "Anonymous",
                "lname": "User",
                "username": "Anonymous User",
                "email": None,
            }

        logger.info(f"[DEBUG] Fetching user details for user_id: {user_id}")

        # ------------------- 1️⃣ Horse Operator -------------------
        try:
            logger.info(f"[DEBUG] Checking horse_op_profile for op_id: {user_id}")
            operator_response = service_client.table("horse_op_profile") \
                .select("*") \
                .eq("op_id", user_id) \
                .execute()

            if operator_response.data and len(operator_response.data) > 0:
                operator_data = operator_response.data[0]
                fname = operator_data.get("op_fname", "Unknown")
                lname = operator_data.get("op_lname", "Operator")
                username = f"{fname} {lname}".strip()
                logger.info(f"[DEBUG] Found in horse_op_profile: {username}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking horse_op_profile: {e}")

        # ------------------- 2️⃣ Kutsero -------------------
        try:
            logger.info(f"[DEBUG] Checking kutsero_profile for kutsero_id: {user_id}")
            profile_response = service_client.table("kutsero_profile") \
                .select("*") \
                .eq("kutsero_id", user_id) \
                .execute()

            if profile_response.data and len(profile_response.data) > 0:
                profile_data = profile_response.data[0]
                fname = profile_data.get("kutsero_fname", "Unknown")
                lname = profile_data.get("kutsero_lname", "User")
                username = profile_data.get("kutsero_username") or f"{fname} {lname}".strip()
                logger.info(f"[DEBUG] Found in kutsero_profile: {username}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking kutsero_profile: {e}")

        # ------------------- 3️⃣ CTU Vet -------------------
        try:
            logger.info(f"[DEBUG] Checking ctu_vet_profile for ctu_id: {user_id}")
            ctu_response = service_client.table("ctu_vet_profile") \
                .select("*") \
                .eq("ctu_id", user_id) \
                .execute()

            if ctu_response.data and len(ctu_response.data) > 0:
                ctu_data = ctu_response.data[0]
                fname = ctu_data.get("ctu_fname", "CTU")
                lname = ctu_data.get("ctu_lname", "User")
                username = ctu_data.get("ctu_username") or f"{fname} {lname}".strip()
                logger.info(f"[DEBUG] Found in ctu_vet_profile: {username}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking ctu_vet_profile: {e}")

        # ------------------- 4️⃣ DVMF -------------------
        try:
            logger.info(f"[DEBUG] Checking dvmf_user_profile for dvmf_id: {user_id}")
            dvmf_response = service_client.table("dvmf_user_profile") \
                .select("*") \
                .eq("dvmf_id", user_id) \
                .execute()

            if dvmf_response.data and len(dvmf_response.data) > 0:
                dvmf_data = dvmf_response.data[0]
                fname = dvmf_data.get("dvmf_fname", "DVMF")
                lname = dvmf_data.get("dvmf_lname", "User")
                username = dvmf_data.get("dvmf_username") or f"{fname} {lname}".strip()
                logger.info(f"[DEBUG] Found in dvmf_user_profile: {username}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking dvmf_user_profile: {e}")

        # ------------------- 5️⃣ Users table -------------------
        try:
            logger.info(f"[DEBUG] Checking users table for id: {user_id}")
            user_response = service_client.table("users") \
                .select("*") \
                .eq("id", user_id) \
                .execute()

            if user_response.data and len(user_response.data) > 0:
                user_data = user_response.data[0]
                fname = user_data.get("first_name") or user_data.get("fname") or "User"
                lname = user_data.get("last_name") or user_data.get("lname") or ""
                username = user_data.get("username") or f"{fname} {lname}".strip() if lname else fname
                logger.info(f"[DEBUG] Found in users table: {username}")
                return {
                    "fname": fname,
                    "lname": lname if lname else "User",
                    "username": username,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking users table: {e}")

        # ------------------- 6️⃣ Auth users -------------------
        try:
            logger.info(f"[DEBUG] Checking auth.users for id: {user_id}")
            auth_response = service_client.table("auth.users") \
                .select("*") \
                .eq("id", user_id) \
                .execute()

            if auth_response.data and len(auth_response.data) > 0:
                auth_data = auth_response.data[0]
                email = auth_data.get("email", "")
                email_username = email.split("@")[0] if email else f"User {str(user_id)[:8]}"
                logger.info(f"[DEBUG] Found in auth.users: {email_username}")
                return {
                    "fname": email_username,
                    "lname": "User",
                    "username": email_username,
                    "email": email,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking auth.users: {e}")

        # ------------------- Not found in any table -------------------
        logger.warning(f"[WARN] User {user_id} not found in any profile table, returning defaults")
        return {
            "fname": "Unknown",
            "lname": "User",
            "username": "Unknown User",
            "email": None,
        }

    except Exception as e:
        logger.error(f"[ERROR] Exception in fetch_user_details: {e}")
        return {
            "fname": "Unknown",
            "lname": "User",
            "username": "Unknown User",
            "email": None,
        }


@api_view(["GET", "POST"])
def announcement_comments_handler(request, announcement_id):
    """
    Handle both GET and POST requests for announcement comments
    """
    try:
        logger.info(f"[DEBUG] {request.method} request for announcement ID: {announcement_id}")
        
        # Validate announcement_id
        if not announcement_id or str(announcement_id).strip() == "" or str(announcement_id) == "undefined":
            logger.error(f"[ERROR] Invalid announcement ID: {announcement_id}")
            return Response({"error": "Invalid announcement ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create service client to bypass RLS policies
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if announcement exists (using announce_id)
        try:
            announcement_response = service_client.table("announcement") \
                .select("announce_id") \
                .eq("announce_id", announcement_id) \
                .execute()
        except Exception as db_error:
            logger.error(f"[ERROR] Failed to check announcement existence: {db_error}")
            return Response({"error": "Database query failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        if not announcement_response.data:
            logger.warning(f"[WARN] Announcement not found: {announcement_id}")
            return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == "GET":
            # Handle GET request inline
            try:
                logger.info(f"[DEBUG] Fetching comments for announcement: {announcement_id}")
                
                # Fetch comments with error handling
                try:
                    comments_response = service_client.table("comment") \
                        .select("*") \
                        .eq("announcement_id", announcement_id) \
                        .is_("parent_comment_id", "null") \
                        .order("comment_date", desc=True) \
                        .execute()
                except Exception as db_error:
                    logger.error(f"[ERROR] Failed to fetch comments: {db_error}")
                    return Response({"error": "Failed to fetch comments from database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                logger.info(f"[DEBUG] Found {len(comments_response.data) if comments_response.data else 0} comments")

                formatted_comments = []
                if comments_response.data:
                    for comment in comments_response.data:
                        try:
                            comment_id = str(comment.get("id", ""))
                            
                            formatted_comment = {
                                "id": comment_id,
                                "comment_text": comment.get("comment_text", ""),
                                "comment_date": comment.get("comment_date", ""),
                                "user_id": comment.get("user_id", ""),
                                "announcement_id": comment.get("announcement_id", ""),
                                "parent_comment_id": comment.get("parent_comment_id"),
                            }
                            
                            # Fetch reply count for this comment
                            try:
                                reply_count_response = service_client.table("comment") \
                                    .select("id", count="exact") \
                                    .eq("parent_comment_id", comment_id) \
                                    .execute()
                                formatted_comment["reply_count"] = reply_count_response.count or 0
                            except Exception as e:
                                logger.warning(f"[WARN] Failed to get reply count: {e}")
                                formatted_comment["reply_count"] = 0
                            
                            # Fetch user details using the helper function
                            user_details = fetch_user_details(service_client, comment.get("user_id"), logger)
                            formatted_comment.update({
                                "kutsero_fname": user_details["fname"],
                                "kutsero_lname": user_details["lname"],
                                "kutsero_username": user_details["username"],
                                "user_email": user_details["email"],
                            })
                            
                            formatted_comments.append(formatted_comment)
                            
                        except Exception as comment_error:
                            logger.warning(f"[WARN] Error processing comment: {comment_error}")
                            continue
                
                return Response({"comments": formatted_comments}, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"[ERROR] Error in GET comments: {e}")
                logger.error(traceback.format_exc())
                return Response({"error": "Failed to fetch comments"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        elif request.method == "POST":
            return handle_post_comment(request, announcement_id, service_client)
            
    except Exception as e:
        logger.error(f"[ERROR] Error in announcement_comments_handler: {e}")
        logger.error(traceback.format_exc())
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
def handle_post_comment(request, announcement_id, service_client):
    """
    Handle POST request for creating a new comment or reply
    """
    try:
        logger.info(f"[DEBUG] Posting comment to announcement: {announcement_id}")
        logger.info(f"[DEBUG] Raw request data: {request.data}")
        
        # Get and validate request data
        comment_text = request.data.get("comment_text", "").strip() if request.data else ""
        user_id = request.data.get("user_id") if request.data else None
        parent_comment_id = request.data.get("parent_comment_id") if request.data else None
        
        # Also check for kutsero_id in case frontend is still sending old field name
        if not user_id:
            user_id = request.data.get("kutsero_id") if request.data else None
            if user_id:
                logger.info(f"[DEBUG] Found kutsero_id instead of user_id: {user_id}")

        logger.info(f"[DEBUG] Comment data: text='{comment_text[:50] if comment_text else ''}...', user_id={user_id}, parent_comment_id={parent_comment_id}")

        # Validation
        if not comment_text:
            logger.error("[ERROR] Comment text is missing or empty")
            return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(comment_text) > 500:
            logger.error(f"[ERROR] Comment text too long: {len(comment_text)} characters")
            return Response({"error": "Comment is too long (max 500 characters)"}, status=status.HTTP_400_BAD_REQUEST)

        if not user_id:
            logger.error("[ERROR] User ID is missing")
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # If parent_comment_id is provided, verify it exists
        if parent_comment_id:
            try:
                parent_check = service_client.table("comment") \
                    .select("id") \
                    .eq("id", parent_comment_id) \
                    .execute()
                
                if not parent_check.data:
                    logger.error(f"[ERROR] Parent comment not found: {parent_comment_id}")
                    return Response({"error": "Parent comment not found"}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                logger.error(f"[ERROR] Failed to verify parent comment: {e}")

        # Insert comment with error handling
        comment_data = {
            "comment_text": comment_text,
            "user_id": str(user_id),
            "announcement_id": str(announcement_id),
            "comment_date": datetime.now().isoformat(),
            "parent_comment_id": str(parent_comment_id) if parent_comment_id else None
        }

        logger.info(f"[DEBUG] Inserting comment data: {comment_data}")

        try:
            response = service_client.table("comment").insert(comment_data).execute()
        except Exception as db_error:
            logger.error(f"[ERROR] Failed to insert comment: {db_error}")
            return Response({"error": "Failed to save comment to database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if response.data and len(response.data) > 0:
            comment = response.data[0]
            
            # Format the newly created comment
            formatted_comment = {
                "id": str(comment.get("id", "")),
                "comment_text": comment.get("comment_text", ""),
                "comment_date": comment.get("comment_date", ""),
                "user_id": comment.get("user_id", ""),
                "announcement_id": comment.get("announcement_id", ""),
                "parent_comment_id": comment.get("parent_comment_id"),
                "reply_count": 0,
            }
            
            # Fetch user details using the helper function
            user_details = fetch_user_details(service_client, comment.get("user_id"), logger)
            formatted_comment.update({
                "kutsero_fname": user_details["fname"],
                "kutsero_lname": user_details["lname"],
                "kutsero_username": user_details["username"],
                "user_email": user_details["email"],
            })

            logger.info(f"[DEBUG] Comment posted successfully by {user_details['username']}: {comment.get('id')}")

            return Response({
                "message": "Comment posted successfully",
                "comment": formatted_comment
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error("[ERROR] No data returned from comment insertion")
            return Response({"error": "Failed to post comment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"[ERROR] Error in handle_post_comment: {e}")
        logger.error(traceback.format_exc())
        return Response({"error": "Failed to post comment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
# Legacy function for backward compatibility
@api_view(["GET"])
def get_announcement_comments(request, announcement_id):
    """
    Legacy function - redirects to the main handler
    """
    return announcement_comments_handler(request, announcement_id)

def post_announcement_comment(request, announcement_id):
    """
    Legacy function - redirects to the main handler
    """
    return announcement_comments_handler(request, announcement_id)

@api_view(["GET"])
def get_comment_replies(request, comment_id):
    """
    Get all replies for a specific comment
    """
    try:
        logger.info(f"[DEBUG] Fetching replies for comment ID: {comment_id}")
        
        if not comment_id:
            return Response({"error": "Invalid comment ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if supabase client is available
        if 'supabase' not in globals():
            logger.error("[ERROR] Supabase client not initialized")
            return Response({"error": "Database connection not available"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Fetch replies
        try:
            replies_response = supabase.table("comment") \
                .select("*") \
                .eq("parent_comment_id", comment_id) \
                .order("comment_date", desc=False) \
                .execute()
            
            logger.info(f"[DEBUG] Found {len(replies_response.data) if replies_response.data else 0} replies")
        except Exception as db_error:
            logger.error(f"[ERROR] Failed to fetch replies: {db_error}")
            return Response({"error": "Failed to fetch replies"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        formatted_replies = []
        if replies_response.data:
            for reply in replies_response.data:
                try:
                    formatted_reply = {
                        "id": str(reply.get("id", "")),
                        "comment_text": reply.get("comment_text", ""),
                        "comment_date": reply.get("comment_date", ""),
                        "user_id": reply.get("user_id", ""),
                        "announcement_id": reply.get("announcement_id", ""),
                        "parent_comment_id": reply.get("parent_comment_id", ""),
                    }
                    
                    # Fetch user details using the helper function
                    user_details = fetch_user_details(supabase, reply.get("user_id"), logger)
                    formatted_reply.update({
                        "kutsero_fname": user_details["fname"],
                        "kutsero_lname": user_details["lname"],
                        "kutsero_username": user_details["username"],
                        "user_email": user_details["email"],
                    })
                    
                    formatted_replies.append(formatted_reply)
                except Exception as e:
                    logger.warning(f"[WARN] Error processing reply: {e}")
                    continue
        
        logger.info(f"[DEBUG] Returning {len(formatted_replies)} formatted replies")
        return Response({"replies": formatted_replies}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"[ERROR] Error in get_comment_replies: {e}")
        logger.error(traceback.format_exc())
        return Response({"error": "Failed to fetch replies"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ------------------------------------------------ CALENDAR ------------------------------------------------

@api_view(['GET'])
def get_calendar_events(request):
    """
    Retrieves all events from the calendar_events table in Supabase.
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Query Supabase table
        response = service_client.table("calendar_events").select("*").order("date", desc=False).order("time", desc=False).execute()
        
        # Format the events data
        events = []
        for event in response.data:
            events.append({
                'id': event['id'],
                'title_event': event['title_event'],
                'date': str(event['date']),  # Ensure date is string
                'time': str(event['time']),  # Ensure time is string
            })
        
        return JsonResponse({'success': True, 'events': events})

    except Exception as e:
        print(f"Error fetching events from Supabase: {e}")
        return JsonResponse({'success': False, 'message': 'Failed to retrieve events'}, status=500)


@api_view(['POST'])
def create_calendar_event(request):
    """
    Creates a new calendar event in Supabase.
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get data from request
        title = request.data.get('title_event')
        date = request.data.get('date')
        time = request.data.get('time')

        if not all([title, date, time]):
            return Response({"error": "Missing event data."}, status=status.HTTP_400_BAD_REQUEST)

        # If your id column is an integer, get the max id and increment
        # Option A: For integer IDs
        max_id_response = service_client.table("calendar_events").select("id").order("id", desc=True).limit(1).execute()
        new_id = 1 if not max_id_response.data else max_id_response.data[0]['id'] + 1
        
        event_data = {
            'id': new_id,  # Add the ID here
            'title_event': title,
            'date': date,
            'time': time
        }

        # Option B: For UUID IDs (uncomment if using UUID)
        # import uuid
        # event_data = {
        #     'id': str(uuid.uuid4()),  # Generate UUID
        #     'title_event': title,
        #     'date': date,
        #     'time': time
        # }

        response = service_client.table("calendar_events").insert(event_data).execute()

        return Response({"message": "Event created successfully", "data": response.data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error creating event in Supabase: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_calendar_event(request, event_id):
    """
    Deletes a calendar event from Supabase.
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        print(f"Attempting to delete event with ID: {event_id}")  # Debug log
        
        # Delete the event by ID
        response = service_client.table("calendar_events").delete().eq("id", event_id).execute()
        
        print(f"Delete response: {response.data}")  # Debug log
        
        # Check if any rows were deleted
        if response.data and len(response.data) > 0:
            return Response({"message": "Event deleted successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Event not found or already deleted"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        print(f"Error deleting event from Supabase: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# ------------------------------------------------ SOS ------------------------------------------------

@api_view(['POST'])
def create_sos_request(request):
    """
    Create a new SOS request with optional image uploads
    Stores first image URL in sos_requests.sos_image field
    Auto-fills contact number and name from kutsero profile
    """
    try:
        # Get all required fields
        user_id = request.data.get("user_id")
        user_name = request.data.get("user_name")
        kutsero_profile_id = request.data.get("kutsero_profile")
        contact_number = request.data.get("contact_number") or request.data.get("contact_num")
        additional_info = request.data.get("additional_info")
        emergency_type = request.data.get("emergency_type")
        horse_status = request.data.get("horse_status")
        description = request.data.get("description")
        location_text = request.data.get("location_text")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        images = request.data.get("images", []) or request.data.get("sos_images", [])

        print(f"[DEBUG] Received request data keys: {request.data.keys()}")
        print(f"[DEBUG] Number of images: {len(images) if images else 0}")
        print(f"[DEBUG] Kutsero Profile ID: {kutsero_profile_id}")

        # Fetch kutsero profile data if kutsero_profile_id is provided
        if kutsero_profile_id:
            try:
                # Validate UUID format
                uuid.UUID(kutsero_profile_id)
                
                # Fetch kutsero profile from database
                profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
                profile_headers = {
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                }
                profile_params = {"id": f"eq.{kutsero_profile_id}", "select": "kutsero_fname,kutsero_lname,kutsero_phone_num"}
                
                profile_response = requests.get(profile_url, headers=profile_headers, params=profile_params)
                
                if profile_response.status_code == 200:
                    profile_data = profile_response.json()
                    if profile_data and len(profile_data) > 0:
                        profile = profile_data[0]
                        
                        # Auto-fill contact number if not provided
                        if not contact_number and profile.get("kutsero_phone_num"):
                            contact_number = profile.get("kutsero_phone_num")
                            print(f"[DEBUG] Auto-filled contact_number from profile: {contact_number}")
                        
                        # Auto-fill user name if not provided
                        if not user_name:
                            fname = profile.get("kutsero_fname", "")
                            lname = profile.get("kutsero_lname", "")
                            user_name = f"{fname} {lname}".strip()
                            print(f"[DEBUG] Auto-filled user_name from profile: {user_name}")
                    else:
                        print(f"[WARNING] No profile found for kutsero_profile_id: {kutsero_profile_id}")
                else:
                    print(f"[WARNING] Failed to fetch profile: {profile_response.status_code}")
                    
            except (ValueError, AttributeError) as e:
                print(f"[WARNING] Invalid UUID format for kutsero_profile_id: {kutsero_profile_id}, error: {e}")

        # Validate required fields
        if not contact_number:
            return Response({"error": "contact_number is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Upload images first if provided
        uploaded_images = []
        first_image_url = None

        if images and len(images) > 0:
            print(f"[DEBUG] Processing {len(images)} images")
            
            for idx, image_data in enumerate(images):
                try:
                    image_base64 = image_data
                    
                    # Handle base64 string
                    if isinstance(image_base64, str):
                        if ";base64," in image_base64:
                            # Extract format and base64 data
                            format_part, imgstr = image_base64.split(";base64,")
                            ext = format_part.split("/")[-1] if "/" in format_part else "jpg"
                        else:
                            imgstr = image_base64
                            ext = "jpg"
                    else:
                        continue
                    
                    # Decode base64 to bytes
                    file_bytes = base64.b64decode(imgstr)
                    print(f"[DEBUG] Decoded image {idx + 1}, size: {len(file_bytes)} bytes")
                    
                    # Generate unique filename
                    timestamp = int(datetime.now().timestamp() * 1000)
                    file_name = f"sos_{timestamp}_{uuid.uuid4().hex[:8]}_{idx}.{ext}"
                    
                    # Upload to Supabase Storage using REST API
                    print(f"[DEBUG] Uploading to bucket 'sos_image' with filename: {file_name}")
                    upload_url = f"{SUPABASE_URL}/storage/v1/object/sos_image/{file_name}"
                    upload_headers = {
                        "apikey": SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                        "Content-Type": f"image/{ext}",
                    }
                    
                    upload_response = requests.post(upload_url, data=file_bytes, headers=upload_headers)
                    print(f"[DEBUG] Upload status: {upload_response.status_code}")
                    print(f"[DEBUG] Upload response: {upload_response.text}")
                    
                    if upload_response.status_code in [200, 201]:
                        # Construct public URL
                        public_url = f"{SUPABASE_URL}/storage/v1/object/public/sos_image/{file_name}"
                        print(f"[DEBUG] Image URL: {public_url}")
                        
                        uploaded_images.append({
                            "file_name": file_name,
                            "url": public_url
                        })
                        
                        # Store the first image URL
                        if idx == 0:
                            first_image_url = public_url
                        
                        print(f"[SUCCESS] Successfully uploaded image {idx + 1}: {file_name}")
                    else:
                        print(f"[ERROR] Upload failed with status {upload_response.status_code}")
                    
                except Exception as img_error:
                    print(f"[ERROR] Error uploading image {idx + 1}: {str(img_error)}")
                    import traceback
                    print(f"[TRACEBACK] {traceback.format_exc()}")
                    continue

        # Build the insert data based on your table structure
        insert_data = {
            "contact_number": contact_number,
            "status": "pending",
        }
        
        # Add the first image URL to sos_image column
        if first_image_url:
            insert_data["sos_image"] = first_image_url
        
        # Add optional fields if provided
        if additional_info:
            insert_data["additional_info"] = additional_info
        if emergency_type:
            insert_data["emergency_type"] = emergency_type
        if horse_status:
            insert_data["horse_status"] = horse_status
        if description:
            insert_data["description"] = description
        if location_text:
            insert_data["location_text"] = location_text
        if latitude:
            insert_data["latitude"] = float(latitude)
        if longitude:
            insert_data["longitude"] = float(longitude)
        
        # Only add user_id if it's a valid UUID
        if user_id:
            try:
                # Validate UUID format
                uuid.UUID(user_id)
                insert_data["user_id"] = user_id
                print(f"[DEBUG] Valid user_id added: {user_id}")
            except (ValueError, AttributeError):
                print(f"[WARNING] Invalid UUID format for user_id: {user_id}, skipping")
        
        if user_name:
            insert_data["user_name"] = user_name
            print(f"[DEBUG] User name added: {user_name}")

        # Note: We're NOT storing kutsero_profile_id because it's a separate table
        # The contact_number and user_name are already stored, which is sufficient
        print(f"[DEBUG] Not storing kutsero_profile_id - using contact_number and user_name instead")

        # Insert into sos_requests table using REST API
        print(f"[DEBUG] Creating SOS request with data: {insert_data}")
        insert_url = f"{SUPABASE_URL}/rest/v1/sos_requests"
        insert_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        sos_response = requests.post(insert_url, json=insert_data, headers=insert_headers)
        sos_json = sos_response.json()
        print(f"[DEBUG] SOS insert status: {sos_response.status_code}")
        print(f"[DEBUG] SOS insert response: {sos_json}")

        if sos_response.status_code not in [200, 201]:
            print(f"[ERROR] Failed to create SOS request")
            
            # Cleanup uploaded images if SOS request creation fails
            if uploaded_images:
                for img in uploaded_images:
                    try:
                        file_name = img["file_name"]
                        delete_url = f"{SUPABASE_URL}/storage/v1/object/sos_image/{file_name}"
                        delete_headers = {
                            "apikey": SUPABASE_SERVICE_ROLE_KEY,
                            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                        }
                        requests.delete(delete_url, headers=delete_headers)
                        print(f"[DEBUG] Cleaned up uploaded image: {file_name}")
                    except Exception as e:
                        print(f"[ERROR] Failed to cleanup image: {e}")
            
            return Response(
                {"error": "Failed to create SOS request", "details": sos_json},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        sos_request_id = sos_json[0].get('id') if isinstance(sos_json, list) else sos_json.get('id')
        print(f"[SUCCESS] Created SOS request with ID: {sos_request_id}")

        return Response({
            "message": "SOS request created successfully",
            "data": sos_json[0] if isinstance(sos_json, list) else sos_json,
            "images_uploaded": len(uploaded_images),
            "images": uploaded_images
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"[ERROR] Error creating SOS request: {e}")
        import traceback
        print(f"[TRACEBACK] {traceback.format_exc()}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def list_sos_requests(request):
    """
    Get all SOS requests with their associated images (latest first)
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get all SOS requests
        sos_response = service_client.table("sos_requests")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()

        sos_requests = sos_response.data

        # For each SOS request, fetch associated images
        for sos_request in sos_requests:
            sos_id = sos_request.get('id')
            
            # Get images for this SOS request
            images_response = service_client.table("sos_image")\
                .select("*")\
                .eq("sos_request_id", sos_id)\
                .order("uploaded_at", desc=False)\
                .execute()
            
            sos_request['images'] = images_response.data

        return Response({
            "sos_requests": sos_requests
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching SOS requests: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_sos_request_detail(request, sos_id):
    """
    Get a single SOS request with all its images
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get the SOS request
        sos_response = service_client.table("sos_requests")\
            .select("*")\
            .eq("id", sos_id)\
            .execute()

        if not sos_response.data or len(sos_response.data) == 0:
            return Response(
                {"error": "SOS request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        sos_request = sos_response.data[0]

        # Get images for this SOS request
        images_response = service_client.table("sos_image")\
            .select("*")\
            .eq("sos_request_id", sos_id)\
            .order("uploaded_at", desc=False)\
            .execute()

        sos_request['images'] = images_response.data

        return Response({
            "sos_request": sos_request
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching SOS request detail: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
def delete_sos_image(request, image_id):
    """
    Delete a specific SOS image
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get the image record to get the file name
        image_response = service_client.table("sos_image")\
            .select("*")\
            .eq("id", image_id)\
            .execute()

        if not image_response.data or len(image_response.data) == 0:
            return Response(
                {"error": "Image not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        image_record = image_response.data[0]
        file_name = image_record.get('file_name')

        # Delete from storage
        service_client.storage.from_("sos_image").remove([file_name])

        # Delete from database
        service_client.table("sos_image").delete().eq("id", image_id).execute()

        return Response({
            "message": "Image deleted successfully"
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error deleting SOS image: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
def update_sos_status(request, sos_id):
    """
    Update SOS request status (e.g., pending, in_progress, resolved)
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        new_status = request.data.get("status")
        
        if not new_status:
            return Response(
                {"error": "status is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the status
        response = service_client.table("sos_requests")\
            .update({"status": new_status})\
            .eq("id", sos_id)\
            .execute()

        if not response.data or len(response.data) == 0:
            return Response(
                {"error": "SOS request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Status updated successfully",
            "data": response.data[0]
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error updating SOS status: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def debug_urls(request):
    """
    Returns a list of all registered URL patterns for debugging.
    """
    resolver = get_resolver()
    all_urls = []

    for pattern in resolver.url_patterns:
        all_urls.append(str(pattern.pattern))

    return JsonResponse({"urls": all_urls})

# ------------------------------------------------ USERS ------------------------------------------------

@api_view(['GET'])
def get_all_users(request):
    """
    Get all users from all user types (kutsero, vet, horse_operator, ctu_vet, dvmf_user)
    Returns a unified list with consistent structure
    """
    try:
        user_id = request.GET.get("user_id")
        search_query = request.GET.get("query", "").lower()
        role_filter = request.GET.get("role")
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        users = []

        # Kutseros
        if role_filter in [None, "kutsero"]:
            try:
                if user_id:
                    kutsero_profiles = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email, users!inner(status)"
                    ).neq("kutsero_id", user_id).execute()
                else:
                    kutsero_profiles = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email, users!inner(status)"
                    ).execute()
                
                for p in kutsero_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('kutsero_fname') or p.get('kutsero_username') or 'Unknown'
                    if p.get('kutsero_lname'):
                        display_name += f" {p['kutsero_lname']}"
                    
                    if search_query and search_query not in display_name.lower() and search_query not in (p.get('kutsero_email') or '').lower():
                        continue
                    
                    users.append({
                        'id': p['kutsero_id'],
                        'name': display_name,
                        'role': 'Kutsero',
                        'user_type': 'kutsero',
                        'user_status': p.get('users', {}).get('status', 'active'),
                        'avatar': '🐴',
                        'email': p.get('kutsero_email'),
                        'phone': p.get('kutsero_phone_num'),
                        'status': p.get('users', {}).get('status', 'active')
                    })
            except Exception as e:
                print(f"Error fetching kutseros: {e}")

        # Vets
        if role_filter in [None, "vet"]:
            try:
                if user_id:
                    vet_profiles = service_client.table("vet_profile").select(
                        "vet_id, vet_fname, vet_lname, vet_phone_num, vet_email, users!inner(status)"
                    ).neq("vet_id", user_id).execute()
                else:
                    vet_profiles = service_client.table("vet_profile").select(
                        "vet_id, vet_fname, vet_lname, vet_phone_num, vet_email, users!inner(status)"
                    ).execute()
                
                for p in vet_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = f"Dr. {p.get('vet_fname', '')}"
                    if p.get('vet_lname'):
                        display_name += f" {p['vet_lname']}"
                    
                    if search_query and search_query not in display_name.lower() and search_query not in (p.get('vet_email') or '').lower():
                        continue
                    
                    users.append({
                        'id': p['vet_id'],
                        'name': display_name,
                        'role': 'Veterinarian',
                        'user_type': 'vet',
                        'user_status': p.get('users', {}).get('status', 'active'),
                        'avatar': '👩‍⚕️',
                        'email': p.get('vet_email'),
                        'phone': p.get('vet_phone_num'),
                        'status': p.get('users', {}).get('status', 'active')
                    })
            except Exception as e:
                print(f"Error fetching vets: {e}")

        # Horse Operators
        if role_filter in [None, "horse_operator"]:
            try:
                if user_id:
                    op_profiles = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_lname, op_phone_num, op_email, users!inner(status)"
                    ).neq("op_id", user_id).execute()
                else:
                    op_profiles = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_lname, op_phone_num, op_email, users!inner(status)"
                    ).execute()
                
                for p in op_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('op_fname', 'Unknown')
                    if p.get('op_lname'):
                        display_name += f" {p['op_lname']}"
                    
                    if search_query and search_query not in display_name.lower() and search_query not in (p.get('op_email') or '').lower():
                        continue
                    
                    users.append({
                        'id': p['op_id'],
                        'name': display_name,
                        'role': 'Horse Operator',
                        'user_type': 'operator',
                        'user_status': p.get('users', {}).get('status', 'active'),
                        'avatar': '👨‍💼',
                        'email': p.get('op_email'),
                        'phone': p.get('op_phone_num'),
                        'status': p.get('users', {}).get('status', 'active')
                    })
            except Exception as e:
                print(f"Error fetching horse operators: {e}")

        # CTU Vets
        if role_filter in [None, "ctu_vet"]:
            try:
                if user_id:
                    ctu_profiles = service_client.table("ctu_vet_profile").select(
                        "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, users!inner(status)"
                    ).neq("ctu_id", user_id).execute()
                else:
                    ctu_profiles = service_client.table("ctu_vet_profile").select(
                        "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, users!inner(status)"
                    ).execute()
                
                for p in ctu_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = f"Dr. {p.get('ctu_fname', '')}"
                    if p.get('ctu_lname'):
                        display_name += f" {p['ctu_lname']}"
                    
                    if search_query and search_query not in display_name.lower() and search_query not in (p.get('ctu_email') or '').lower():
                        continue
                    
                    users.append({
                        'id': p['ctu_id'],
                        'name': display_name,
                        'role': 'Ctu-Vetmed',
                        'user_type': 'ctu_vet',
                        'user_status': p.get('users', {}).get('status', 'active'),
                        'avatar': '🧑‍⚕️',
                        'email': p.get('ctu_email'),
                        'phone': p.get('ctu_phonenum'),
                        'status': p.get('users', {}).get('status', 'active')
                    })
            except Exception as e:
                print(f"Error fetching CTU vets: {e}")

        # DVMF Users
        if role_filter in [None, "dvmf_user"]:
            try:
                if user_id:
                    dvmf_profiles = service_client.table("dvmf_user_profile").select(
                        "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, users!inner(status)"
                    ).neq("dvmf_id", user_id).execute()
                else:
                    dvmf_profiles = service_client.table("dvmf_user_profile").select(
                        "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, users!inner(status)"
                    ).execute()
                
                for p in dvmf_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('dvmf_fname', 'Unknown')
                    if p.get('dvmf_lname'):
                        display_name += f" {p['dvmf_lname']}"
                    
                    if search_query and search_query not in display_name.lower() and search_query not in (p.get('dvmf_email') or '').lower():
                        continue
                    
                    users.append({
                        'id': p['dvmf_id'],
                        'name': display_name,
                        'role': 'Dvmf',
                        'user_type': 'dvmf_user',
                        'user_status': p.get('users', {}).get('status', 'active'),
                        'avatar': '🧑‍💼',
                        'email': p.get('dvmf_email'),
                        'phone': p.get('dvmf_phonenum'),
                        'status': p.get('users', {}).get('status', 'active')
                    })
            except Exception as e:
                print(f"Error fetching DVMF users: {e}")

        users.sort(key=lambda x: x['name'])
        return Response({
            'success': True,
            'users': users,
            'total_count': len(users)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching all users: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'users': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def search_all_users(request):
    """
    Search users by name across all user types
    """
    try:
        query = request.GET.get('query', '').strip().lower()
        limit = int(request.GET.get('limit', 10))
        user_id = request.GET.get('user_id')
        role_filter = request.GET.get('role')

        if not query:
            return Response({
                'success': False,
                'message': 'Query parameter is required',
                'data': []
            }, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        users = []

        # Kutseros
        if role_filter in [None, "kutsero"]:
            try:
                if user_id:
                    kutsero_profiles = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email, users!inner(status)"
                    ).neq("kutsero_id", user_id).execute()
                else:
                    kutsero_profiles = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email, users!inner(status)"
                    ).execute()
                
                for p in kutsero_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('kutsero_fname') or p.get('kutsero_username') or 'Unknown'
                    if p.get('kutsero_lname'):
                        display_name += f" {p['kutsero_lname']}"
                    
                    if query in display_name.lower() or query in (p.get('kutsero_email') or '').lower():
                        users.append({
                            'id': p['kutsero_id'],
                            'name': display_name,
                            'role': 'Kutsero',
                            'user_type': 'kutsero',
                            'user_status': p.get('users', {}).get('status', 'active'),
                            'avatar': '🐴',
                            'email': p.get('kutsero_email'),
                            'phone': p.get('kutsero_phone_num'),
                            'status': p.get('users', {}).get('status', 'active')
                        })
            except Exception as e:
                print(f"Error searching kutseros: {e}")

        # Vets
        if role_filter in [None, "vet"]:
            try:
                if user_id:
                    vet_profiles = service_client.table("vet_profile").select(
                        "vet_id, vet_fname, vet_lname, vet_phone_num, vet_email, users!inner(status)"
                    ).neq("vet_id", user_id).execute()
                else:
                    vet_profiles = service_client.table("vet_profile").select(
                        "vet_id, vet_fname, vet_lname, vet_phone_num, vet_email, users!inner(status)"
                    ).execute()
                
                for p in vet_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = f"Dr. {p.get('vet_fname', '')}"
                    if p.get('vet_lname'):
                        display_name += f" {p['vet_lname']}"
                    
                    if query in display_name.lower() or query in (p.get('vet_email') or '').lower():
                        users.append({
                            'id': p['vet_id'],
                            'name': display_name,
                            'role': 'Veterinarian',
                            'user_type': 'vet',
                            'user_status': p.get('users', {}).get('status', 'active'),
                            'avatar': '👩‍⚕️',
                            'email': p.get('vet_email'),
                            'phone': p.get('vet_phone_num'),
                            'status': p.get('users', {}).get('status', 'active')
                        })
            except Exception as e:
                print(f"Error searching vets: {e}")

        # Horse Operators
        if role_filter in [None, "horse_operator"]:
            try:
                if user_id:
                    op_profiles = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_lname, op_phone_num, op_email, users!inner(status)"
                    ).neq("op_id", user_id).execute()
                else:
                    op_profiles = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_lname, op_phone_num, op_email, users!inner(status)"
                    ).execute()
                
                for p in op_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('op_fname', 'Unknown')
                    if p.get('op_lname'):
                        display_name += f" {p['op_lname']}"
                    
                    if query in display_name.lower() or query in (p.get('op_email') or '').lower():
                        users.append({
                            'id': p['op_id'],
                            'name': display_name,
                            'role': 'Horse Operator',
                            'user_type': 'operator',
                            'user_status': p.get('users', {}).get('status', 'active'),
                            'avatar': '👨‍💼',
                            'email': p.get('op_email'),
                            'phone': p.get('op_phone_num'),
                            'status': p.get('users', {}).get('status', 'active')
                        })
            except Exception as e:
                print(f"Error searching horse operators: {e}")

        # CTU Vets
        if role_filter in [None, "ctu_vet"]:
            try:
                if user_id:
                    ctu_profiles = service_client.table("ctu_vet_profile").select(
                        "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, users!inner(status)"
                    ).neq("ctu_id", user_id).execute()
                else:
                    ctu_profiles = service_client.table("ctu_vet_profile").select(
                        "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, users!inner(status)"
                    ).execute()
                
                for p in ctu_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = f"Dr. {p.get('ctu_fname', '')}"
                    if p.get('ctu_lname'):
                        display_name += f" {p['ctu_lname']}"
                    
                    if query in display_name.lower() or query in (p.get('ctu_email') or '').lower():
                        users.append({
                            'id': p['ctu_id'],
                            'name': display_name,
                            'role': 'Ctu-Vetmed',
                            'user_type': 'ctu_vet',
                            'user_status': p.get('users', {}).get('status', 'active'),
                            'avatar': '🧑‍⚕️',
                            'email': p.get('ctu_email'),
                            'phone': p.get('ctu_phonenum'),
                            'status': p.get('users', {}).get('status', 'active')
                        })
            except Exception as e:
                print(f"Error searching CTU vets: {e}")

        # DVMF Users
        if role_filter in [None, "dvmf_user"]:
            try:
                if user_id:
                    dvmf_profiles = service_client.table("dvmf_user_profile").select(
                        "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, users!inner(status)"
                    ).neq("dvmf_id", user_id).execute()
                else:
                    dvmf_profiles = service_client.table("dvmf_user_profile").select(
                        "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, users!inner(status)"
                    ).execute()
                
                for p in dvmf_profiles.data or []:
                    # Filter out declined and pending users
                    if p.get('users', {}).get('status') in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('dvmf_fname', 'Unknown')
                    if p.get('dvmf_lname'):
                        display_name += f" {p['dvmf_lname']}"
                    
                    if query in display_name.lower() or query in (p.get('dvmf_email') or '').lower():
                        users.append({
                            'id': p['dvmf_id'],
                            'name': display_name,
                            'role': 'Dvmf',
                            'user_type': 'dvmf_user',
                            'user_status': p.get('users', {}).get('status', 'active'),
                            'avatar': '🧑‍💼',
                            'email': p.get('dvmf_email'),
                            'phone': p.get('dvmf_phonenum'),
                            'status': p.get('users', {}).get('status', 'active')
                        })
            except Exception as e:
                print(f"Error searching DVMF users: {e}")

        users.sort(key=lambda x: x['name'])
        users = users[:limit]
        print(f"📊 Found {len(users)} matching users for query: {query}")
        
        return Response({
            'success': True,
            'message': f'Found {len(users)} users',
            'data': users,
            'users': users
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in search_all_users: {str(e)}")
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_user_profile(request, user_id):
    """
    Get detailed user profile information for any user type
    """
    try:
        logger.info(f"Fetching profile for user_id: {user_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to find user in different tables
        user_data = None
        user_type = None
        
        # Check kutsero_profile
        try:
            kutsero = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
            if kutsero.data and len(kutsero.data) > 0:
                profile = kutsero.data[0]
                logger.info(f"Found kutsero profile: {profile}")
                user_data = {
                    "id": profile.get("kutsero_id"),
                    "email": profile.get("kutsero_email"),
                    "role": "Kutsero",
                    "status": profile.get("status", "active"),
                    "profile": {
                        "fname": profile.get("kutsero_fname"),
                        "mname": profile.get("kutsero_mname"),
                        "lname": profile.get("kutsero_lname"),
                        "username": profile.get("kutsero_username"),
                        "email": profile.get("kutsero_email"),
                        "phone": profile.get("kutsero_phone_num"),
                        "city": profile.get("kutsero_city"),
                        "province": profile.get("kutsero_province"),
                        "profile_image": profile.get("kutsero_image")
                    }
                }
                user_type = "kutsero"
                logger.info(f"Kutsero profile - city: {profile.get('kutsero_city')}, province: {profile.get('kutsero_province')}, image: {profile.get('kutsero_image')}")
        except Exception as e:
            logger.error(f"Error checking kutsero: {e}")
        
        # Check vet_profile
        if not user_data:
            try:
                vet = service_client.table("vet_profile").select("*").eq("vet_id", user_id).execute()
                if vet.data and len(vet.data) > 0:
                    profile = vet.data[0]
                    logger.info(f"Found vet profile: {profile}")
                    user_data = {
                        "id": profile.get("vet_id"),
                        "email": profile.get("vet_email"),
                        "role": "Veterinarian",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("vet_fname"),
                            "mname": profile.get("vet_mname"),
                            "lname": profile.get("vet_lname"),
                            "username": profile.get("vet_username"),
                            "email": profile.get("vet_email"),
                            "phone": profile.get("vet_phone_num"),
                            "city": profile.get("vet_city"),
                            "province": profile.get("vet_province"),
                            "profile_image": profile.get("vet_profile_photo")
                        }
                    }
                    user_type = "vet"
                    logger.info(f"Vet profile - city: {profile.get('vet_city')}, province: {profile.get('vet_province')}, image: {profile.get('vet_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking vet: {e}")
        
        # Check horse_op_profile
        if not user_data:
            try:
                op = service_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
                if op.data and len(op.data) > 0:
                    profile = op.data[0]
                    logger.info(f"Found horse operator profile: {profile}")
                    user_data = {
                        "id": profile.get("op_id"),
                        "email": profile.get("op_email"),
                        "role": "Horse Operator",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("op_fname"),
                            "mname": profile.get("op_mname"),
                            "lname": profile.get("op_lname"),
                            "username": profile.get("op_username"),
                            "email": profile.get("op_email"),
                            "phone": profile.get("op_phone_num"),
                            "city": profile.get("op_city"),
                            "province": profile.get("op_province"),
                            "profile_image": profile.get("op_image")
                        }
                    }
                    user_type = "operator"
                    logger.info(f"Horse operator profile - city: {profile.get('op_city')}, province: {profile.get('op_province')}, image: {profile.get('op_image')}")
            except Exception as e:
                logger.error(f"Error checking horse operator: {e}")
        
        # Check ctu_vet_profile
        if not user_data:
            try:
                ctu = service_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
                if ctu.data and len(ctu.data) > 0:
                    profile = ctu.data[0]
                    logger.info(f"Found CTU vet profile: {profile}")
                    user_data = {
                        "id": profile.get("ctu_id"),
                        "email": profile.get("ctu_email"),
                        "role": "Ctu-Vetmed",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("ctu_fname"),
                            "mname": profile.get("ctu_mname"),
                            "lname": profile.get("ctu_lname"),
                            "username": profile.get("ctu_username"),
                            "email": profile.get("ctu_email"),
                            "phone": profile.get("ctu_phonenum"),
                            "city": profile.get("ctu_city"),
                            "province": profile.get("ctu_province"),
                            "profile_image": profile.get("ctu_profile_photo")
                        }
                    }
                    user_type = "ctu_vet"
                    logger.info(f"CTU vet profile - city: {profile.get('ctu_city')}, province: {profile.get('ctu_province')}, image: {profile.get('ctu_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking CTU vet: {e}")
        
        # Check dvmf_user_profile
        if not user_data:
            try:
                dvmf = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
                if dvmf.data and len(dvmf.data) > 0:
                    profile = dvmf.data[0]
                    logger.info(f"Found DVMF user profile: {profile}")
                    user_data = {
                        "id": profile.get("dvmf_id"),
                        "email": profile.get("dvmf_email"),
                        "role": "Dvmf",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("dvmf_fname"),
                            "mname": profile.get("dvmf_mname"),
                            "lname": profile.get("dvmf_lname"),
                            "username": profile.get("dvmf_username"),
                            "email": profile.get("dvmf_email"),
                            "phone": profile.get("dvmf_phonenum"),
                            "city": profile.get("dvmf_city"),
                            "province": profile.get("dvmf_province"),
                            "profile_image": profile.get("dvmf_profile_photo")
                        }
                    }
                    user_type = "dvmf_user"
                    logger.info(f"DVMF user profile - city: {profile.get('dvmf_city')}, province: {profile.get('dvmf_province')}, image: {profile.get('dvmf_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking DVMF user: {e}")
        
        if user_data:
            logger.info(f"Successfully found user: {user_type}")
            logger.info(f"Profile image URL: {user_data['profile'].get('profile_image')}")
            return Response({
                'success': True,
                'user': user_data,
                'user_type': user_type
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"User not found: {user_id}")
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        logger.error(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
def get_user_announcements(request, user_id):
    """
    Get all announcements posted by a specific user (DVMF or CTU-Vetmed)
    Returns announcements with images (supports multiple images)
    """
    try:
        logger.info(f"=== GET USER ANNOUNCEMENTS START ===")
        logger.info(f"User ID received: {user_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Supabase storage configuration
        BUCKET_NAME = "announcement-img"
        
        # First, let's check what's in the announcement table
        logger.info("Checking announcement table structure...")
        sample_announcement = service_client.table("announcement").select("*").limit(1).execute()
        if sample_announcement.data:
            logger.info(f"Announcement table columns: {list(sample_announcement.data[0].keys())}")
        
        # Fetch ALL announcements first to debug
        logger.info("Fetching ALL announcements to check data...")
        all_announcements = service_client.table("announcement").select("*").limit(5).execute()
        if all_announcements.data:
            for ann in all_announcements.data:
                logger.info(f"Sample announcement: ID={ann.get('announce_id')}, "
                          f"Title={ann.get('announce_title')}, "
                          f"user_id={ann.get('user_id')}, "
                          f"created_by={ann.get('created_by')}, "
                          f"author_id={ann.get('author_id')}")
        
        # Try to fetch announcements for this user - try different possible column names
        announcements_response = None
        column_used = None
        
        # Try user_id
        try:
            logger.info(f"Attempting to fetch with user_id = {user_id}")
            announcements_response = service_client.table("announcement") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("announce_date", desc=True) \
                .execute()
            if announcements_response.data and len(announcements_response.data) > 0:
                column_used = "user_id"
                logger.info(f"Found {len(announcements_response.data)} announcements using 'user_id'")
        except Exception as e:
            logger.error(f"Error with user_id query: {e}")
        
        # Try created_by if no results
        if not announcements_response or not announcements_response.data or len(announcements_response.data) == 0:
            try:
                logger.info(f"Attempting to fetch with created_by = {user_id}")
                announcements_response = service_client.table("announcement") \
                    .select("*") \
                    .eq("created_by", user_id) \
                    .order("announce_date", desc=True) \
                    .execute()
                if announcements_response.data and len(announcements_response.data) > 0:
                    column_used = "created_by"
                    logger.info(f"Found {len(announcements_response.data)} announcements using 'created_by'")
            except Exception as e:
                logger.error(f"Error with created_by query: {e}")
        
        # Try author_id if still no results
        if not announcements_response or not announcements_response.data or len(announcements_response.data) == 0:
            try:
                logger.info(f"Attempting to fetch with author_id = {user_id}")
                announcements_response = service_client.table("announcement") \
                    .select("*") \
                    .eq("author_id", user_id) \
                    .order("announce_date", desc=True) \
                    .execute()
                if announcements_response.data and len(announcements_response.data) > 0:
                    column_used = "author_id"
                    logger.info(f"Found {len(announcements_response.data)} announcements using 'author_id'")
            except Exception as e:
                logger.error(f"Error with author_id query: {e}")
        
        # Try ctu_id or dvmf_id if still no results
        if not announcements_response or not announcements_response.data or len(announcements_response.data) == 0:
            try:
                logger.info(f"Attempting to fetch with ctu_id = {user_id}")
                announcements_response = service_client.table("announcement") \
                    .select("*") \
                    .eq("ctu_id", user_id) \
                    .order("announce_date", desc=True) \
                    .execute()
                if announcements_response.data and len(announcements_response.data) > 0:
                    column_used = "ctu_id"
                    logger.info(f"Found {len(announcements_response.data)} announcements using 'ctu_id'")
            except Exception as e:
                logger.error(f"Error with ctu_id query: {e}")
        
        if not announcements_response or not announcements_response.data or len(announcements_response.data) == 0:
            try:
                logger.info(f"Attempting to fetch with dvmf_id = {user_id}")
                announcements_response = service_client.table("announcement") \
                    .select("*") \
                    .eq("dvmf_id", user_id) \
                    .order("announce_date", desc=True) \
                    .execute()
                if announcements_response.data and len(announcements_response.data) > 0:
                    column_used = "dvmf_id"
                    logger.info(f"Found {len(announcements_response.data)} announcements using 'dvmf_id'")
            except Exception as e:
                logger.error(f"Error with dvmf_id query: {e}")
        
        logger.info(f"Final result count: {len(announcements_response.data) if announcements_response and announcements_response.data else 0}")
        logger.info(f"Column used: {column_used}")
        
        # Fetch user information
        user_info = None
        user_name = "Unknown User"
        
        if user_id:
            try:
                # Try to fetch from ctu_vet_profile table first
                logger.info(f"Attempting to fetch user info from ctu_vet_profile for user_id: {user_id}")
                user_response = service_client.table("ctu_vet_profile") \
                    .select("*") \
                    .eq("ctu_id", user_id) \
                    .execute()
                
                if user_response.data and len(user_response.data) > 0:
                    user_info = user_response.data[0]
                    user_name = user_info.get("ctu_name") or user_info.get("name") or "CTU User"
                    logger.info(f"Found CTU user: {user_name}")
                else:
                    logger.info(f"User not found in ctu_vet_profile, trying dvmf_user_profile")
                    
                    # Try dvmf_user_profile table
                    user_response = service_client.table("dvmf_user_profile") \
                        .select("*") \
                        .eq("dvmf_id", user_id) \
                        .execute()
                    
                    if user_response.data and len(user_response.data) > 0:
                        user_info = user_response.data[0]
                        user_name = user_info.get("dvmf_name") or user_info.get("name") or "DVMF User"
                        logger.info(f"Found DVMF user: {user_name}")
                    else:
                        logger.warning(f"User not found in either ctu_vet_profile or dvmf_user_profile")
            except Exception as user_error:
                logger.error(f"Error fetching user information: {user_error}")
        
        announcements_list = []
        
        if announcements_response and announcements_response.data:
            for announcement in announcements_response.data:
                announce_id = announcement.get("announce_id")
                if not announce_id:
                    logger.warning("Skipping announcement without announce_id")
                    continue
                
                logger.info(f"Processing announcement {announce_id}: {announcement.get('announce_title')}")
                
                # Handle image URLs - parse as array for multiple images
                image_urls = []
                announce_img = announcement.get("announce_img")
                
                logger.info(f"Announcement {announce_id} image data: {announce_img}")
                
                if announce_img:
                    try:
                        # Check if it's a JSON array string
                        if isinstance(announce_img, str) and announce_img.startswith('['):
                            import json
                            img_array = json.loads(announce_img)
                            logger.info(f"Parsed image array: {img_array}")
                            if img_array and isinstance(img_array, list):
                                # Process ALL images in the array
                                for img in img_array:
                                    if isinstance(img, str):
                                        if img.startswith('http'):
                                            image_urls.append(img)
                                        elif img.strip():
                                            filename = img.strip()
                                            full_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
                                            image_urls.append(full_url)
                        # Check if it's already a full URL (single image)
                        elif isinstance(announce_img, str) and announce_img.startswith('http'):
                            image_urls.append(announce_img)
                        # Check if it's a comma-separated list of filenames
                        elif isinstance(announce_img, str) and ',' in announce_img:
                            filenames = [f.strip() for f in announce_img.split(',') if f.strip()]
                            for filename in filenames:
                                if filename.startswith('http'):
                                    image_urls.append(filename)
                                else:
                                    full_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
                                    image_urls.append(full_url)
                        # Otherwise, it's just a filename - construct the URL
                        elif isinstance(announce_img, str) and announce_img.strip():
                            filename = announce_img.strip()
                            full_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
                            image_urls.append(full_url)
                        
                        logger.info(f"Final image URLs for announcement {announce_id}: {image_urls} (Total: {len(image_urls)})")
                    except Exception as img_error:
                        logger.warning(f"Error parsing images for announcement {announce_id}: {img_error}")
                        image_urls = []
                
                # Build announcement data - return array of images or None and include user info
                announcement_data = {
                    "id": str(announce_id),
                    "title": announcement.get("announce_title", "Untitled"),
                    "content": announcement.get("announce_content", ""),
                    "created_at": announcement.get("announce_date") or announcement.get("created_at", ""),
                    "updated_at": announcement.get("updated_at"),
                    "image_url": image_urls if len(image_urls) > 0 else None,
                    "user_name": user_name,
                    "user_info": user_info
                }
                
                logger.info(f"Added announcement: {announcement_data['title']} with {len(image_urls)} images by {user_name}")
                announcements_list.append(announcement_data)
        
        logger.info(f"Returning {len(announcements_list)} announcements for user {user_id}")
        logger.info(f"=== GET USER ANNOUNCEMENTS END ===")
        
        return Response({
            'success': True,
            'announcements': announcements_list,
            'debug_info': {
                'user_id': user_id,
                'column_used': column_used,
                'total_found': len(announcements_list),
                'user_name': user_name
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching user announcements: {e}")
        logger.error(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e),
            'announcements': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ------------------------------------------------ FORGOT PASSWORD ------------------------------------------------
@api_view(["POST"])
def forgot_password(request):
    """
    Check if email exists in Supabase
    """
    email = request.data.get("email")
    
    if not email:
        return Response(
            {"error": "Email is required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get all users from Supabase
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    
    resp = requests.get(url, headers=headers)
    
    if not resp.ok:
        return Response(
            {"error": "Failed to query Supabase."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    data = resp.json()
    users = data.get("users", [])
    
    # Check if email exists
    user = next((u for u in users if u.get("email") == email), None)
    
    if not user:
        return Response(
            {"exists": False, "error": "Email not registered."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(
        {"exists": True}, 
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
def reset_password(request):
    """
    Reset user password in Supabase
    """
    email = request.data.get("email")
    new_password = request.data.get("newPassword")
    
    if not email or not new_password:
        return Response(
            {"error": "Email and new password are required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 1. Get all users from Supabase
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    
    resp = requests.get(url, headers=headers)
    
    if not resp.ok:
        return Response(
            {"error": "Failed to query Supabase."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    data = resp.json()
    users = data.get("users", [])
    
    # 2. Find user by email
    user = next((u for u in users if u.get("email") == email), None)
    
    if not user:
        return Response(
            {"error": "Email not registered."}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    user_id = user.get("id")
    
    # 3. Update password in Supabase
    update_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    payload = {"password": new_password}
    
    update_resp = requests.put(update_url, headers=headers, json=payload)
    
    if not update_resp.ok:
        return Response(
            {"error": "Failed to reset password."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response(
        {"success": True, "message": "Password reset successful."}, 
        status=status.HTTP_200_OK
    )

# ------------------------------------------------ REMINDER NOTIF ------------------------------------------------
def get_kutsero_by_input(kutsero_input):
    """
    Returns a list of kutsero dicts with 'kutsero_id' from input.
    Accepts either UUID or first name (kutsero_fname)
    """
    try:
        # Try to parse as UUID
        val = uuid.UUID(kutsero_input, version=4)
        kutsero_response = supabase.table('kutsero_profile')\
            .select('kutsero_id, kutsero_fname, kutsero_lname')\
            .eq('kutsero_id', str(val))\
            .execute()
    except ValueError:
        # Treat as first name
        kutsero_response = supabase.table('kutsero_profile')\
            .select('kutsero_id, kutsero_fname, kutsero_lname')\
            .eq('kutsero_fname', kutsero_input)\
            .execute()

    return kutsero_response.data if kutsero_response.data else []


@api_view(['GET'])
def feed_water_notifications(request):
    """
    Fetch all feed and water schedule notifications for a specific kutsero.
    Always returns notifications even if horse is checked out.
    Accepts either UUID or first name.
    """
    try:
        kutsero_input = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')

        if not kutsero_input:
            return Response({
                'success': False,
                'message': 'kutsero_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        notifications = []

        kutseros = get_kutsero_by_input(kutsero_input)
        if not kutseros:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'message': 'Kutsero not found'
            })

        kutsero_uuid = kutseros[0]['kutsero_id']

        # Map horse IDs to names
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Fetch feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                 .select('*')
                 .eq('kutsero_id', kutsero_uuid)
                 .execute().data or [])
        if horse_id:
            feeds = [f for f in feeds if f.get('horse_id') == horse_id]

        for feed in feeds:
            horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'feed_{feed.get("fd_id")}',
                'type': 'feed',
                'title': f'🍽️ {feed.get("fd_meal_type")} Time',
                'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                'scheduled_time': feed.get('fd_time'),
                'horse_id': feed.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'meal_type': feed.get('fd_meal_type'),
                    'food_type': feed.get('fd_food_type'),
                    'quantity': feed.get('fd_qty'),
                },
                'timestamp': now.isoformat(),
            })

        # Fetch water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                  .select('*')
                  .eq('kutsero_id', kutsero_uuid)
                  .execute().data or [])
        if horse_id:
            waters = [w for w in waters if w.get('horse_id') == horse_id]

        for water in waters:
            horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'water_{water.get("water_id")}',
                'type': 'water',
                'title': f'💧 {water.get("water_period")} Watering Time',
                'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                'scheduled_time': water.get('water_time'),
                'horse_id': water.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'period': water.get('water_period'),
                    'amount': water.get('water_amount'),
                },
                'timestamp': now.isoformat(),
            })

        return Response({
            'success': True,
            'data': notifications,
            'count': len(notifications),
            'current_time': current_time,
        })

    except Exception as e:
        print(f"Error in feed_water_notifications: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error fetching notifications: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def check_current_schedules(request):
    """
    Check if any feed/water schedules are due right now.
    Always returns due notifications even if horse is checked out.
    Accepts either UUID or first name.
    """
    try:
        kutsero_input = request.GET.get('kutsero_id')
        if not kutsero_input:
            return Response({
                'success': False,
                'message': 'kutsero_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        prev_minute = (now - timedelta(minutes=1)).strftime('%I:%M %p')
        due_notifications = []

        kutseros = get_kutsero_by_input(kutsero_input)
        if not kutseros:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'has_due_schedules': False,
            })

        kutsero_uuid = kutseros[0]['kutsero_id']

        # Map horse IDs to names
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Check feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                 .select('*')
                 .eq('kutsero_id', kutsero_uuid)
                 .execute().data or [])
        for feed in feeds:
            if feed.get('fd_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'feed_{feed.get("fd_id")}',
                    'type': 'feed',
                    'title': f'🍽️ {feed.get("fd_meal_type")} Time!',
                    'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                    'scheduled_time': feed.get('fd_time'),
                    'horse_id': feed.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        # Check water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                  .select('*')
                  .eq('kutsero_id', kutsero_uuid)
                  .execute().data or [])
        for water in waters:
            if water.get('water_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'water_{water.get("water_id")}',
                    'type': 'water',
                    'title': f'💧 {water.get("water_period")} Watering Time!',
                    'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                    'scheduled_time': water.get('water_time'),
                    'horse_id': water.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        return Response({
            'success': True,
            'data': due_notifications,
            'count': len(due_notifications),
            'current_time': current_time,
            'has_due_schedules': len(due_notifications) > 0,
        })

    except Exception as e:
        print(f"Error in check_current_schedules: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error checking schedules: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===========================================================================

# ------------------------------------------------ HORSE OPERATOR REMINDER NOTIF ------------------------------------------------
def get_operator_by_input(operator_input):
    """
    Returns a list of operator dicts with 'operator_id' from input.
    Accepts either UUID or first name (operator_fname)
    """
    try:
        # Try to parse as UUID
        val = uuid.UUID(operator_input, version=4)
        operator_response = supabase.table('operator_profile')\
            .select('operator_id, operator_fname, operator_lname')\
            .eq('operator_id', str(val))\
            .execute()
    except ValueError:
        # Treat as first name
        operator_response = supabase.table('operator_profile')\
            .select('operator_id, operator_fname, operator_lname')\
            .eq('operator_fname', operator_input)\
            .execute()

    return operator_response.data if operator_response.data else []


@api_view(['GET'])
def operator_feed_water_notifications(request):
    """
    Fetch all feed and water schedule notifications for a specific operator.
    Always returns notifications even if horse is checked out.
    Accepts either UUID or first name.
    """
    try:
        operator_input = request.GET.get('operator_id')
        horse_id = request.GET.get('horse_id')

        if not operator_input:
            return Response({
                'success': False,
                'message': 'operator_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        notifications = []

        operators = get_operator_by_input(operator_input)
        if not operators:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'message': 'Operator not found'
            })

        operator_uuid = operators[0]['operator_id']

        # Map horse IDs to names
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Fetch feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                 .select('*')
                 .eq('operator_id', operator_uuid)
                 .execute().data or [])
        if horse_id:
            feeds = [f for f in feeds if f.get('horse_id') == horse_id]

        for feed in feeds:
            horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'feed_{feed.get("fd_id")}',
                'type': 'feed',
                'title': f'🍽️ {feed.get("fd_meal_type")} Time',
                'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                'scheduled_time': feed.get('fd_time'),
                'horse_id': feed.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'meal_type': feed.get('fd_meal_type'),
                    'food_type': feed.get('fd_food_type'),
                    'quantity': feed.get('fd_qty'),
                },
                'timestamp': now.isoformat(),
            })

        # Fetch water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                  .select('*')
                  .eq('operator_id', operator_uuid)
                  .execute().data or [])
        if horse_id:
            waters = [w for w in waters if w.get('horse_id') == horse_id]

        for water in waters:
            horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'water_{water.get("water_id")}',
                'type': 'water',
                'title': f'💧 {water.get("water_period")} Watering Time',
                'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                'scheduled_time': water.get('water_time'),
                'horse_id': water.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'period': water.get('water_period'),
                    'amount': water.get('water_amount'),
                },
                'timestamp': now.isoformat(),
            })

        return Response({
            'success': True,
            'data': notifications,
            'count': len(notifications),
            'current_time': current_time,
        })

    except Exception as e:
        print(f"Error in operator_feed_water_notifications: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error fetching notifications: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def operator_check_current_schedules(request):
    """
    Check if any feed/water schedules are due right now for operator.
    Always returns due notifications even if horse is checked out.
    Accepts either UUID or first name.
    """
    try:
        operator_input = request.GET.get('operator_id')
        if not operator_input:
            return Response({
                'success': False,
                'message': 'operator_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        prev_minute = (now - timedelta(minutes=1)).strftime('%I:%M %p')
        due_notifications = []

        operators = get_operator_by_input(operator_input)
        if not operators:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'has_due_schedules': False,
            })

        operator_uuid = operators[0]['operator_id']

        # Map horse IDs to names
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Check feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                 .select('*')
                 .eq('operator_id', operator_uuid)
                 .execute().data or [])
        for feed in feeds:
            if feed.get('fd_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'feed_{feed.get("fd_id")}',
                    'type': 'feed',
                    'title': f'🍽️ {feed.get("fd_meal_type")} Time!',
                    'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                    'scheduled_time': feed.get('fd_time'),
                    'horse_id': feed.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        # Check water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                  .select('*')
                  .eq('operator_id', operator_uuid)
                  .execute().data or [])
        for water in waters:
            if water.get('water_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'water_{water.get("water_id")}',
                    'type': 'water',
                    'title': f'💧 {water.get("water_period")} Watering Time!',
                    'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                    'scheduled_time': water.get('water_time'),
                    'horse_id': water.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        return Response({
            'success': True,
            'data': due_notifications,
            'count': len(due_notifications),
            'current_time': current_time,
            'has_due_schedules': len(due_notifications) > 0,
        })

    except Exception as e:
        print(f"Error in operator_check_current_schedules: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error checking schedules: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def operator_notifications(request):
    """
    Fetch all notifications for operator including announcements and scheduled reminders.
    Accepts either UUID or first name.
    """
    try:
        operator_input = request.GET.get('user_id')
        if not operator_input:
            return Response({
                'success': False,
                'message': 'user_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        notifications = []

        operators = get_operator_by_input(operator_input)
        if not operators:
            return Response({
                'success': True,
                'notifications': [],
                'count': 0,
                'message': 'Operator not found'
            })

        operator_uuid = operators[0]['operator_id']

        # Fetch announcements
        announcements_response = supabase.table('announcement')\
            .select('*')\
            .order('announce_date', desc=True)\
            .execute()
        
        announcements = announcements_response.data or []
        
        for announcement in announcements:
            # Format the date
            announce_date = announcement.get('announce_date')
            if announce_date:
                if isinstance(announce_date, str):
                    try:
                        announce_date = datetime.fromisoformat(announce_date.replace('Z', '+00:00'))
                    except:
                        announce_date = datetime.now()
                formatted_date = announce_date.strftime('%B %d, %Y at %I:%M %p')
            else:
                formatted_date = "Unknown date"
            
            # Handle image URLs
            image_urls = []
            raw_image_url = announcement.get('image_url') or announcement.get('announce_image')
            if raw_image_url:
                if isinstance(raw_image_url, str):
                    if raw_image_url.startswith('['):
                        try:
                            image_urls = json.loads(raw_image_url)
                            if not isinstance(image_urls, list):
                                image_urls = [image_urls]
                        except:
                            image_urls = [raw_image_url]
                    else:
                        image_urls = [raw_image_url]
            
            notifications.append({
                'id': f"announce_{announcement.get('announce_id')}",
                'notification_id': f"announce_{announcement.get('announce_id')}",
                'title': announcement.get('announce_title', 'Announcement'),
                'message': announcement.get('announce_content', ''),
                'time': formatted_date,
                'type': 'system',
                'priority': 'medium',
                'image_urls': image_urls,
                'created_at': announcement.get('announce_date'),
                'source': 'announcement',
                'posted_by_role': announcement.get('posted_by_role', 'Admin'),
                'formatted_date': formatted_date,
            })

        # Fetch scheduled reminders
        feed_water_notifs = operator_feed_water_notifications(request._request).data
        if isinstance(feed_water_notifs, dict) and feed_water_notifs.get('success'):
            for notif in feed_water_notifs.get('data', []):
                notifications.append({
                    'id': notif.get('id'),
                    'notification_id': notif.get('id'),
                    'title': notif.get('title'),
                    'message': notif.get('message'),
                    'time': notif.get('scheduled_time', 'Scheduled'),
                    'type': 'reminder',
                    'priority': notif.get('priority', 'medium'),
                    'horseName': notif.get('horse_name'),
                    'scheduledTime': notif.get('scheduled_time'),
                    'created_at': notif.get('timestamp'),
                    'source': 'schedule',
                })

        return Response({
            'success': True,
            'notifications': notifications,
            'count': len(notifications),
            'current_time': now.strftime('%I:%M %p'),
        })

    except Exception as e:
        print(f"Error in operator_notifications: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error fetching operator notifications: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =========================================================================== HORSE APPLICATION ==================================================
# In your views.py - Update all the horse owner views without @permission_classes([IsAuthenticated])

@api_view(['GET'])
def get_horse_owners(request):
    """
    Get all horse owners with their available horses
    """
    try:
        # Get the kutsero_id from query params
        kutsero_id = request.GET.get("kutsero_id")
        if not kutsero_id:
            return Response({
                "success": False,
                "error": "kutsero_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Use your existing supabase client
        from supabase import create_client
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        owners = []

        # Get all horse owners from horse_op_profile table
        owners_response = service_client.table("horse_op_profile").select("*").execute()
        
        print(f"DEBUG: Found {len(owners_response.data or [])} horse owners")
        
        # Get existing applications by this kutsero
        applications_response = service_client.table("op_kutsero_application").select("*").eq("kutsero_id", kutsero_id).execute()
        
        existing_applications = {}
        for app in applications_response.data or []:
            existing_applications[app['op_id']] = app['status']
        
        print(f"DEBUG: Found {len(existing_applications)} existing applications for kutsero {kutsero_id}")

        # Process each owner
        for owner in owners_response.data or []:
            op_id = owner['op_id']
            
            # Get available horses for this owner (not deceased)
            horses_response = service_client.table("horse_profile").select("*").eq("op_id", op_id).execute()
            
            available_horses = []
            total_horses = 0
            
            for horse in horses_response.data or []:
                # Skip deceased horses
                if horse.get('horse_status') == 'deceased':
                    continue
                
                total_horses += 1
                
                # Only include available or idle horses
                if horse.get('horse_status') in ['available', 'idle']:
                    available_horses.append({
                        'horse_id': horse['horse_id'],
                        'horse_name': horse['horse_name'],
                        'horse_breed': horse['horse_breed'],
                        'horse_age': horse['horse_age'],
                        'horse_image': horse.get('horse_image'),
                        'horse_status': horse.get('horse_status'),
                        'horse_color': horse.get('horse_color'),
                        'horse_sex': horse.get('horse_sex')
                    })
            
            # Check if kutsero has existing application with this owner
            has_pending_application = existing_applications.get(op_id) == 'pending'
            is_approved = existing_applications.get(op_id) == 'approved'
            
            # Get owner's full name
            full_name = f"{owner.get('op_fname', '')} {owner.get('op_mname', '')} {owner.get('op_lname', '')}".strip()
            if not full_name:
                full_name = "Unknown Owner"
            
            # Format name for display
            display_name = f"{owner.get('op_lname', '')}, {owner.get('op_fname', '')}".strip()
            if owner.get('op_mname'):
                display_name += f" {owner.get('op_mname')}"
            
            # Format address
            address_parts = []
            if owner.get('op_house_add'):
                address_parts.append(owner['op_house_add'])
            if owner.get('op_brgy'):
                address_parts.append(owner['op_brgy'])
            if owner.get('op_municipality'):
                address_parts.append(owner['op_municipality'])
            if owner.get('op_city'):
                address_parts.append(owner['op_city'])
            
            address = ", ".join(address_parts) if address_parts else "Address not provided"
            
            owners.append({
                'op_id': op_id,
                'name': display_name,
                'full_name': full_name,
                'email': owner.get('op_email'),
                'phone': owner.get('op_phone_num'),
                'address': address,
                'image': owner.get('op_image'),
                'total_horses': total_horses,
                'available_horses': available_horses,
                'has_pending_application': has_pending_application,
                'is_approved': is_approved
            })
        
        return Response({
            'success': True,
            'owners': owners,
            'total_owners': len(owners)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"ERROR in get_horse_owners: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def apply_to_owner(request):
    """
    Apply to a horse owner for horse usage
    """
    try:
        data = request.data
        kutsero_id = data.get('kutsero_id')
        op_id = data.get('op_id')
        
        if not kutsero_id or not op_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and op_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if owner exists
        owner_response = service_client.table("horse_op_profile").select("*").eq("op_id", op_id).execute()
        
        if not owner_response.data:
            return Response({
                'success': False,
                'error': 'Owner not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already has an application with this owner
        existing_app_response = service_client.table("op_kutsero_application").select("*").eq("op_id", op_id).eq("kutsero_id", kutsero_id).execute()
        
        if existing_app_response.data:
            existing_app = existing_app_response.data[0]
            
            if existing_app['status'] == 'pending':
                return Response({
                    'success': False,
                    'error': 'You already have a pending application with this owner'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif existing_app['status'] == 'approved':
                return Response({
                    'success': False,
                    'error': 'You are already approved by this owner'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif existing_app['status'] == 'rejected':
                # Delete rejected application to allow re-application
                service_client.table("op_kutsero_application").delete().eq("application_id", existing_app['application_id']).execute()
        
        # Create new application
        application_data = {
            'application_id': str(uuid.uuid4()),
            'op_id': op_id,
            'kutsero_id': kutsero_id,
            'application_date': datetime.now().isoformat(),
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        application_response = service_client.table("op_kutsero_application").insert(application_data).execute()
        
        if not application_response.data:
            return Response({
                'success': False,
                'error': 'Failed to create application'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        new_application = application_response.data[0]
        
        # Get owner name for response
        owner = owner_response.data[0]
        owner_name = f"{owner.get('op_fname', '')} {owner.get('op_lname', '')}".strip()
        
        return Response({
            'success': True,
            'message': 'Application submitted successfully',
            'application': {
                'id': new_application['application_id'],
                'op_id': new_application['op_id'],
                'owner_name': owner_name,
                'application_date': new_application['application_date'],
                'status': new_application['status']
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"ERROR in apply_to_owner: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_my_applications(request):
    """
    Get all applications by the current kutsero
    """
    try:
        kutsero_id = request.GET.get("kutsero_id")
        if not kutsero_id:
            return Response({
                "success": False,
                "error": "kutsero_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get applications for this kutsero
        applications_response = service_client.table("op_kutsero_application").select("*").eq("kutsero_id", kutsero_id).execute()
        
        applications = []
        
        for app in applications_response.data or []:
            # Get owner details
            owner_response = service_client.table("horse_op_profile").select("*").eq("op_id", app['op_id']).execute()
            
            if owner_response.data:
                owner = owner_response.data[0]
                owner_name = f"{owner.get('op_fname', '')} {owner.get('op_lname', '')}".strip()
            else:
                owner_name = "Unknown Owner"
            
            applications.append({
                'application_id': app['application_id'],
                'op_id': app['op_id'],
                'owner_name': owner_name,
                'application_date': app['application_date'],
                'status': app['status'],
                'review_date': app.get('review_date'),
                'review_notes': app.get('review_notes'),
                'created_at': app.get('created_at'),
                'updated_at': app.get('updated_at')
            })
        
        return Response({
            'success': True,
            'applications': applications,
            'total': len(applications)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"ERROR in get_my_applications: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_approved_owners_horses(request):
    """
    Get horses from owners who have approved the kutsero
    """
    try:
        kutsero_id = request.GET.get("kutsero_id")
        print(f"DEBUG [get_approved_owners_horses]: Received request with kutsero_id: {kutsero_id}")
        
        if not kutsero_id:
            print("DEBUG: No kutsero_id provided")
            return Response({
                "success": False,
                "error": "kutsero_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get approved applications
        print(f"DEBUG: Checking approved applications for kutsero_id: {kutsero_id}")
        approved_apps_response = service_client.table("op_kutsero_application").select("op_id").eq("kutsero_id", kutsero_id).eq("status", "approved").execute()
        
        print(f"DEBUG: Approved apps query result: {approved_apps_response}")
        print(f"DEBUG: Number of approved owners: {len(approved_apps_response.data or [])}")
        
        approved_op_ids = [app['op_id'] for app in approved_apps_response.data or []]
        print(f"DEBUG: Approved op_ids: {approved_op_ids}")
        
        if not approved_op_ids:
            print("DEBUG: No approved owners found")
            return Response({
                'success': True,
                'horses': [],
                'total': 0,
                'message': 'No approved owners found'
            }, status=status.HTTP_200_OK)
        
        # Get horses from approved owners
        all_horses = []
        
        for op_id in approved_op_ids:
            print(f"DEBUG: Getting horses for owner: {op_id}")
            horses_response = service_client.table("horse_profile").select("*").eq("op_id", op_id).execute()
            
            print(f"DEBUG: Found {len(horses_response.data or [])} horses for owner {op_id}")
            
            # Get owner details
            owner_response = service_client.table("horse_op_profile").select("*").eq("op_id", op_id).execute()
            owner_name = "Unknown Owner"
            if owner_response.data:
                owner = owner_response.data[0]
                owner_name = f"{owner.get('op_fname', '')} {owner.get('op_lname', '')}".strip()
            
            for horse in horses_response.data or []:
                # Skip deceased horses
                if horse.get('horse_status') == 'deceased':
                    print(f"DEBUG: Skipping deceased horse: {horse.get('horse_name')}")
                    continue
                
                # Check if horse is already assigned (using horse_assignment table) - Check for active assignments (date_end is null)
                assignment_response = service_client.table("horse_assignment").select("*").eq("horse_id", horse['horse_id']).is_("date_end", "null").execute()
                is_assigned = bool(assignment_response.data)
                
                # Check if assigned to this specific kutsero
                is_assigned_to_me = False
                if assignment_response.data:
                    assignment = assignment_response.data[0]
                    is_assigned_to_me = assignment.get('kutsero_id') == kutsero_id
                
                horse_data = {
                    'id': horse['horse_id'],
                    'horse_id': horse['horse_id'],  # Add both formats for compatibility
                    'name': horse['horse_name'],
                    'horse_name': horse['horse_name'],
                    'breed': horse['horse_breed'],
                    'horse_breed': horse['horse_breed'],
                    'age': horse['horse_age'],
                    'horse_age': horse['horse_age'],
                    'sex': horse['horse_sex'],
                    'horse_sex': horse['horse_sex'],
                    'color': horse['horse_color'],
                    'horse_color': horse['horse_color'],
                    'image': horse.get('horse_image'),
                    'horse_image': horse.get('horse_image'),
                    'owner_id': op_id,
                    'owner_name': owner_name,
                    'status': horse.get('horse_status', 'unknown'),
                    'horse_status': horse.get('horse_status', 'unknown'),
                    'is_assigned': is_assigned,
                    'is_assigned_to_me': is_assigned_to_me,
                    'can_select': not is_assigned or is_assigned_to_me,
                    'owner_approved': True
                }
                all_horses.append(horse_data)
                
                print(f"DEBUG: Added horse: {horse['horse_name']}, status: {horse.get('horse_status')}, assigned: {is_assigned}, assigned_to_me: {is_assigned_to_me}")
        
        print(f"DEBUG: Total horses returned: {len(all_horses)}")
        return Response({
            'success': True,
            'horses': all_horses,
            'total': len(all_horses),
            'approved_owners': approved_op_ids
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"ERROR in get_approved_owners_horses: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def assign_horse_to_kutsero(request):
    """
    Assign a horse from an approved owner to a kutsero
    Allow switching from current horse to new horse even when checked in
    """
    try:
        print(f"🟢 DEBUG [assign_horse_to_kutsero]: Request received")
        
        data = request.data
        kutsero_id = data.get('kutsero_id')
        horse_id = data.get('horse_id')
        op_id = data.get('op_id')
        date_start = data.get('date_start')
        
        print(f"🟢 DEBUG: Parsed data - kutsero_id: {kutsero_id}, horse_id: {horse_id}, op_id: {op_id}")
        
        if not all([kutsero_id, horse_id, op_id]):
            return Response({
                'success': False,
                'error': 'kutsero_id, horse_id, and op_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if kutsero is approved by this owner
        approval_response = service_client.table("op_kutsero_application").select("*").eq("kutsero_id", kutsero_id).eq("op_id", op_id).eq("status", "approved").execute()
        
        if not approval_response.data:
            return Response({
                'success': False,
                'error': 'You are not approved by this horse owner'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if horse exists and belongs to this owner
        horse_response = service_client.table("horse_profile").select("*").eq("horse_id", horse_id).eq("op_id", op_id).execute()
        
        if not horse_response.data:
            return Response({
                'success': False,
                'error': 'Horse not found or does not belong to this owner'
            }, status=status.HTTP_404_NOT_FOUND)
        
        horse = horse_response.data[0]
        
        # Check if this horse is already assigned to this kutsero
        existing_assignment_response = service_client.table("horse_assignment").select("*").eq("horse_id", horse_id).eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
        
        if existing_assignment_response.data:
            return Response({
                'success': False,
                'error': 'This horse is already assigned to you'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if horse is assigned to someone else
        other_assignment_response = service_client.table("horse_assignment").select("*").eq("horse_id", horse_id).is_("date_end", "null").neq("kutsero_id", kutsero_id).execute()
        
        if other_assignment_response.data:
            return Response({
                'success': False,
                'error': 'This horse is already assigned to another kutsero'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # IMPORTANT: First, check if kutsero already has an active assignment
        current_active_assignment_response = service_client.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
        
        previous_assignments_ended = 0
        
        # If kutsero has an active assignment, we need to end it FIRST
        if current_active_assignment_response.data:
            print(f"🟢 DEBUG: Kutsero has active assignment(s), ending them first...")
            
            for assignment in current_active_assignment_response.data:
                try:
                    print(f"🟢 DEBUG: Ending assignment {assignment['assign_id']} for horse {assignment['horse_id']}")
                    
                    # Update the assignment to end it
                    update_result = service_client.table("horse_assignment").update({
                        'date_end': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat(),
                        'status': 'completed'
                    }).eq("assign_id", assignment['assign_id']).execute()
                    
                    if update_result.data:
                        # Update the previous horse's status to available
                        horse_update = service_client.table("horse_profile").update({
                            'horse_status': 'available',
                            'updated_at': datetime.now().isoformat()
                        }).eq("horse_id", assignment['horse_id']).execute()
                        
                        print(f"🟢 DEBUG: Updated previous horse {assignment['horse_id']} to available")
                        
                        previous_assignments_ended += 1
                    
                except Exception as e:
                    print(f"🔴 DEBUG: Error ending assignment {assignment['assign_id']}: {str(e)}")
                    # Continue anyway - we'll try to proceed with the new assignment
        
        # Small delay to ensure database updates are processed
        import time
        time.sleep(0.2)
        
        # Now create the new assignment
        assign_id = str(uuid.uuid4())
        assignment_data = {
            'assign_id': assign_id,
            'horse_id': horse_id,
            'kutsero_id': kutsero_id,
            'date_start': date_start if date_start else datetime.now().isoformat(),
            'date_end': None,  # This is a new active assignment
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"🟢 DEBUG: Creating new assignment: {assignment_data}")
        
        # Try to create the new assignment
        try:
            assignment_result = service_client.table("horse_assignment").insert(assignment_data).execute()
            
            if not assignment_result.data:
                # If insertion failed, check if constraint violation occurred
                print(f"🔴 DEBUG: Assignment insertion failed, checking for constraint violation")
                
                # Double-check if there's still an active assignment
                double_check = service_client.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
                
                if double_check.data:
                    print(f"🟡 DEBUG: Still found active assignment, trying to end it again")
                    # Force end any remaining active assignments
                    for assignment in double_check.data:
                        service_client.table("horse_assignment").update({
                            'date_end': datetime.now().isoformat(),
                            'updated_at': datetime.now().isoformat()
                        }).eq("assign_id", assignment['assign_id']).execute()
                
                # Try insertion again
                time.sleep(0.1)
                assignment_result = service_client.table("horse_assignment").insert(assignment_data).execute()
                
                if not assignment_result.data:
                    return Response({
                        'success': False,
                        'error': 'Failed to create new assignment. Please try again.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as insert_error:
            print(f"🔴 DEBUG: Error during assignment insertion: {str(insert_error)}")
            
            # If it's a constraint violation, handle it
            if '23505' in str(insert_error) or 'unique constraint' in str(insert_error):
                # Force end any active assignments and retry
                force_end = service_client.table("horse_assignment").update({
                    'date_end': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
                
                time.sleep(0.1)
                
                # Try one more time
                assignment_result = service_client.table("horse_assignment").insert(assignment_data).execute()
                
                if not assignment_result.data:
                    return Response({
                        'success': False,
                        'error': 'Could not switch horses. Please contact support.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                raise insert_error
        
        # Update the new horse's status
        service_client.table("horse_profile").update({
            'horse_status': 'assigned',
            'updated_at': datetime.now().isoformat()
        }).eq("horse_id", horse_id).execute()
        
        # Construct response message based on whether we switched horses
        if previous_assignments_ended > 0:
            message = f'Switched from previous horse to {horse["horse_name"]}'
        else:
            message = f'Horse {horse["horse_name"]} has been assigned to you'
        
        return Response({
            'success': True,
            'message': message,
            'previous_assignments_ended': previous_assignments_ended,
            'assignment': assignment_data,
            'horse': {
                'id': horse['horse_id'],
                'name': horse['horse_name'],
                'age': horse.get('horse_age'),
                'breed': horse.get('horse_breed'),
                'color': horse.get('horse_color'),
                'image': horse.get('horse_image'),
                'status': 'Currently assigned',
                'assignmentStatus': 'assigned',
                'currentAssignmentId': assign_id,
                'healthStatus': horse.get('horse_health_status', 'Healthy'),
                'lastCheckup': horse.get('last_checkup'),
                'nextCheckup': horse.get('next_checkup'),
                'ownerName': horse.get('owner_name'),
                'operatorName': horse.get('operator_name'),
                'opName': horse.get('op_name')
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"🔴 ERROR in assign_horse_to_kutsero: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def assign_horse_to_kutsero(request):
    """
    Assign a horse from an approved owner to a kutsero
    Allow switching from current horse to new horse even when checked in
    """
    try:
        print(f"🟢 DEBUG [assign_horse_to_kutsero]: Request received")
        
        data = request.data
        kutsero_id = data.get('kutsero_id')
        horse_id = data.get('horse_id')
        op_id = data.get('op_id')
        date_start = data.get('date_start')
        
        print(f"🟢 DEBUG: Parsed data - kutsero_id: {kutsero_id}, horse_id: {horse_id}, op_id: {op_id}")
        
        if not all([kutsero_id, horse_id, op_id]):
            return Response({
                'success': False,
                'error': 'kutsero_id, horse_id, and op_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if kutsero is approved by this owner
        approval_response = service_client.table("op_kutsero_application").select("*").eq("kutsero_id", kutsero_id).eq("op_id", op_id).eq("status", "approved").execute()
        
        if not approval_response.data:
            return Response({
                'success': False,
                'error': 'You are not approved by this horse owner'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if horse exists and belongs to this owner
        horse_response = service_client.table("horse_profile").select("*").eq("horse_id", horse_id).eq("op_id", op_id).execute()
        
        if not horse_response.data:
            return Response({
                'success': False,
                'error': 'Horse not found or does not belong to this owner'
            }, status=status.HTTP_404_NOT_FOUND)
        
        horse = horse_response.data[0]
        
        # Check if this horse is already assigned to this kutsero
        existing_assignment_response = service_client.table("horse_assignment").select("*").eq("horse_id", horse_id).eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
        
        if existing_assignment_response.data:
            return Response({
                'success': False,
                'error': 'This horse is already assigned to you'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if horse is assigned to someone else
        other_assignment_response = service_client.table("horse_assignment").select("*").eq("horse_id", horse_id).is_("date_end", "null").neq("kutsero_id", kutsero_id).execute()
        
        if other_assignment_response.data:
            return Response({
                'success': False,
                'error': 'This horse is already assigned to another kutsero'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # IMPORTANT: Check if kutsero has an active assignment
        current_active_assignment_response = service_client.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
        
        previous_assignments_ended = 0
        
        # If kutsero has an active assignment, we need to end it FIRST
        if current_active_assignment_response.data:
            print(f"🟢 DEBUG: Kutsero has {len(current_active_assignment_response.data)} active assignment(s)")
            
            for assignment in current_active_assignment_response.data:
                try:
                    print(f"🟢 DEBUG: Ending assignment {assignment['assign_id']} for horse {assignment['horse_id']}")
                    
                    # First, get the horse details to update its status
                    current_horse_response = service_client.table("horse_profile").select("*").eq("horse_id", assignment['horse_id']).execute()
                    
                    # Update the assignment to end it
                    update_result = service_client.table("horse_assignment").update({
                        'date_end': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat(),
                        'status': 'completed'
                    }).eq("assign_id", assignment['assign_id']).execute()
                    
                    print(f"🟢 DEBUG: Assignment update result: {update_result}")
                    
                    if update_result.data:
                        # Update the previous horse's status to available
                        horse_update = service_client.table("horse_profile").update({
                            'horse_status': 'available',
                            'updated_at': datetime.now().isoformat()
                        }).eq("horse_id", assignment['horse_id']).execute()
                        
                        print(f"🟢 DEBUG: Horse update result: {horse_update}")
                        
                        previous_assignments_ended += 1
                        print(f"🟢 DEBUG: Successfully ended assignment {assignment['assign_id']}")
                    
                except Exception as e:
                    print(f"🔴 DEBUG: Error ending assignment {assignment['assign_id']}: {str(e)}")
                    # Don't return error here, continue to try to create new assignment
        
        # Small delay to ensure database consistency
        import time
        time.sleep(0.3)
        
        # DOUBLE CHECK: Make sure no active assignments remain
        double_check_response = service_client.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
        
        if double_check_response.data:
            print(f"🟡 DEBUG: Still found {len(double_check_response.data)} active assignments after ending them")
            # Force end any remaining assignments
            for assignment in double_check_response.data:
                try:
                    force_update = service_client.table("horse_assignment").update({
                        'date_end': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }).eq("assign_id", assignment['assign_id']).execute()
                    
                    # Also update horse status
                    service_client.table("horse_profile").update({
                        'horse_status': 'available',
                        'updated_at': datetime.now().isoformat()
                    }).eq("horse_id", assignment['horse_id']).execute()
                    
                    previous_assignments_ended += 1
                except Exception as e:
                    print(f"🔴 DEBUG: Force end failed: {str(e)}")
        
        # Wait a bit more
        time.sleep(0.2)
        
        # Now create the new assignment
        assign_id = str(uuid.uuid4())
        assignment_data = {
            'assign_id': assign_id,
            'horse_id': horse_id,
            'kutsero_id': kutsero_id,
            'date_start': date_start if date_start else datetime.now().isoformat(),
            'date_end': None,
            'status': 'active',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"🟢 DEBUG: Creating new assignment for horse {horse_id}")
        
        # Try to create the assignment
        try:
            assignment_result = service_client.table("horse_assignment").insert(assignment_data).execute()
            
            print(f"🟢 DEBUG: Assignment creation result: {assignment_result}")
            
            if assignment_result.data:
                print(f"🟢 DEBUG: Assignment created successfully!")
                
                # Update the new horse's status
                new_horse_update = service_client.table("horse_profile").update({
                    'horse_status': 'assigned',
                    'updated_at': datetime.now().isoformat()
                }).eq("horse_id", horse_id).execute()
                
                print(f"🟢 DEBUG: New horse status update: {new_horse_update}")
                
                # Construct response message
                if previous_assignments_ended > 0:
                    message = f'Successfully switched to {horse["horse_name"]}'
                else:
                    message = f'{horse["horse_name"]} has been assigned to you'
                
                return Response({
                    'success': True,
                    'message': message,
                    'previous_assignments_ended': previous_assignments_ended,
                    'assignment': assignment_data,
                    'horse': {
                        'id': horse['horse_id'],
                        'name': horse['horse_name'],
                        'age': horse.get('horse_age'),
                        'breed': horse.get('horse_breed'),
                        'color': horse.get('horse_color'),
                        'image': horse.get('horse_image'),
                        'status': 'Currently assigned',
                        'assignmentStatus': 'assigned',
                        'currentAssignmentId': assign_id
                    }
                }, status=status.HTTP_200_OK)
            
        except Exception as insert_error:
            print(f"🔴 DEBUG: Error creating assignment: {str(insert_error)}")
            
            # If it's a constraint violation, check what's wrong
            if '23505' in str(insert_error) or 'unique constraint' in str(insert_error):
                # Check one more time if there's still an active assignment
                final_check = service_client.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).is_("date_end", "null").execute()
                
                if final_check.data:
                    error_msg = f'Could not end current assignment. Please contact support. Active assignments: {len(final_check.data)}'
                else:
                    error_msg = 'Database constraint prevents creating new assignment. Please try again.'
                
                return Response({
                    'success': False,
                    'error': error_msg,
                    'debug_info': {
                        'constraint': 'idx_horse_assignment_active_kutsero',
                        'active_assignments': len(final_check.data) if final_check.data else 0
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response({
                    'success': False,
                    'error': f'Failed to create assignment: {str(insert_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # If we get here, assignment creation failed without exception
        return Response({
            'success': False,
            'error': 'Failed to create assignment record'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        print(f"🔴 ERROR in assign_horse_to_kutsero: {str(e)}")
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# Add a simple test endpoint to verify it's working
@api_view(['GET'])
def test_horse_owners_endpoint(request):
    """
    Test endpoint to verify the horse owners API is working
    """
    kutsero_id = request.GET.get("kutsero_id", "test_kutsero")
    
    return Response({
        'success': True,
        'message': f'Horse owners endpoint is working! kutsero_id: {kutsero_id}',
        'timestamp': datetime.now().isoformat(),
        'test_data': {
            'sample_owners': [
                {
                    'op_id': 'test_owner_1',
                    'name': 'Test Owner One',
                    'full_name': 'Test Owner One',
                    'email': 'test1@example.com',
                    'phone': '123-456-7890',
                    'address': '123 Test Street',
                    'total_horses': 3,
                    'has_pending_application': False,
                    'is_approved': False
                },
                {
                    'op_id': 'test_owner_2',
                    'name': 'Test Owner Two',
                    'full_name': 'Test Owner Two',
                    'email': 'test2@example.com',
                    'phone': '987-654-3210',
                    'address': '456 Test Avenue',
                    'total_horses': 2,
                    'has_pending_application': True,
                    'is_approved': False
                }
            ]
        }
    }, status=status.HTTP_200_OK)
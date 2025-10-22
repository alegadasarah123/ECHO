from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from datetime import datetime, date, time
from datetime import datetime, timedelta
from functools import wraps
from rest_framework import status
import jwt 
import uuid
import requests
import traceback
import json
import time
import random

# -------------------- SUPABASE CLIENT --------------------
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# -------------------- AUTH HELPERS --------------------
def get_token_from_cookie(request):
    """Return the JWT or access token from the HttpOnly cookie"""
    return request.COOKIES.get("access_token")

def login_required(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        token = get_token_from_cookie(request)
        if not token:
            return Response({"error": "Authentication required"}, status=401)
        return func(request, *args, **kwargs)
    return wrapper

# --------------- MESSAGES -------------------------
def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()
        except Exception as e:
            print(f"⚠️ Supabase query failed (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                raise

@api_view(["GET"])
@login_required
def get_all_users(request):
    """Fetch all approved users (from all profile tables) except the current vet"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ Step 1: Get all approved users except current vet
        users_res = safe_execute(
            supabase.table("users")
            .select("id, role, status")
            .eq("status", "approved")
            .neq("id", vet_id)
        )

        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        all_users = []
        role_groups = {}

        # ✅ Step 2: Group users by role
        for u in users:
            role_groups.setdefault(u["role"], []).append(u["id"])

        profiles_map = {}

        # 🩺 Veterinarian
        if "Veterinarian" in role_groups:
            ids = role_groups["Veterinarian"]
            res = safe_execute(
                supabase.table("vet_profile")
                .select("vet_id, vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .in_("vet_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                profiles_map[p["vet_id"]] = {
                    "name": f"{full_name} (Veterinarian)",
                    "avatar": p.get("vet_profile_photo")
                }

        # 🧑 Kutsero
        if "Kutsero" in role_groups:
            ids = role_groups["Kutsero"]
            res = safe_execute(
                supabase.table("kutsero_profile")
                .select("kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_image")
                .in_("kutsero_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                profiles_map[p["kutsero_id"]] = {
                    "name": f"{full_name} (Kutsero)",
                    "avatar": p.get("kutsero_image")
                }

        # 🐴 Horse Operator
        if "Horse Operator" in role_groups:
            ids = role_groups["Horse Operator"]
            res = safe_execute(
                supabase.table("horse_op_profile")
                .select("op_id, op_fname, op_mname, op_lname, op_image")
                .in_("op_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                profiles_map[p["op_id"]] = {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
                }

        # 🧑 Kutsero President (no image)
        if "Kutsero President" in role_groups:
            ids = role_groups["Kutsero President"]
            res = safe_execute(
                supabase.table("kutsero_pres_profile")
                .select("user_id, pres_fname, pres_lname")
                .in_("user_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("pres_fname"), p.get("pres_lname")])).strip()
                profiles_map[p["user_id"]] = {
                    "name": f"{full_name} (Kutsero President)",
                    "avatar": None
                }

        # 🧑 DVMF + DVMF-Admin (no image)
        for role_key in ["Dvmf", "Dvmf-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    supabase.table("dvmf_user_profile")
                    .select("dvmf_id, dvmf_fname, dvmf_lname")
                    .in_("dvmf_id", ids)
                )
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                    profiles_map[p["dvmf_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # 🎓 CTU Vetmed + CTU-Admin (no image)
        for role_key in ["Ctu-Vetmed", "Ctu-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    supabase.table("ctu_vet_profile")
                    .select("ctu_id, ctu_fname, ctu_lname")
                    .in_("ctu_id", ids)
                )
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                    profiles_map[p["ctu_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # ✅ Step 4: Merge user info
        for u in users:
            uid = u["id"]
            info = profiles_map.get(uid, {"name": f"Unknown ({u['role']})", "avatar": None})
            all_users.append({
                "id": uid,
                "name": info["name"],
                "role": u["role"],
                "avatar": info["avatar"]
            })

        return Response(all_users, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching users:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@login_required
def get_conversations(request):
    """
    Get all conversations for the current user (only users who have exchanged messages)
    """
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Get unique conversation partners
        conversation_partners = set()
        
        # Get users who sent messages to current vet
        received_res = safe_execute(
            supabase.table("message")
            .select("user_id")
            .eq("receiver_id", vet_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])
                
        # Get users who received messages from current vet
        sent_res = safe_execute(
            supabase.table("message")
            .select("receiver_id")
            .eq("user_id", vet_id)
        )
        if sent_res.data:
            for msg in sent_res.data:
                conversation_partners.add(msg["receiver_id"])

        if not conversation_partners:
            return Response([], status=status.HTTP_200_OK)

        # Get user details
        users_res = safe_execute(
            supabase.table("users")
            .select("id, role, status")
            .in_("id", list(conversation_partners))
            .eq("status", "approved")
        )
        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        conversations = []
        
        for user in users:
            user_id = user["id"]
            role = user["role"]
            
            # Get the latest message
            messages_res = safe_execute(
                supabase.table("message")
                .select("*")
                .or_(f"and(user_id.eq.{vet_id},receiver_id.eq.{user_id}),and(user_id.eq.{user_id},receiver_id.eq.{vet_id})")
                .order("mes_date", desc=True)
                .limit(1)
            )
            
            latest_message = messages_res.data[0] if messages_res.data else None
            
            # Count unread messages
            unread_res = safe_execute(
                supabase.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", vet_id)
                .eq("is_read", False)
            )
            unread_count = len(unread_res.data) if unread_res.data else 0
            
            # Get user profile info
            profile_info = get_user_profile_info(user_id, role)
            
            # Format timestamp
            timestamp = ""
            if latest_message and latest_message.get("mes_date"):
                try:
                    msg_time = datetime.fromisoformat(str(latest_message["mes_date"]))
                    local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
                    timestamp = local_time
                except Exception:
                    timestamp = str(latest_message["mes_date"])

            # ✅ CRITICAL FIX: Handle last message content with "You:" prefix
            last_message_content = ""
            last_message_is_own = False
            
            if latest_message:
                last_message_is_own = latest_message["user_id"] == vet_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"

            conversations.append({
                'id': user_id,
                'name': profile_info["name"],
                'role': role,
                'avatar': profile_info["avatar"],
                'online': False,
                'lastMessage': last_message_content,  # ✅ This now has "You:" prefix
                'lastMessageSender': latest_message["user_id"] if latest_message else None,
                'lastMessageIsOwn': last_message_is_own,  # ✅ Boolean for tracking
                'timestamp': timestamp,
                'unread': unread_count,
                'has_conversation': True
            })

        # Sort by latest message timestamp
        conversations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        return Response(conversations, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversations:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
def get_user_profile_info(user_id, role):
    """Helper function to get user profile info based on role"""
    try:
        # 🩺 Veterinarian
        if role == "Veterinarian":
            res = safe_execute(
                supabase.table("vet_profile")
                .select("vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .eq("vet_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                return {
                    "name": f"{full_name} (Veterinarian)",
                    "avatar": p.get("vet_profile_photo")
                }
                
        # 🧑 Kutsero
        elif role == "Kutsero":
            res = safe_execute(
                supabase.table("kutsero_profile")
                .select("kutsero_fname, kutsero_mname, kutsero_lname")
                .eq("kutsero_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                return {
                    "name": f"{full_name} (Kutsero)",
                    "avatar": None
                }
                
        # 🐴 Horse Operator
        elif role == "Horse Operator":
            res = safe_execute(
                supabase.table("horse_op_profile")
                .select("op_fname, op_mname, op_lname, op_image")
                .eq("op_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                return {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
                }
                
        # 🧑 Kutsero President
        elif role == "Kutsero President":
            res = safe_execute(
                supabase.table("kutsero_pres_profile")
                .select("pres_fname, pres_lname")
                .eq("user_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("pres_fname"), p.get("pres_lname")])).strip()
                return {
                    "name": f"{full_name} (Kutsero President)",
                    "avatar": None
                }
                
        # 🧑 DVMF
        elif role == "Dvmf":
            res = safe_execute(
                supabase.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {
                    "name": f"{full_name} (DVMF)",
                    "avatar": None
                }
                
        # 🧑 DVMF-Admin
        elif role == "Dvmf-Admin":
            res = safe_execute(
                supabase.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {
                    "name": f"{full_name} (DVMF Admin)",
                    "avatar": None
                }
                
        # 🎓 CTU Vetmed
        elif role == "Ctu-Vetmed":
            res = safe_execute(
                supabase.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {
                    "name": f"{full_name} (CTU Vetmed)",
                    "avatar": None
                }
                
        # 🎓 CTU-Admin
        elif role == "Ctu-Admin":
            res = safe_execute(
                supabase.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {
                    "name": f"{full_name} (CTU Admin)",
                    "avatar": None
                }
                
    except Exception as e:
        print(f"Error getting profile info for {user_id} ({role}): {e}")
    
    # Fallback for unknown roles or errors
    return {
        "name": f"User ({role})",
        "avatar": None
    }

LOCAL_OFFSET_HOURS = 8  # Manila is UTC+8

@api_view(["POST"])
@login_required
def send_message(request):
    """Send a message from the current vet to another user"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        receiver_id = data.get("receiver_id")
        message_content = data.get("message")

        if not receiver_id or not message_content:
            return Response({"error": "Missing receiver_id or message"}, status=status.HTTP_400_BAD_REQUEST)

        # Use UTC timestamp; Postgres timestamptz will store correctly
        payload = {
            "mes_content": message_content,
            "is_read": False,
            "user_id": vet_id,
            "receiver_id": receiver_id
        }

        res = supabase.table("message").insert(payload).execute()

        if not res.data:
            return Response({"error": "Failed to send message"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Format the timestamp for frontend
        msg = res.data[0]
        msg_time = datetime.fromisoformat(msg["mes_date"])
        msg["mes_date"] = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")

        return Response({"message": "Message sent successfully", "data": msg}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print("❌ Error sending message:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@login_required
def get_conversation(request, conversation_id):
    """Fetch all messages between the current vet and a specific user safely, showing only local time (AM/PM)"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        receiver_id = conversation_id

        # Fetch messages both ways
        data1 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", vet_id)
                 .eq("receiver_id", receiver_id)
                 .execute()).data or []

        data2 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", receiver_id)
                 .eq("receiver_id", vet_id)
                 .execute()).data or []

        all_messages = sorted(data1 + data2, key=lambda m: m["mes_date"])

        formatted_messages = []
        for msg in all_messages:
            msg_time = datetime.fromisoformat(msg["mes_date"])
            local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
            formatted_messages.append({
                "id": msg["mes_id"],
                "content": msg["mes_content"],
                "timestamp": local_time,
                "isOwn": msg["user_id"] == vet_id,
                "is_read": msg["is_read"],  # ✅ ADD THIS LINE - Include read status
                "originalTimestamp": msg["mes_date"],  # ✅ ADD THIS LINE - Include original timestamp
            })

        return Response(formatted_messages, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    


@api_view(["PUT"])
@login_required
def mark_messages_as_read(request, conversation_id):
    """Mark messages as read for a conversation"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f"🔔 Marking messages as read - vet_id: {vet_id}, conversation_id: {conversation_id}")

    
        res = (
            supabase.table("message")
            .update({"is_read": True})
            .eq("receiver_id", vet_id)
            .eq("user_id", conversation_id)
            .eq("is_read", False)
            .execute()
        )

        print(f"✅ Marked {len(res.data) if res.data else 0} messages as read")

        return Response({
            "message": "Messages marked as read",
            "updated_count": len(res.data) if res.data else 0
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error marking messages as read:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------- PROFILE -------------------------
def get_current_vet_id(request):
    """Extract current vet_id from access_token cookie"""
    access_token = request.COOKIES.get("access_token")
    if not access_token:
        return None
    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


@api_view(["GET"])
@login_required
def vet_profile(request):
    """Fetch the profile of the currently logged-in veterinarian"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("vet_profile").select("*").eq("vet_id", vet_id).execute()
        data = res.data or []

        if len(data) == 0:
            return Response({"error": "Profile not found"}, status=404)

        profile = data[0]

        # ✅ Safe full name
        full_name = " ".join(filter(None, [
            profile.get("vet_fname"),
            profile.get("vet_mname"),
            profile.get("vet_lname"),
        ])).strip()

        profile["full_name"] = full_name

        return Response({"profile": profile}, status=200)

    except Exception:
        # 🚫 No console print
        # ✅ Clean and safe response
        return Response({"error": "Internal server error"}, status=500)


@api_view(["PUT"])
@login_required
def update_vet_profile(request):
    """Update the profile data for the logged-in vet"""
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    update_data = request.data

    # Only allow updating certain fields
    allowed_fields = [
        "vet_fname", "vet_mname", "vet_lname", "vet_dob", "vet_sex",
        "vet_phone_num", "vet_email", "vet_province", "vet_city", 
        "vet_brgy", "vet_zipcode", "vet_specialization", "vet_org", 
        "vet_license_num", "vet_exp_yr"
    ]
    data_to_update = {k: v for k, v in update_data.items() if k in allowed_fields}

    if not data_to_update:
        return Response({"error": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)

    result = supabase.table("vet_profile").update(data_to_update).eq("vet_id", current_vet_id).execute()

    if not result.data:
        return Response({"error": "Failed to update profile"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"message": "Profile updated successfully", "profile": result.data[0]}, status=status.HTTP_200_OK)
    

# ---------------- UPDATE PROFILE PHOTO ----------------
@api_view(["PUT"])
@login_required
def update_profile_photo(request):
    """
    Update veterinarian profile photo:
    ✅ Validates file type & size
    ✅ Deletes old photo from Supabase storage ONLY if new image is provided
    ✅ Uploads new photo to 'vet_profile' bucket
    ✅ Updates database with new URL
    """
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # ---------------- Step 1: Validate incoming file ----------------
        profile_photo_file = request.FILES.get('profile_photo')
        if not profile_photo_file:
            return Response({"error": "No profile photo provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        if not profile_photo_file.content_type.startswith('image/'):
            return Response({"error": "File must be an image"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 5MB)
        if profile_photo_file.size > 5 * 1024 * 1024:
            return Response({"error": "File size must be less than 5MB"}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 2: Fetch old profile photo ----------------
        current_profile = supabase.table("vet_profile").select("vet_profile_photo").eq("vet_id", current_vet_id).execute()
        
        old_photo_url = None
        if current_profile.data and len(current_profile.data) > 0:
            old_photo_url = current_profile.data[0].get('vet_profile_photo')

        # ---------------- Step 3: Delete old photo ONLY if new image is provided ----------------
        if old_photo_url and profile_photo_file:  # Only delete if we have a new file
            try:
                old_filename = old_photo_url.split('/')[-1].split('?')[0]
                if old_filename and current_vet_id in old_filename:
                    sr_client.storage.from_("vet_profile").remove([old_filename])
                    print(f"[DEBUG] Deleted old profile photo: {old_filename}")
                else:
                    print(f"[DEBUG] Skipping deletion of default/placeholder image: {old_filename}")
            except Exception as e:
                print(f"[WARNING] Failed to delete old profile photo: {e}")

        # ---------------- Step 4: Upload new photo ----------------
        timestamp = int(datetime.now().timestamp())
        file_extension = profile_photo_file.name.split('.')[-1] if '.' in profile_photo_file.name else 'jpg'
        file_name = f"{current_vet_id}_profile_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

        file_content = profile_photo_file.read()

        upload_res = sr_client.storage.from_("vet_profile").upload(
            file_name,
            file_content,
            {"content-type": profile_photo_file.content_type}
        )

        # ---------------- Step 5: Get public URL ----------------
        public_url = sr_client.storage.from_("vet_profile").get_public_url(file_name)

        # ---------------- Step 6: Update DB record ----------------
        update_data = {"vet_profile_photo": public_url}
        result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()

        if not result.data:
            return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ---------------- Step 7: Success response ----------------
        return Response({
            "message": "Profile photo updated successfully",
            "profile_picture_url": public_url,
            "profile": result.data[0]
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Profile photo update failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ---------------- DELETE PROFILE PHOTO ----------------
@api_view(["DELETE"])
@login_required
def delete_profile_photo(request):
    """
    Delete veterinarian profile photo:
    ✅ Checks if user has a profile photo
    ✅ Deletes photo from Supabase storage
    ✅ Updates database to remove photo URL
    ✅ Returns success message
    """
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # ---------------- Step 1: Fetch current profile photo ----------------
        current_profile = supabase.table("vet_profile").select("vet_profile_photo").eq("vet_id", current_vet_id).execute()
        
        if not current_profile.data or len(current_profile.data) == 0:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        current_photo_url = current_profile.data[0].get('vet_profile_photo')
        
        # ---------------- Step 2: Check if there's a photo to delete ----------------
        if not current_photo_url:
            return Response({"error": "No profile photo to delete"}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 3: Extract filename and validate it's user's photo ----------------
        photo_filename = current_photo_url.split('/')[-1].split('?')[0]
        
        # Safety check: Only delete photos that belong to this user
        if not photo_filename or str(current_vet_id) not in photo_filename:
            print(f"[DEBUG] Skipping deletion - photo doesn't belong to user or is default: {photo_filename}")
            # Still update the database to remove the URL, but don't delete from storage
            update_data = {"vet_profile_photo": ""}
            result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()
            
            if not result.data:
                return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                "message": "Profile photo reference removed successfully",
                "profile": result.data[0]
            }, status=status.HTTP_200_OK)

        # ---------------- Step 4: Delete photo from Supabase storage ----------------
        try:
            delete_result = sr_client.storage.from_("vet_profile").remove([photo_filename])
            print(f"[DEBUG] Successfully deleted profile photo: {photo_filename}")
        except Exception as e:
            print(f"[WARNING] Failed to delete photo from storage: {e}")
            # Continue with database update even if storage deletion fails

        # ---------------- Step 5: Update database to remove photo URL ----------------
        update_data = {"vet_profile_photo": ""}
        result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()

        if not result.data:
            return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ---------------- Step 6: Success response ----------------
        return Response({
            "message": "Profile photo deleted successfully",
            "profile": result.data[0]
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Profile photo deletion failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- GET ALL RELEVANT APPOINTMENTS --------------------
@api_view(["GET"])
@login_required
def get_all_appointments(request):
    """
    Fetch all appointments for the logged-in veterinarian with statuses:
    approved, pending, declined, or cancelled, including horse and operator info.
    Dates are formatted as MM-DD-YYYY (numeric month-day-year).
    Includes operator profile image and names for initials fallback.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch appointments with statuses approved, pending, declined, or cancelled
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num,
                    op_image
                )
            )
            """
        ).eq("vet_id", vet_id).in_("app_status", ["approved", "pending", "declined", "cancelled"]).execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        formatted_appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname")
            ]))
            operator_phone = operator.get("op_phone_num", "")
            operator_profile_image = operator.get("op_image", "")

            try:
                app_date_obj = datetime.strptime(str(app.get("app_date")), "%Y-%m-%d")
                formatted_app_date = app_date_obj.strftime("%m-%d-%Y") 
            except Exception:
                formatted_app_date = str(app.get("app_date"))

            formatted_appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": formatted_app_date,
                "app_time": app.get("app_time"),
                "app_complain": app.get("app_complain"),
                "app_status": app.get("app_status"),
                "decline_reason": app.get("decline_reason", ""),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator_phone,
                "operator_profile_image": operator_profile_image,
                "operator_first_name": operator.get("op_fname", ""),
                "operator_last_name": operator.get("op_lname", ""),
            })

        return Response({"appointments": formatted_appointments}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
        
# -------------------- GET APPROVED APPOINTMENTS WITH FOLLOWUPS --------------------
@api_view(["GET"])
@login_required
def get_approved_appointments(request):
    """
    Returns all approved appointments for the logged-in veterinarian
    WITHOUT any follow-up data
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch approved appointments with horse details
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_id,
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num
                )
            )
            """
        ).eq("vet_id", vet_id).eq("app_status", "approved").execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname"),
            ])).strip()

            # Format the appointment date as MM-DD-YYYY
            try:
                app_date_obj = datetime.strptime(str(app.get("app_date")), "%Y-%m-%d")
                formatted_app_date = app_date_obj.strftime("%m-%d-%Y")
            except Exception:
                formatted_app_date = str(app.get("app_date"))

            # NO FOLLOW-UP LOGIC - just return appointment data
            appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": formatted_app_date,
                "app_time": app.get("app_time"),
                "app_complain": app.get("app_complain"),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator.get("op_phone_num", ""),
                "horse_id": horse.get("horse_id"),
            })

        return Response({"appointments": appointments}, status=200)

    except Exception as e:
        print(f"Error fetching appointments: {str(e)}")
        return Response({"error": str(e)}, status=500)
        
# -------------------- APPROVE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def approve_appointment(request, app_id):
    """
    Approve a pending appointment by updating its status to 'approved'.
    Only the vet assigned to the appointment can approve it.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to approve this appointment"}, status=403)

        # Only allow approval if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot approve an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status to approved
        update_res = supabase.table("appointment").update({"app_status": "approved"}).eq("app_id", app_id).execute()
        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment approved successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# -------------------- DECLINE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def decline_appointment(request, app_id):
    """
    Decline a pending appointment by updating its status to 'declined'.
    Only the vet assigned to the appointment can decline it.
    Expects JSON body: { "reason": "Vet reason or choice" }
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    reason = request.data.get("reason", "").strip()
    if not reason:
        return Response({"error": "Decline reason is required"}, status=400)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to decline this appointment"}, status=403)

        # Only allow declining if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot decline an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status and decline reason
        update_res = supabase.table("appointment").update({
            "app_status": "declined",
            "decline_reason": reason
        }).eq("app_id", app_id).execute()

        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment declined successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    


# -------------------- GET_APPOINTMENT_DETAILS TO INCLUDE MEDICAL RECORDS --------------------
@api_view(["GET"])
@login_required
def get_appointment_details(request, app_id):
    """Fetch appointment + horse + owner + med records"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_id,
                horse_name,
                horse_breed,
                horse_dob,
                horse_age,
                horse_sex,
                horse_weight,
                horse_height,
                horse_color,
                horse_image,
                horse_op_profile:op_id(
                    op_id,
                    op_fname,
                    op_mname,
                    op_lname,
                    op_dob,
                    op_sex,
                    op_phone_num,
                    op_email,
                    op_province,
                    op_city,
                    op_municipality,
                    op_brgy,
                    op_zipcode,
                    op_house_add
                )
            )
            """
        ).eq("app_id", app_id).eq("vet_id", vet_id).execute()

        data = res.data or []
        if len(data) == 0:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = data[0]
        horse = appointment.get("horse_profile", {}) or {}
        owner = horse.get("horse_op_profile", {}) or {}
        horse_id = horse.get("horse_id")

        # ✅ Safe date format
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str), "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str) if date_str else None

        horse_info = {
            "id": horse_id,
            "name": horse.get("horse_name"),
            "breed": horse.get("horse_breed"),
            "dob": format_date_mmddyyyy(horse.get("horse_dob")),
            "age": horse.get("horse_age"),
            "sex": horse.get("horse_sex"),
            "weight": horse.get("horse_weight"),
            "height": horse.get("horse_height"),
            "color": horse.get("horse_color"),
            "image": horse.get("horse_image"),
        }

        owner_info = {
            "id": owner.get("op_id"),
            "firstName": owner.get("op_fname"),
            "middleName": owner.get("op_mname"),
            "lastName": owner.get("op_lname"),
            "dob": format_date_mmddyyyy(owner.get("op_dob")),
            "sex": owner.get("op_sex"),
            "phone": owner.get("op_phone_num"),
            "email": owner.get("op_email"),
            "address": ", ".join(filter(None, [
                owner.get("op_house_add"),
                owner.get("op_brgy"),
                owner.get("op_municipality"),
                owner.get("op_city"),
                owner.get("op_province"),
                owner.get("op_zipcode"),
            ]))
        }

        # ✅ Medical Records
        med_res = supabase.table("horse_medical_record").select(
            """
            *,
            vet_profile:medrec_vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("medrec_horse_id", horse_id).order("medrec_date", desc=True).execute()

        med_data = med_res.data or []
        medical_records = []

        for record in med_data:
            vet = record.get("vet_profile", {}) or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname"),
            ])).strip()

            medical_records.append({
                "id": record.get("medrec_id"),
                "date": format_date_mmddyyyy(record.get("medrec_date")),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_body_temp"),
                "clinicalSigns": record.get("medrec_clinical_signs"),
                "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
                "labResult": record.get("medrec_lab_results"),
                "labImage": record.get("medrec_lab_img"),
                "diagnosis": record.get("medrec_diagnosis"),
                "prognosis": record.get("medrec_prognosis"),
                "recommendation": record.get("medrec_recommendation"),
                "veterinarian": vet_name or "Unknown Veterinarian"
            })

        return Response({
            "appointment": appointment,
            "horseInfo": horse_info,
            "ownerInfo": owner_info,
            "medicalRecords": medical_records
        }, status=200)

    except Exception:
        # 🚫 No console print
        # ✅ Clean response (safe for production)
        return Response({"error": "Internal server error"}, status=500)
    
# -------------------- CHECK HORSE ACCESS --------------------
@api_view(["GET"])
@login_required
def check_horse_access(request, horse_id):
    """
    Check if the logged-in vet has access to a horse's medical records.
    Returns:
        - has_access: True if access is approved
        - access_requested: True if a pending request exists
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Check if approved
        approved_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id)\
            .eq("vet_id", vet_id)\
            .eq("request_status", "approved")\
            .execute()

        # Check if pending request exists
        pending_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id)\
            .eq("vet_id", vet_id)\
            .eq("request_status", "pending")\
            .execute()

        return Response({
            "has_access": bool(approved_res.data),
            "access_requested": bool(pending_res.data)
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# -------------------- REQUEST ACCESS TO HORSE --------------------
@api_view(["POST"])
@login_required
def request_horse_access(request, horse_id):
    """
    Create a pending access request for the logged-in vet to a horse.
    Ensures:
        - No duplicate requests
        - Works even if the horse has no medical records yet
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        horse_id_str = str(horse_id)
        vet_id_str = str(vet_id)

        # Check if already approved
        approved_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id_str)\
            .eq("vet_id", vet_id_str)\
            .eq("request_status", "approved")\
            .execute()
        if approved_res.data:
            return Response({"detail": "Already has access"}, status=400)

        # Check if a pending request exists
        pending_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id_str)\
            .eq("vet_id", vet_id_str)\
            .eq("request_status", "pending")\
            .execute()
        if pending_res.data:
            return Response({"detail": "Access request already sent"}, status=400)

        # Insert new pending request
        new_request = {
            "request_id": str(uuid.uuid4()),
            "horse_id": horse_id_str,
            "vet_id": vet_id_str,
            "request_status": "pending",
            "requested_at": datetime.utcnow().isoformat()
        }

        insert_res = supabase.table("medrec_access_request").insert(new_request).execute()

        return Response({"message": "Access request sent"}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- GET HORSE DETAILS --------------------
@api_view(["GET"])
@login_required
def get_horse_details(request, horse_id):
    """
    Fetch detailed horse information including owner details.
    Used for medical records access.
    """
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"🐎 Fetching horse details for horse_id: {horse_id}")

        # Fetch horse details with owner information
        res = supabase.table("horse_profile").select(
            """
            *,
            horse_op_profile:op_id(
                op_id,
                op_fname,
                op_mname,
                op_lname,
                op_dob,
                op_sex,
                op_phone_num,
                op_email,
                op_province,
                op_city,
                op_municipality,
                op_brgy,
                op_zipcode,
                op_house_add
            )
            """
        ).eq("horse_id", horse_id).execute()

        if not res.data:
            return Response({"error": "Horse not found"}, status=404)

        horse_data = res.data[0]
        horse = horse_data.get("horse_profile", {}) or horse_data  # Handle nested structure
        owner = horse.get("horse_op_profile", {}) or {}

        # ✅ Safe date format
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str), "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str) if date_str else None

        # Format horse information
        horse_info = {
            "id": horse.get("horse_id"),
            "name": horse.get("horse_name"),
            "breed": horse.get("horse_breed"),
            "dob": format_date_mmddyyyy(horse.get("horse_dob")),
            "age": horse.get("horse_age"),
            "sex": horse.get("horse_sex"),
            "weight": horse.get("horse_weight"),
            "height": horse.get("horse_height"),
            "color": horse.get("horse_color"),
            "image": horse.get("horse_image"),
            "status": horse.get("horse_status"),
        }

        # Format owner information
        owner_info = {
            "id": owner.get("op_id"),
            "firstName": owner.get("op_fname"),
            "middleName": owner.get("op_mname"),
            "lastName": owner.get("op_lname"),
            "dob": format_date_mmddyyyy(owner.get("op_dob")),
            "sex": owner.get("op_sex"),
            "phone": owner.get("op_phone_num"),
            "email": owner.get("op_email"),
            "address": ", ".join(filter(None, [
                owner.get("op_house_add"),
                owner.get("op_brgy"),
                owner.get("op_municipality"),
                owner.get("op_city"),
                owner.get("op_province"),
                owner.get("op_zipcode"),
            ])),
            "province": owner.get("op_province"),
            "city": owner.get("op_city"),
            "municipality": owner.get("op_municipality"),
            "barangay": owner.get("op_brgy"),
            "zipcode": owner.get("op_zipcode"),
            "houseAddress": owner.get("op_house_add"),
        }

        return Response({
            "horse": horse_info,
            "owner": owner_info
        }, status=200)

    except Exception as e:
        print(f"❌ Error fetching horse details: {str(e)}")
        traceback.print_exc()
        return Response({"error": "Internal server error"}, status=500)
    
@api_view(["GET"])
@login_required
def get_horse_medical_records(request, horse_id):
    import traceback
    try:
        print("🐎 Fetching medical records for horse_id:", horse_id)
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("horse_medical_record").select(
            """
            *,
            vet_profile:medrec_vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("medrec_horse_id", horse_id).order("medrec_date", desc=True).execute()

        if hasattr(res, "error") and res.error:
            return Response({"error": str(res.error)}, status=500)

        formatted_records = []
        for record in res.data or []:
            vet = record.get("vet_profile") or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname")
            ])).strip() or "Unknown Veterinarian"

            # 🚨 FIXED: Handle ARRAY of lab image URLs
            lab_images = record.get("medrec_lab_img") or []
            processed_lab_images = []
            
            if isinstance(lab_images, list):
                for lab_image_url in lab_images:
                    if lab_image_url:
                        # If the URL doesn't have the full Supabase URL, construct it
                        if not lab_image_url.startswith(('http://', 'https://')):
                            # Extract filename from the URL if it's just a path
                            filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                            lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                        processed_lab_images.append(lab_image_url)
                print(f"[DEBUG] Found {len(processed_lab_images)} lab files: {processed_lab_images}")
            elif lab_images:  # Handle legacy single URL case
                lab_image_url = lab_images
                if not lab_image_url.startswith(('http://', 'https://')):
                    filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                    lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                processed_lab_images.append(lab_image_url)
                print(f"[DEBUG] Found single lab file: {processed_lab_images}")

            formatted_records.append({
                "id": record.get("medrec_id"),
                "date": record.get("medrec_date"),
                "followUpDate": record.get("medrec_followup_date"),
                "parentMedrecId": record.get("parent_medrec_id"),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_body_temp"),
                "clinicalSigns": record.get("medrec_clinical_signs"),
                "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
                "labResult": record.get("medrec_lab_results"),
                "labImages": processed_lab_images, 
                "diagnosis": record.get("medrec_diagnosis"),
                "prognosis": record.get("medrec_prognosis"),
                "recommendation": record.get("medrec_recommendation"),
                "horseStatus": record.get("medrec_horsestatus"),
                "veterinarian": vet_name,
            })

        return Response({"medicalRecords": formatted_records}, status=200)

    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
    
# -------------------- GET TREATMENT RECORDS FOR A HORSE --------------------
@api_view(["GET"])
@login_required
def get_horse_treatment_records(request, horse_id):
    import traceback

    try:
        print("💊 Fetching ONLY treatment records for horse_id:", horse_id)

        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Step 1: Fetch medrec_ids for this horse WITH DATE
        medrec_res = supabase.table("horse_medical_record") \
            .select("medrec_id, medrec_diagnosis, medrec_date") \
            .eq("medrec_horse_id", horse_id) \
            .execute()

        if hasattr(medrec_res, "error") and medrec_res.error:
            print("🔥 Error fetching medrec_ids:", medrec_res.error)
            return Response({"error": str(medrec_res.error)}, status=500)

        # Map medrec_id → diagnosis + date
        medrec_map = {
            row["medrec_id"]: {
                "diagnosis": row.get("medrec_diagnosis"),
                "date": row.get("medrec_date")
            }
            for row in (medrec_res.data or [])
        }

        medrec_ids = list(medrec_map.keys())
        print("📋 Found medrec_ids with diagnosis and date:", medrec_map)

        if not medrec_ids:
            return Response({"treatmentRecords": []}, status=200)

        # Step 2: Fetch treatments linked to those medrec_ids
        res = supabase.table("horse_treatment").select(
            """
            treatment_id,
            medrec_id,
            treatment_name,
            treatment_dosage,
            treatment_duration,
            treatment_outcome
            """
        ).in_("medrec_id", medrec_ids).order("treatment_id", desc=True).execute()

        if hasattr(res, "error") and res.error:
            print("🔥 Supabase error fetching treatments:", res.error)
            return Response({"error": str(res.error)}, status=500)

        treatments = []
        for t in res.data or []:
            medrec_info = medrec_map.get(t.get("medrec_id"), {})
            treatments.append({
                "id": t.get("treatment_id"),
                "medrecId": t.get("medrec_id"),
                "diagnosis": medrec_info.get("diagnosis"),
                "date": medrec_info.get("date"), 
                "medication": t.get("treatment_name"),
                "dosage": t.get("treatment_dosage"),
                "duration": t.get("treatment_duration"),
                "outcome": t.get("treatment_outcome"),
            })

        print("✅ Returning treatments:", treatments)
        return Response({"treatmentRecords": treatments}, status=200)

    except Exception as e:
        print("🔥 Exception in get_horse_treatment_records:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@login_required
def add_medical_record(request):
    try:
        print(f"🚨 [DEBUG] Starting medical record creation - SINGLE REQUEST")
        
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        horse_id = request.POST.get("horse_id")
        app_id = request.POST.get("app_id")

        # 🧠 Utility: safely handle empty/nullable inputs
        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # 🆕 Fields
        horse_status = safe_get("healthStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        # ✅ Validate
        if not horse_id or not app_id:
            return Response({"error": "Missing horse_id or app_id"}, status=400)

        # 🚨 DUPLICATE CHECK: Check if we already processed this request
        today = date.today().isoformat()
        existing = supabase.table("horse_medical_record").select("medrec_id").eq(
            "medrec_horse_id", horse_id
        ).eq("medrec_vet_id", vet_id).eq("medrec_date", today).execute()
        
        if existing.data:
            print(f"🚨 [DEBUG] DUPLICATE DETECTED: Record already exists for today")
            return Response({"error": "Medical record for this horse already created today"}, status=400)

        # ---------------- Handle Multiple Lab Files Upload ----------------
        lab_files_urls = []
        
        # Handle multiple files from FormData
        lab_files = request.FILES.getlist('lab_files')
        
        print(f"[DEBUG] Number of lab files received: {len(lab_files)}")
        
        for lab_file in lab_files:
            try:
                import datetime
                import random
                
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_file.name.split('.')[-1] if '.' in lab_file.name else 'bin'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
                # Upload the file
                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {"content-type": lab_file.content_type, "x-upsert": "true"}
                )

                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                
                if '?' in public_url:
                    public_url = public_url.split('?')[0]
                    
                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab file uploaded: {public_url}")
                
            except Exception as e:
                import logging
                logging.exception(f"Lab file upload failed: {e}")
                continue

        # Also handle base64 images for backward compatibility
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab_image.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64
                
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_image_name.split('.')[-1] if '.' in lab_image_name else 'jpg'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
                file_content = base64.b64decode(lab_image_base64)
                
                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    file_content,
                    {"content-type": lab_image_type, "x-upsert": "true"}
                )

                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                
                if '?' in public_url:
                    public_url = public_url.split('?')[0]
                    
                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab image uploaded via base64: {public_url}")
            except Exception as e:
                import logging
                logging.exception(f"Lab image base64 upload failed: {e}")

        # If no files were uploaded, set to None instead of empty array
        final_lab_files = lab_files_urls if lab_files_urls else None

        # 🚨 CREATE ONLY ONE RECORD
        medrec_id = str(uuid.uuid4())
        record_data = {
            "medrec_id": medrec_id,
            "medrec_horse_id": horse_id,
            "medrec_vet_id": vet_id,
            "medrec_date": safe_get("date") or today,
            "medrec_followup_date": followup_date,
            "medrec_heart_rate": safe_get("heartRate"),
            "medrec_resp_rate": safe_get("respRate"),
            "medrec_body_temp": safe_get("temperature"),
            "medrec_clinical_signs": safe_get("clinicalSigns"),
            "medrec_diagnostic_protocol": safe_get("diagnosticProtocol"),
            "medrec_lab_results": safe_get("labResult"),
            "medrec_lab_img": final_lab_files,
            "medrec_diagnosis": safe_get("diagnosis"),
            "medrec_prognosis": safe_get("prognosis"),
            "medrec_recommendation": safe_get("recommendation"),
            "medrec_horsestatus": horse_status,
        }

        print(f"✅ [DEBUG] Creating ONE medical record with ID: {medrec_id}")

        # ✅ Insert medical record - ONLY ONCE
        medrec_res = supabase.table("horse_medical_record").insert(record_data).execute()
        if not medrec_res.data:
            return Response({"error": "Failed to add medical record"}, status=500)

        # 2️⃣ Sync horse_profile.horse_status with medrec_horsestatus
        if horse_status:
            supabase.table("horse_profile").update({
                "horse_status": horse_status
            }).eq("horse_id", horse_id).execute()

        # 3️⃣ Handle treatments (JSON array inside FormData)
        treatments_raw = safe_get("treatments")
        treatment_records = []

        if treatments_raw:
            try:
                treatments = json.loads(treatments_raw)
                for t in treatments:
                    treatment_records.append({
                        "treatment_id": str(uuid.uuid4()),
                        "medrec_id": medrec_id,
                        "treatment_name": t.get("name") or t.get("medication"),
                        "treatment_dosage": t.get("dosage"),
                        "treatment_duration": t.get("duration"),
                        "treatment_outcome": t.get("outcome"),
                    })

                if treatment_records:
                    supabase.table("horse_treatment").insert(treatment_records).execute()

            except Exception as e:
                return Response({"error": f"Invalid treatments JSON: {str(e)}"}, status=400)

        print(f"🎉 [DEBUG] SUCCESS: Created medical record {medrec_id}")

        # ✅ Success Response
        return Response(
            {
                "message": "Medical record added successfully",
                "medrec_id": medrec_id,
                "treatments": treatment_records,
                "horse_status": horse_status,
                "lab_files_urls": lab_files_urls,
                "followup_time": followup_time,
            },
            status=201,
        )

    except Exception as e:
        print(f"❌ [DEBUG] ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)
        
# -------------------- CREATE FOLLOW-UP MEDICAL RECORD --------------------
# -------------------- CREATE FOLLOW-UP RECORD --------------------
@api_view(["POST"])
@login_required
def create_followup_record(request):
    try:
        print("🚨 [DEBUG] Starting follow-up record creation")

        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        horse_id = request.POST.get("horseId")
        previous_record_id = request.POST.get("previousRecordId")
        schedule_id = request.POST.get("scheduleId")

        # 🧠 Utility: safely handle empty/nullable inputs
        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # 🆕 Fields for follow-up
        horse_status = safe_get("horseStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        # ✅ Validate required fields
        if not horse_id or not previous_record_id:
            return Response({"error": "Missing horse_id or previous_record_id"}, status=400)

        # ---------------- Handle Multiple Lab Files Upload ----------------
        lab_files_urls = []
        lab_files = request.FILES.getlist('lab_files')
        print(f"[DEBUG] Number of lab files received: {len(lab_files)}")

        for lab_file in lab_files:
            try:
                import datetime, random

                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_file.name.split('.')[-1] if '.' in lab_file.name else 'bin'
                file_name = f"{horse_id}_followup_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

                # Upload to Supabase
                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {"content-type": lab_file.content_type, "x-upsert": "true"}
                )

                # Build public URL manually
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if '?' in public_url:
                    public_url = public_url.split('?')[0]

                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab file uploaded: {public_url}")

            except Exception as e:
                import logging
                logging.exception(f"Lab file upload failed: {e}")
                continue

        # ---------------- Handle Base64 Image Upload (Optional) ----------------
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab_image.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64, datetime, random

                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_image_name.split('.')[-1] if '.' in lab_image_name else 'jpg'
                file_name = f"{horse_id}_followup_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

                file_content = base64.b64decode(lab_image_base64)

                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    file_content,
                    {"content-type": lab_image_type, "x-upsert": "true"}
                )

                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if '?' in public_url:
                    public_url = public_url.split('?')[0]

                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab image uploaded via base64: {public_url}")
            except Exception as e:
                import logging
                logging.exception(f"Lab image base64 upload failed: {e}")

        # Final combined file list
        final_lab_files = lab_files_urls if lab_files_urls else None

        # ---------------- Create Follow-up Medical Record ----------------
        medrec_id = str(uuid.uuid4())
        record_data = {
            "medrec_id": medrec_id,
            "medrec_horse_id": horse_id,
            "medrec_vet_id": vet_id,
            "medrec_date": date.today().isoformat(),
            "medrec_followup_date": followup_date,
            "medrec_followup_time": followup_time,
            "medrec_heart_rate": safe_get("heartRate"),
            "medrec_resp_rate": safe_get("respRate"),
            "medrec_body_temp": safe_get("temperature"),
            "medrec_clinical_signs": safe_get("clinicalSigns"),
            "medrec_diagnostic_protocol": safe_get("diagnosticProtocol"),
            "medrec_lab_results": safe_get("labResult"),
            "medrec_lab_img": final_lab_files,
            "medrec_diagnosis": safe_get("diagnosis"),
            "medrec_prognosis": safe_get("prognosis"),
            "medrec_recommendation": safe_get("recommendation"),
            "medrec_horsestatus": horse_status,
            "parent_medrec_id": previous_record_id,  # link to original record
        }

        print(f"✅ [DEBUG] Creating follow-up medical record with ID: {medrec_id}")

        medrec_res = supabase.table("horse_medical_record").insert(record_data).execute()
        if not medrec_res.data:
            return Response({"error": "Failed to add follow-up record"}, status=500)

        # ---------------- Update Horse Status ----------------
        if horse_status:
            supabase.table("horse_profile").update({
                "horse_status": horse_status
            }).eq("horse_id", horse_id).execute()

        # ---------------- Handle New Treatments ----------------
        treatments_raw = safe_get("treatments")
        treatment_records = []

        if treatments_raw:
            try:
                treatments = json.loads(treatments_raw)
                for t in treatments:
                    treatment_records.append({
                        "treatment_id": str(uuid.uuid4()),
                        "medrec_id": medrec_id,
                        "treatment_name": t.get("medication"),
                        "treatment_dosage": t.get("dosage"),
                        "treatment_duration": t.get("duration"),
                        "treatment_outcome": t.get("outcome", "ongoing"),
                    })
                if treatment_records:
                    supabase.table("horse_treatment").insert(treatment_records).execute()
            except Exception as e:
                print(f"⚠️ Failed to process treatments: {e}")

        # ---------------- Update Existing Treatment Outcomes ----------------
        treatment_outcomes_raw = safe_get("treatmentOutcomes")
        if treatment_outcomes_raw:
            try:
                treatment_outcomes = json.loads(treatment_outcomes_raw)
                for treatment_id, outcome in treatment_outcomes.items():
                    supabase.table("horse_treatment").update({
                        "treatment_outcome": outcome
                    }).eq("treatment_id", treatment_id).execute()
            except Exception as e:
                print(f"⚠️ Failed to update treatment outcomes: {e}")

        # ---------------- Update Schedule Availability ----------------
        if schedule_id:
            try:
                supabase.table("schedule_slots").update({
                    "available": False
                }).eq("id", schedule_id).execute()
            except Exception as e:
                print(f"⚠️ Failed to update schedule availability: {e}")

        print(f"🎉 [DEBUG] SUCCESS: Created follow-up record {medrec_id}")

        # ✅ Success Response
        return Response({
            "message": "Follow-up record created successfully",
            "medrec_id": medrec_id,
            "lab_files_urls": lab_files_urls,
            "treatments_added": len(treatment_records),
            "horse_status": horse_status,
            "followup_date": followup_date,
            "followup_time": followup_time,
        }, status=201)

    except Exception as e:
        import logging
        logging.exception("❌ Error in create_followup_record")
        return Response({"error": str(e)}, status=500)

# -------------------- UPDATE TREATMENT OUTCOME --------------------
@api_view(["PATCH"])
@login_required
def update_treatment_outcome(request, treatment_id):
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Get the outcome from request data
        outcome = request.data.get('outcome')
        
        if not outcome:
            return Response({"error": "Outcome is required"}, status=400)

        # Validate outcome value
        valid_outcomes = ['ongoing', 'completed', 'discontinued', 'cancelled']
        if outcome not in valid_outcomes:
            return Response({"error": f"Invalid outcome. Must be one of: {', '.join(valid_outcomes)}"}, status=400)

        # Update the treatment outcome
        update_res = supabase.table("horse_treatment").update({
            "treatment_outcome": outcome,
            "updated_at": datetime.datetime.now().isoformat()
        }).eq("treatment_id", treatment_id).execute()

        if not update_res.data:
            return Response({"error": "Treatment not found or update failed"}, status=404)

        return Response(
            {
                "message": "Treatment outcome updated successfully",
                "treatment_id": treatment_id,
                "outcome": outcome
            },
            status=200
        )

    except Exception as e:
        import logging
        logging.exception(f"Error updating treatment outcome for {treatment_id}")
        return Response({"error": str(e)}, status=500)
    
# -------------------- UPDATE MEDICAL RECORD (SUPABASE) --------------------
@api_view(["POST"])
@login_required
def update_medical_record(request):
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        medrec_id = request.POST.get("medrec_id")
        if not medrec_id:
            return Response({"error": "Missing medrec_id"}, status=400)

        # 1️⃣ Prepare update fields
        update_data = {
            "medrec_date": request.POST.get("date"),
            "medrec_heart_rate": request.POST.get("heartRate"),
            "medrec_resp_rate": request.POST.get("respRate"),
            "medrec_body_temp": request.POST.get("temperature"),
            "medrec_clinical_signs": request.POST.get("clinicalSigns"),
            "medrec_diagnostic_protocol": request.POST.get("diagnosticProtocol"),
            "medrec_lab_results": request.POST.get("labResult"),
            "medrec_diagnosis": request.POST.get("diagnosis"),
            "medrec_prognosis": request.POST.get("prognosis"),
            "medrec_recommendation": request.POST.get("recommendation"),
        }

        # remove None values (so we don’t overwrite with nulls)
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # ✅ update the record
        medrec_res = (
            supabase.table("horse_medical_record")
            .update(update_data)
            .eq("medrec_id", medrec_id)
            .execute()
        )

        if not medrec_res.data:
            return Response({"error": "Failed to update medical record"}, status=500)

        # 2️⃣ Handle treatments (if provided)
        treatments_raw = request.POST.get("treatments")
        updated_treatments = []
        if treatments_raw:
            try:
                treatments = json.loads(treatments_raw)
                for t in treatments:
                    if "treatment_id" in t:
                        # update existing treatment
                        supabase.table("horse_treatment").update({
                            "treatment_name": t.get("name") or t.get("medication"),
                            "treatment_dosage": t.get("dosage"),
                            "treatment_duration": t.get("duration"),
                            "followup_date": t.get("followUpDate"),
                            "treatment_outcome": t.get("outcome"),
                        }).eq("treatment_id", t["treatment_id"]).execute()
                    else:
                        # insert new treatment
                        new_treat = {
                            "treatment_id": str(uuid.uuid4()),
                            "medrec_id": medrec_id,
                            "treatment_name": t.get("name") or t.get("medication"),
                            "treatment_dosage": t.get("dosage"),
                            "treatment_duration": t.get("duration"),
                            "followup_date": t.get("followUpDate"),
                            "treatment_outcome": t.get("outcome"),
                        }
                        supabase.table("horse_treatment").insert(new_treat).execute()
                        updated_treatments.append(new_treat)

            except Exception as e:
                return Response({"error": f"Invalid treatments JSON: {str(e)}"}, status=400)

        return Response(
            {
                "message": "Medical record updated successfully",
                "medrec_id": medrec_id,
                "updated_treatments": updated_treatments,
            },
            status=200,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# -------------------- ADD VET SCHEDULE --------------------
def convert_to_24h(time_str):
    """
    Convert 'HH:MM AM/PM' to 'HH:MM' in 24-hour format.
    """
    import datetime
    return datetime.datetime.strptime(time_str, "%I:%M %p").strftime("%H:%M")

@api_view(["POST"])
@login_required
def add_schedule(request):
    """
    Save vet availability schedule (multiple dates, multiple slots per date).
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedules = request.data.get("schedules", [])
    if not schedules:
        return Response({"error": "No schedules provided"}, status=400)

    try:
        entries = []
        for sched in schedules:
            date = sched.get("date")
            start_time = sched.get("startTime")
            end_time = sched.get("endTime")
            
            if not date or not start_time or not end_time:
                continue  # skip invalid entries

            # Convert AM/PM to 24-hour format
            start_time_24 = convert_to_24h(start_time)
            end_time_24 = convert_to_24h(end_time)

            # Insert into vet_schedule
            res = supabase.table("vet_schedule").insert({
                "sched_id": str(uuid.uuid4()),
                "vet_id": vet_id,
                "sched_date": date,
                "start_time": start_time_24,
                "end_time": end_time_24,
                "is_available": True
            }).execute()

            if res.data:
                entries.append(res.data[0])

        if not entries:
            return Response({"error": "No valid schedules to add"}, status=400)

        return Response({"message": "Schedules added", "schedules": entries}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- GET VET SCHEDULES --------------------
def convert_to_ampm(time_val):
    """
    Convert time value to 'HH:MM AM/PM'.
    Accepts either string ('HH:MM:SS') or datetime.time object.
    """
    try:
        if isinstance(time_val, str):
            parts = time_val.split(":")[0:2]
            time_str = ":".join(parts)
            dt = datetime.strptime(time_str, "%H:%M")
        elif isinstance(time_val, time):
            dt = datetime.combine(date.today(), time_val)
        else:
            print(f"convert_to_ampm: Unexpected type {type(time_val)}")
            return str(time_val)
        return dt.strftime("%I:%M %p")
    except Exception as e:
        print(f"Error converting time: {time_val}, Exception: {e}")
        return str(time_val)
            
@api_view(["GET"])
@login_required
def get_schedules(request):
    """
    Get all schedules for the logged-in vet.
    Returns a list of schedules with date and time (AM/PM), sorted by date.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch all schedules for this vet, ordered by sched_date
        res = supabase.table("vet_schedule")\
            .select("sched_date, start_time, end_time, is_available")\
            .eq("vet_id", vet_id)\
            .order("sched_date")\
            .execute()

        print("Raw data from Supabase:", res.data)  # DEBUG

        schedules = res.data or []

        formatted_schedules = []
        for s in schedules:
            try:
                formatted_schedules.append({
                    "date": s["sched_date"],
                    "startTime": convert_to_ampm(s["start_time"]),
                    "endTime": convert_to_ampm(s["end_time"]),
                    "is_available": s.get("is_available", True)
                })
            except Exception as e:
                print("Error formatting schedule:", s, e)
                traceback.print_exc()

        return Response({"schedules": formatted_schedules}, status=200)

    except Exception as e:
        print("Unexpected error in get_schedules:", e)
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
    

@api_view(["PUT"])
@login_required
def update_schedule_availability(request):
    """
    Update schedule availability status.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedule_id = request.data.get("schedule_id")
    is_available = request.data.get("is_available", False)

    if not schedule_id:
        return Response({"error": "Schedule ID is required"}, status=400)

    try:
        # Verify the schedule belongs to the current vet
        schedule_res = supabase.table("vet_schedule").select("*").eq("sched_id", schedule_id).eq("vet_id", vet_id).execute()
        
        if not schedule_res.data:
            return Response({"error": "Schedule not found or access denied"}, status=404)

        # Update availability
        update_res = supabase.table("vet_schedule").update({
            "is_available": is_available
        }).eq("sched_id", schedule_id).execute()

        if update_res.data:
            return Response({
                "message": "Schedule availability updated successfully",
                "schedule_id": schedule_id,
                "is_available": is_available
            }, status=200)
        else:
            return Response({"error": "Failed to update schedule availability"}, status=500)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- HELPER --------------------
def convert_to_ampm(time_val):
    """
    Convert time value to 'HH:MM AM/PM'.
    Accepts either string ('HH:MM:SS') or datetime.time object.
    """
    try:
        if isinstance(time_val, str):
            parts = time_val.split(":")[0:2]  # drop seconds if present
            time_str = ":".join(parts)
            dt = datetime.strptime(time_str, "%H:%M")
        elif isinstance(time_val, time):
            dt = datetime.combine(date.today(), time_val)
        else:
            return str(time_val)
        return dt.strftime("%I:%M %p")
    except Exception:
        return str(time_val)


@api_view(["GET"])
@login_required
def get_all_schedules(request):
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    def safe_query(fn, retries=3, delay=0.5):
        """Retry supabase query to avoid connection termination."""
        for attempt in range(retries):
            try:
                return fn()
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(delay)
                    continue
                raise e

    try:
        # ✅ Fetch all schedules for this vet
        res = safe_query(lambda: supabase.table("vet_schedule")
            .select("sched_id, sched_date, start_time, end_time, is_available")
            .eq("vet_id", vet_id)
            .order("sched_date")
            .execute()
        )

        schedules = res.data or []
        now = datetime.now()
        schedule_slots = []

        for s in schedules:
            sched_date = s.get("sched_date")
            start_time_val = s.get("start_time")
            end_time_val = s.get("end_time")

            # Skip past schedules
            try:
                sched_datetime = datetime.combine(
                    datetime.strptime(sched_date, "%Y-%m-%d").date(),
                    datetime.strptime(start_time_val, "%H:%M:%S").time()
                )
                if sched_datetime < now:
                    continue
            except Exception:
                continue

            # ✅ Fetch appointment linked to schedule
            app_res = safe_query(lambda: supabase.table("appointment")
                .select("app_service, app_status, horse_id")
                .eq("sched_id", s.get("sched_id"))
                .execute()
            )

            appointment = app_res.data[0] if app_res.data else None

            operator_name = None
            is_available = s.get("is_available", True)
            is_pending = False

            if appointment:
                status = appointment.get("app_status")
                if status in ["declined", "cancelled"]:
                    is_available = True
                    is_pending = False
                else:
                    is_available = False
                    is_pending = (status == "pending")

                if status not in ["declined", "cancelled"]:
                    horse_res = safe_query(lambda: supabase.table("horse_profile")
                        .select("op_id")
                        .eq("horse_id", appointment.get("horse_id"))
                        .execute()
                    )
                    horse_data = horse_res.data[0] if horse_res.data else None
                    if horse_data:
                        op_res = safe_query(lambda: supabase.table("horse_op_profile")
                            .select("op_fname, op_lname")
                            .eq("op_id", horse_data.get("op_id"))
                            .execute()
                        )
                        op_data = op_res.data[0] if op_res.data else None
                        if op_data:
                            operator_name = f"{op_data.get('op_fname')} {op_data.get('op_lname')}"

            schedule_slots.append({
                "id": s.get("sched_id"),
                "date": sched_date,
                "startTime": convert_to_ampm(start_time_val),
                "endTime": convert_to_ampm(end_time_val),
                "available": is_available,
                "pending": is_pending,
                "operator_name": operator_name,
            })

        return Response({"schedule_slots": schedule_slots}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)            
# -------------------- GET ALL MEDICAL RECORDS ACCESSIBLE TO VET --------------------
@api_view(["GET"])
@login_required
def get_medrec_access(request):
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Helper to format date to MM-DD-YYYY
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str)[:10] if date_str else None

        # Step 1: Get all access requests for this vet
        res = supabase.table("medrec_access_request").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                op_id
            )
            """
        ).eq("vet_id", vet_id).order("requested_at", desc=True).execute()

        if not res.data:
            return Response({"records": []}, status=200)

        records = []
        for req in res.data:
            horse = req.get("horse_profile") or {}
            owner_name = "Unknown Owner"

            # Step 2: Fetch owner info if op_id exists
            op_id = horse.get("op_id")
            if op_id:
                owner_res = supabase.table("horse_op_profile").select("*").eq("op_id", op_id).execute()
                owner = owner_res.data[0] if owner_res.data else {}
                owner_name = " ".join(filter(None, [
                    owner.get("op_fname"),
                    owner.get("op_mname"),
                    owner.get("op_lname")
                ])).strip() or "Unknown Owner"

            records.append({
                "id": str(req.get("request_id")),
                "horseId": str(req.get("horse_id")),
                "horseName": horse.get("horse_name"),
                "horseBreed": horse.get("horse_breed"),
                "horseAge": horse.get("horse_age"),
                "ownerName": owner_name,
                "accessDate": format_date_mmddyyyy(req.get("requested_at")),
                "status": req.get("request_status"),
                "approvedAt": format_date_mmddyyyy(req.get("approved_at")),
                "approvedBy": str(req.get("approved_by")) if req.get("approved_by") else None,
                "note": req.get("note")
            })

        return Response({"records": records}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


#-----------------CHANGE PASSWORD-------------------------
@api_view(["POST"])
@login_required
def change_password(request):
    """
    Change the password for the logged-in Kutsero President
    """
    try:
        # Get JWT token from cookies
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # Get current and new passwords from request
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Fetch the user's email from Supabase Admin API
        user_info = supabase.auth.admin.get_user_by_id(user_id)
        if not user_info.user or not user_info.user.email:
            return Response({"error": "Unable to fetch user email."}, status=500)

        vet_email = user_info.user.email

        # ✅ Verify current password using Supabase REST endpoint with SERVICE_ROLE_KEY
        resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            },
            json={"email": vet_email, "password": current_password}
        )
        verify_data = resp.json()
        if resp.status_code != 200 or "access_token" not in verify_data:
            return Response({"errors": {"current_password": "Incorrect current password"}}, status=400)

        # ✅ Update password using Admin API
        supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})

        return Response({"message": "Password updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)

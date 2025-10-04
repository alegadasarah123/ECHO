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
from datetime import datetime, timezone
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


logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

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
    
# ------------------------------------------------ HORSE ASSIGNMENT API ------------------------------------------------

@api_view(['GET'])
def available_horses(request):
    """
    Get all horses with their op info for horse selection
    """
    op_id = request.GET.get("op_id")
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())
        
        # Get all horses
        horses_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, op_id"
        ).execute()
        
        if not horses_response.data:
            return Response({
                'horses': [],
                'total_count': 0,
                'available_count': 0,
                'assigned_count': 0
            }, status=status.HTTP_200_OK)
        
        # Get all ops from horse_op_profile table
        ops_response = service_client.table("horse_op_profile").select(
            "op_id, op_fname, op_lname"
        ).execute()
        
        # Get all active assignments (where date_end is null - meaning kutsero hasn't checked out yet)
        active_assignments_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, kutsero_id, date_start, date_end"
        ).is_("date_end", "null").execute()  # Only get assignments without check-out date
        
        # Create lookup dictionaries
        ops_dict = {}
        if ops_response.data:
            ops_dict = {op['op_id']: op for op in ops_response.data}
        
        assignments_dict = {}
        if active_assignments_response.data:
            assignments_dict = {assign['horse_id']: assign for assign in active_assignments_response.data}
        
        # Transform data
        horses = []
        for horse in horses_response.data:
            # Get op info
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
                    else:
                        op_name = "Unnamed Op"
                else:
                    op_name = "Op Not Found"
            else:
                op_name = "No Op Assigned"
            
            # Check assignment status
            assignment = assignments_dict.get(horse['horse_id'])
            if assignment:
                assignment_status = 'assigned'
                health_status = 'Under Care'
                status_text = 'Currently assigned'
                current_assignment_id = assignment['assign_id']
                assignment_start = assignment['date_start']  # This is check-in date
                assignment_end = assignment['date_end']      # This will be null until check-out
            else:
                assignment_status = 'available'
                health_status = 'Healthy'
                status_text = 'Ready for work'
                current_assignment_id = None
                assignment_start = None
                assignment_end = None
            
            horses.append({
                'id': horse['horse_id'],
                'name': horse['horse_name'] or 'Unnamed Horse',
                'breed': horse['horse_breed'] or 'Mixed Breed',
                'age': horse['horse_age'] or 5,
                'color': horse['horse_color'] or 'Brown',
                'image': horse['horse_image'],
                'healthStatus': health_status,
                'status': status_text,
                'opName': op_name,
                'assignmentStatus': assignment_status,
                'currentAssignmentId': current_assignment_id,
                'checkedInAt': assignment_start,      # Changed naming for clarity
                'checkedOutAt': assignment_end,       # Changed naming for clarity
                'lastCheckup': f"{((datetime.now() - datetime(2024, 5, 25)).days)} days ago",
                'nextCheckup': "June 15, 2025"
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


# ------------------------------------------------ FEED MANAGEMENT API ------------------------------------------------
def validate_time_format(time_str):
    """Validate time format HH:MM AM/PM"""
    if not time_str:
        return False
    
    # Pattern for HH:MM AM/PM format
    pattern = r'^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$'
    return bool(re.match(pattern, time_str.strip(), re.IGNORECASE))

@api_view(['GET'])
def get_feeding_schedule(request):
    """Get feeding schedule for a specific horse and user"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Query using Supabase client
        response = supabase.table('feed_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .execute()
        
        # Sort by meal type order
        meals = response.data if response.data else []
        meal_order = {'Breakfast': 1, 'Lunch': 2, 'Dinner': 3}
        sorted_meals = sorted(meals, key=lambda x: meal_order.get(x.get('fd_meal_type', ''), 4))
        
        return Response({
            'success': True,
            'data': sorted_meals
        })
        
    except Exception as e:
        print(f"Error in get_feeding_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def update_feeding_schedule(request):
    """Update or create feeding schedule entry"""
    try:
        print(f"Request data: {request.data}")
        
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        fd_id = request.data.get('fd_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Required fields
        required_fields = ['fd_meal_type', 'fd_food_type', 'fd_qty', 'fd_time']
        missing_fields = [field for field in required_fields if field not in request.data or not request.data[field]]
        
        if missing_fields:
            return Response({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate time format
        time_str = request.data['fd_time']
        if not validate_time_format(time_str):
            return Response({
                'success': False,
                'error': 'Invalid time format. Use HH:MM AM/PM'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate amount is not empty
        if not str(request.data['fd_qty']).strip():
            return Response({
                'success': False,
                'error': 'Feed quantity cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prepare feed data with proper data types
        feed_data = {
            'fd_meal_type': str(request.data['fd_meal_type']),
            'fd_food_type': str(request.data['fd_food_type']),
            'fd_qty': str(request.data['fd_qty']),
            'fd_time': str(request.data['fd_time']),
            'kutsero_id': str(kutsero_id),
            'horse_id': str(horse_id),
            'completed': bool(request.data.get('completed', False)),
            'completed_at': request.data.get('completed_at'),
            'user_type': str(request.data.get('user_type', 'kutsero')),
        }
        
        print(f"Feed data to save: {feed_data}")
        
        if fd_id:
            # Update existing entry
            try:
                response = supabase.table('feed_detail')\
                    .update(feed_data)\
                    .eq('fd_id', fd_id)\
                    .eq('kutsero_id', kutsero_id)\
                    .execute()
                
                print(f"Update response: {response}")
                
                if response.data:
                    return Response({
                        'success': True,
                        'data': response.data[0],
                        'message': 'Feed schedule updated successfully'
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Feed entry not found or unauthorized'
                    }, status=status.HTTP_404_NOT_FOUND)
            except Exception as update_error:
                print(f"Update error: {str(update_error)}")
                return Response({
                    'success': False,
                    'error': f'Failed to update: {str(update_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Create new entry
            try:
                feed_data['fd_id'] = str(uuid.uuid4())
                feed_data['created_at'] = datetime.now().isoformat()
                
                response = supabase.table('feed_detail')\
                    .insert(feed_data)\
                    .execute()
                
                print(f"Insert response: {response}")
                
                if response.data:
                    return Response({
                        'success': True,
                        'data': response.data[0],
                        'message': 'Feed schedule created successfully'
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Failed to create feed schedule - no data returned'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as insert_error:
                print(f"Insert error: {str(insert_error)}")
                return Response({
                    'success': False,
                    'error': f'Failed to create: {str(insert_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
    except Exception as e:
        print(f"General error in update_feeding_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_feed_completed(request):
    """Mark a feeding entry as completed"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        fd_id = request.data.get('fd_id')
        user_type = request.data.get('user_type', 'kutsero')
        
        print(f"=== mark_feed_completed called ===")
        print(f"fd_id: {fd_id}")
        print(f"kutsero_id: {kutsero_id}")
        print(f"horse_id: {horse_id}")
        print(f"user_type: {user_type}")
        
        if not all([kutsero_id, horse_id, fd_id]):
            return Response({
                'success': False,
                'error': 'kutsero_id, horse_id, and fd_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # First, check if the record exists
        check_response = supabase.table('feed_detail')\
            .select('*')\
            .eq('fd_id', fd_id)\
            .execute()
        
        print(f"Check response: {check_response.data}")
        
        if not check_response.data:
            print("No records found with that fd_id")
            return Response({
                'success': False,
                'error': 'Feed entry not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update feed entry to mark as completed
        response = supabase.table('feed_detail')\
            .update({
                'completed': True,
                'completed_at': datetime.now().isoformat()
            })\
            .eq('fd_id', fd_id)\
            .execute()
        
        print(f"Update response: {response.data}")
        
        if response.data:
            # Create feed log entry
            feed_entry = response.data[0]
            
            # Fetch kutsero's full name from database
            kutsero_name = 'Unknown User'
            try:
                print(f"=== FETCHING KUTSERO NAME ===")
                print(f"Looking for kutsero_id: {kutsero_id}")
                
                kutsero_response = supabase.table('kutsero_profile')\
                    .select('kutsero_fname, kutsero_mname, kutsero_lname')\
                    .eq('kutsero_id', kutsero_id)\
                    .execute()
                
                print(f"Kutsero query response: {kutsero_response.data}")
                
                if kutsero_response.data and len(kutsero_response.data) > 0:
                    kutsero_data = kutsero_response.data[0]
                    fname = kutsero_data.get('kutsero_fname', '').strip()
                    mname = kutsero_data.get('kutsero_mname', '').strip()
                    lname = kutsero_data.get('kutsero_lname', '').strip()
                    
                    print(f"Found names - fname: '{fname}', mname: '{mname}', lname: '{lname}'")
                    
                    # Build full name with middle initial if middle name exists
                    if mname:
                        kutsero_name = f"{fname} {mname[0]}. {lname}"
                    else:
                        kutsero_name = f"{fname} {lname}"
                    
                    print(f"Constructed full name: {kutsero_name}")
                else:
                    print(f"WARNING: Could not find kutsero with ID {kutsero_id}")
                    print(f"Response data: {kutsero_response.data}")
            except Exception as name_error:
                print(f"Error fetching kutsero name: {str(name_error)}")
                import traceback
                traceback.print_exc()
            
            log_data = {
                'log_id': str(uuid.uuid4()),  # Generate UUID for log_id
                'log_user_full_name': kutsero_name,
                'log_date': datetime.now().date().isoformat(),
                'log_meal': str(feed_entry['fd_meal_type']),
                'log_time': str(feed_entry['fd_time']),
                'log_food': str(feed_entry['fd_food_type']),
                'log_amount': str(feed_entry['fd_qty']),
                'log_status': 'Fed',
                'log_action': 'Completed',
                'horse_id': str(horse_id),
                'created_at': datetime.now().isoformat()
            }
            
            # Add the appropriate user ID based on user type
            if user_type == 'kutsero':
                log_data['kutsero_id'] = str(kutsero_id)
                log_data['user_id'] = str(kutsero_id)
            else:  # operator
                # For operators, only set user_id since kutsero_id is nullable
                log_data['user_id'] = str(kutsero_id)
                # Don't set kutsero_id for operators
            
            print(f"=== LOG DATA BEING INSERTED ===")
            print(f"Creating log entry: {log_data}")
            
            # Insert into feed_log
            try:
                log_response = supabase.table('feed_log').insert(log_data).execute()
                print(f"=== LOG INSERTED SUCCESSFULLY ===")
                print(f"Log creation successful: {log_response.data}")
                
                if not log_response.data:
                    print("WARNING: Insert returned success but no data")
                    
            except Exception as log_error:
                print(f"=== FEED LOG CREATION FAILED ===")
                print(f"Feed log creation error: {str(log_error)}")
                print(f"Error type: {type(log_error)}")
                import traceback
                traceback.print_exc()
                
                # Return error response instead of silently failing
                return Response({
                    'success': False,
                    'error': f'Failed to create feed log: {str(log_error)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'success': True,
                'data': response.data[0],
                'message': 'Feed marked as completed successfully'
            })
        else:
            print("Update returned no data")
            return Response({
                'success': False,
                'error': 'Failed to update feed entry'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print(f"Error in mark_feed_completed: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_feeds(request):
    """Reset all feeding statuses for a horse for the day"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Reset all feed entries for this horse
        response = supabase.table('feed_detail')\
            .update({
                'completed': False,
                'completed_at': None
            })\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .execute()
        
        return Response({
            'success': True,
            'data': response.data,
            'message': 'Daily feeds reset successfully'
        })
        
    except Exception as e:
        print(f"Error in reset_daily_feeds: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_feed_logs(request):
    """Get feed logs for a specific horse and user with optional date and meal filtering"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        user_type = request.GET.get('user_type', 'Kutsero')
        log_date = request.GET.get('log_date')
        log_meal = request.GET.get('log_meal')
        
        print(f"=== GET_FEED_LOGS QUERY ===")
        print(f"Querying with kutsero_id: {kutsero_id}")
        print(f"Querying with horse_id: {horse_id}")
        print(f"Querying with user_type: {user_type}")
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build query based on user type
        if user_type == 'kutsero':
            query = supabase.table('feed_log')\
                .select('*')\
                .eq('kutsero_id', kutsero_id)\
                .eq('horse_id', horse_id)
        else:  # operator
            query = supabase.table('feed_log')\
                .select('*')\
                .eq('op_id', kutsero_id)\
                .eq('horse_id', horse_id)
        
        # Add optional filters
        if log_date:
            query = query.eq('log_date', log_date)
        
        if log_meal and log_meal != 'All Meals':
            query = query.eq('log_meal', log_meal)
        
        # Execute query and sort by created_at descending
        response = query.order('created_at', desc=True).execute()
        
        print(f"=== QUERY RESULTS ===")
        print(f"Total records found: {len(response.data) if response.data else 0}")
        if response.data and len(response.data) > 0:
            print(f"First record: {response.data[0]}")
        
        return Response({
            'success': True,
            'data': response.data if response.data else []
        })
        
    except Exception as e:
        print(f"Error in get_feed_logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_feed_log(request):
    """Create a manual feed log entry"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        user_type = request.data.get('user_type', 'Kutsero')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Required fields for manual log
        required_fields = ['log_meal', 'log_time', 'log_food', 'log_amount']
        missing_fields = [field for field in required_fields if field not in request.data or not request.data[field]]
        
        if missing_fields:
            return Response({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate time format
        time_str = request.data['log_time']
        if not validate_time_format(time_str):
            return Response({
                'success': False,
                'error': 'Invalid time format. Use HH:MM AM/PM'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        log_data = {
            'log_user_full_name': str(request.data.get('kutsero_name', 'Unknown User')),
            'log_kutsero_full_name': str(request.data.get('kutsero_name', 'Unknown User')),
            'log_date': str(request.data.get('log_date', datetime.now().date().isoformat())),
            'log_meal': str(request.data['log_meal']),
            'log_time': str(request.data['log_time']),
            'log_food': str(request.data['log_food']),
            'log_food_type': str(request.data.get('log_food_type', request.data['log_food'])),
            'log_amount': str(request.data['log_amount']),
            'log_qty': str(request.data.get('log_qty', request.data['log_amount'])),
            'log_status': str(request.data.get('log_status', 'completed')),
            'log_action': str(request.data.get('log_action', 'manual_entry')),
            'log_horse_name': str(request.data.get('horse_name', 'Unknown Horse')),
            'horse_id': str(horse_id),
            'created_at': datetime.now().isoformat()
        }
        
        # Add the appropriate user ID based on user type
        if user_type == 'kutsero':
            log_data['kutsero_id'] = str(kutsero_id)
            log_data['user_id'] = str(kutsero_id)
            log_data['op_id'] = None
        else:  # operator
            log_data['op_id'] = str(kutsero_id)
            log_data['user_id'] = str(kutsero_id)
            log_data['kutsero_id'] = None
        
        response = supabase.table('feed_log')\
            .insert(log_data)\
            .execute()
        
        if response.data:
            return Response({
                'success': True,
                'data': response.data[0],
                'message': 'Feed log created successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to create feed log'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print(f"Error in create_feed_log: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_feed_entry(request):
    """Delete a feeding schedule entry"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        fd_id = request.data.get('fd_id')
        
        if not all([kutsero_id, horse_id, fd_id]):
            return Response({
                'success': False,
                'error': 'kutsero_id, horse_id, and fd_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete the feed entry
        response = supabase.table('feed_detail')\
            .delete()\
            .eq('fd_id', fd_id)\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Feed entry deleted successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'Feed entry not found or unauthorized'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error in delete_feed_entry: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# ------------------------------------------------ WATER MANAGEMENT API ------------------------------------------------
@api_view(['GET'])
def get_water_schedule(request):
    """Get water schedule for a specific kutsero and horse"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response = supabase.table('water_detail')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .order('water_time')\
            .execute()
        
        return Response({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        print(f"Error in get_water_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def update_water_schedule(request):
    """Create or update water schedule"""
    try:
        data = request.data
        
        required_fields = ['water_period', 'water_amount', 'water_time', 'kutsero_id', 'horse_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response({
                    'success': False,
                    'error': f'{field} is required'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        water_id = data.get('water_id')
        
        if water_id:
            # Update existing schedule
            response = supabase.table('water_detail')\
                .update({
                    'water_period': data['water_period'],
                    'water_amount': data['water_amount'],
                    'water_time': data['water_time'],
                    'completed': data.get('completed', False)
                })\
                .eq('water_id', water_id)\
                .execute()
            
            if not response.data:
                return Response({
                    'success': False,
                    'error': 'Water schedule not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            message = 'Water schedule updated successfully'
        else:
            # Create new schedule
            new_water_id = str(uuid.uuid4())
            response = supabase.table('water_detail')\
                .insert({
                    'water_id': new_water_id,
                    'water_period': data['water_period'],
                    'water_amount': data['water_amount'],
                    'water_time': data['water_time'],
                    'kutsero_id': data['kutsero_id'],
                    'horse_id': data['horse_id'],
                    'completed': data.get('completed', False),
                    'user_type': data.get('user_type', 'kutsero'),
                    'created_at': datetime.now().isoformat()
                })\
                .execute()
            
            message = 'Water schedule created successfully'
        
        return Response({
            'success': True,
            'message': message,
            'data': response.data[0] if response.data else {}
        })
        
    except Exception as e:
        print(f"Error in update_water_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_water_completed(request):
    """Mark water schedule as completed and create log entry"""
    try:
        data = request.data
        print(f"Received data: {data}")
        
        # ✅ Validate required fields
        required_fields = ['kutsero_id', 'horse_id', 'water_id', 'horse_name']
        missing_fields = [field for field in required_fields if field not in data or not data.get(field)]
        if missing_fields:
            error_msg = f'Missing required fields: {", ".join(missing_fields)}'
            print(f"Error: {error_msg}")
            return Response({
                'success': False,
                'error': error_msg
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ Get kutsero name
        kutsero_name = data.get('kutsero_name')
        if not kutsero_name:
            print(f"Fetching kutsero name from kutsero_profile for kutsero_id: {data['kutsero_id']}")
            kutsero_response = supabase.table('kutsero_profile') \
                .select('kutsero_fname, kutsero_lname') \
                .eq('kutsero_id', data['kutsero_id']) \
                .execute()
            
            if kutsero_response.data:
                kutsero = kutsero_response.data[0]
                kutsero_name = f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}".strip()
                print(f"Found kutsero name: {kutsero_name}")
            else:
                kutsero_name = 'Unknown Kutsero'
                print("Kutsero not found, using default name")

        # ✅ Fetch water schedule
        print(f"Fetching water schedule for water_id: {data['water_id']}")
        water_response = supabase.table('water_detail') \
            .select('*') \
            .eq('water_id', data['water_id']) \
            .eq('kutsero_id', data['kutsero_id']) \
            .eq('horse_id', data['horse_id']) \
            .execute()
        
        if not water_response.data:
            return Response({
                'success': False,
                'error': 'Water schedule not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        water_schedule = water_response.data[0]
        print(f"Water schedule response: {water_schedule}")

        # ✅ Already completed check
        if water_schedule.get('completed'):
            print(f"Water schedule {data['water_id']} is already completed")
            return Response({
                'success': True,
                'message': f'Water already marked as given for {data["horse_name"]}',
                'already_completed': True,
                'data': {
                    'water_id': data['water_id'],
                    'completed': True,
                    'completed_at': water_schedule.get('completed_at')
                }
            })

        # ✅ Mark as completed
        completed_at = datetime.now().isoformat()
        supabase.table('water_detail') \
            .update({
                'completed': True,
                'completed_at': completed_at
            }) \
            .eq('water_id', data['water_id']) \
            .execute()

        # ✅ Create log entry
        wlog_id = str(uuid.uuid4())
        current_date = datetime.now().date().isoformat()
        current_time = datetime.now().strftime('%I:%M %p')

        # ✅ Safely get horse_op_id (from op_id or fallback)
        horse_op_id = water_schedule.get('op_id') or 'UNKNOWN_OP_ID'
        if horse_op_id == 'UNKNOWN_OP_ID':
            print("⚠️ Warning: water_detail.op_id is NULL, using fallback ID.")

        log_data = {
            'wlog_id': wlog_id,
            'wlog_user_full_name': kutsero_name,
            'wlog_date': current_date,
            'wlog_period': water_schedule['water_period'],
            'wlog_time': current_time,
            'wlog_amount': water_schedule['water_amount'],
            'wlog_status': 'Given',
            'wlog_action': 'Completed',
            'user_id': data['kutsero_id'],
            'horse_id': data['horse_id'],
            'kutsero_id': data['kutsero_id'],
            'horse_op_id': horse_op_id,  # ✅ FIXED LINE
            'created_at': datetime.now().isoformat()
        }

        log_response = supabase.table('water_log').insert(log_data).execute()
        print(f"Water log inserted successfully: {log_response.data}")

        # ✅ Return success
        return Response({
            'success': True,
            'message': f'Water marked as given for {data["horse_name"]}',
            'data': {
                'water_id': data['water_id'],
                'completed': True,
                'completed_at': completed_at,
                'log_id': wlog_id
            }
        })

    except Exception as e:
        print(f"Error in mark_water_completed: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def reset_water_schedule(request):
    """Reset all water schedules for a kutsero and horse"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response = supabase.table('water_detail')\
            .update({
                'completed': False,
                'completed_at': None
            })\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .execute()
        
        updated_count = len(response.data) if response.data else 0
        
        return Response({
            'success': True,
            'message': f'Successfully reset {updated_count} water schedule(s)',
            'count': updated_count
        })
        
    except Exception as e:
        print(f"Error in reset_water_schedule: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_water_entry(request):
    """Delete a water schedule entry"""
    try:
        kutsero_id = request.data.get('kutsero_id')
        horse_id = request.data.get('horse_id')
        water_id = request.data.get('water_id')
        
        if not all([kutsero_id, horse_id, water_id]):
            return Response({
                'success': False,
                'error': 'kutsero_id, horse_id, and water_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response = supabase.table('water_detail')\
            .delete()\
            .eq('water_id', water_id)\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)\
            .execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Water entry deleted successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'Water entry not found or unauthorized'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error in delete_water_entry: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# WATER LOG ENDPOINTS
# ============================================================================

@api_view(['GET'])
def get_water_logs(request):
    """Get water logs with optional filters"""
    try:
        kutsero_id = request.GET.get('kutsero_id')
        horse_id = request.GET.get('horse_id')
        log_date = request.GET.get('log_date')
        log_period = request.GET.get('log_period')
        
        if not kutsero_id or not horse_id:
            return Response({
                'success': False,
                'error': 'kutsero_id and horse_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build query
        query = supabase.table('water_log')\
            .select('*')\
            .eq('kutsero_id', kutsero_id)\
            .eq('horse_id', horse_id)
        
        if log_date:
            query = query.eq('wlog_date', log_date)
        
        if log_period and log_period != 'All Periods':
            query = query.eq('wlog_period', log_period)
        
        response = query.order('created_at', desc=True)\
            .order('wlog_time', desc=True)\
            .execute()
        
        return Response({
            'success': True,
            'data': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        print(f"Error in get_water_logs: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# ------------------------------------------------ PROFILE ------------------------------------------------

@api_view(['GET'])
def get_kutsero_profile(request, kutsero_id):
    """
    Get kutsero profile by kutsero_id - formatted for frontend
    """
    try:
        # Query by kutsero_id field, not primary key id
        response = supabase.table('kutsero_profile').select('*').eq('kutsero_id', kutsero_id).execute()
        
        if not response.data:
            return Response({
                'success': False,
                'message': 'Kutsero profile not found',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        profile = response.data[0]
        
        # Format data to match your frontend formData structure
        formatted_profile = {
            # Step 1 - Location Info
            'city': profile.get('kutsero_city', ''),
            'municipality': profile.get('kutsero_municipality', ''),
            'barangay': profile.get('kutsero_brgy', ''),
            'zipCode': profile.get('kutsero_zipcode', ''),
            'houseNumber': '',  # Not in your DB schema, keeping empty
            'route': '',        # Not in your DB schema, keeping empty
            'to': '',          # Not in your DB schema, keeping empty
            
            # Step 2 - Personal Info
            'firstName': profile.get('kutsero_fname', ''),
            'middleName': profile.get('kutsero_mname', ''),
            'lastName': profile.get('kutsero_lname', ''),
            'dateOfBirth': profile.get('kutsero_dob', ''),
            'sex': profile.get('kutsero_sex', ''),
            'phoneNumber': profile.get('kutsero_phone', ''),
            'province': profile.get('kutsero_province', ''),
            
            # Step 3 - Account Info
            'email': profile.get('kutsero_email', ''),
            'facebook': profile.get('kutsero_fb', ''),
            'username': profile.get('kutsero_username', ''),
            'password': '••••••••••',  # Never return real password
            
            # Additional info
            'kutsero_id': profile.get('kutsero_id'),
            'id': profile.get('id'),
            'created_at': profile.get('created_at')
        }
        
        return Response({
            'success': True,
            'message': 'Profile fetched successfully',
            'data': formatted_profile
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'POST'])
def update_kutsero_profile(request, kutsero_id):
    """
    Update kutsero profile - accepts frontend formData format
    """
    try:
        # Check if profile exists
        existing_profile = supabase.table('kutsero_profile').select('*').eq('kutsero_id', kutsero_id).execute()
        
        if not existing_profile.data:
            return Response({
                'success': False,
                'message': 'Kutsero profile not found',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Map frontend formData to database fields
        form_data = request.data
        update_data = {}
        
        # Step 1 - Location Info
        if 'city' in form_data:
            update_data['kutsero_city'] = form_data['city']
        if 'municipality' in form_data:
            update_data['kutsero_municipality'] = form_data['municipality']
        if 'barangay' in form_data:
            update_data['kutsero_bray'] = form_data['barangay']
        if 'zipCode' in form_data:
            update_data['kutsero_zipcode'] = form_data['zipCode']
        # Note: houseNumber, route, to are not in DB schema
        
        # Step 2 - Personal Info
        if 'firstName' in form_data:
            update_data['kutsero_fname'] = form_data['firstName']
        if 'middleName' in form_data:
            update_data['kutsero_mname'] = form_data['middleName']
        if 'lastName' in form_data:
            update_data['kutsero_lname'] = form_data['lastName']
        if 'dateOfBirth' in form_data:
            update_data['kutsero_dob'] = form_data['dateOfBirth']
        if 'sex' in form_data:
            update_data['kutsero_sex'] = form_data['sex']
        if 'phoneNumber' in form_data:
            update_data['kutsero_phone'] = form_data['phoneNumber']
        if 'province' in form_data:
            update_data['kutsero_province'] = form_data['province']
        
        # Step 3 - Account Info
        if 'email' in form_data:
            update_data['kutsero_email'] = form_data['email']
        if 'facebook' in form_data:
            update_data['kutsero_fb'] = form_data['facebook']
        if 'username' in form_data:
            update_data['kutsero_username'] = form_data['username']
        # Note: Password handling would need proper encryption in real app
        
        # Basic validation
        if 'firstName' in form_data and not form_data['firstName'].strip():
            return Response({
                'success': False,
                'message': 'First name is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if 'lastName' in form_data and not form_data['lastName'].strip():
            return Response({
                'success': False,
                'message': 'Last name is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if 'email' in form_data and form_data['email']:
            email = form_data['email']
            if '@' not in email or '.' not in email:
                return Response({
                    'success': False,
                    'message': 'Please enter a valid email address',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if 'phoneNumber' in form_data and not form_data['phoneNumber'].strip():
            return Response({
                'success': False,
                'message': 'Phone number is required',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the profile
        response = supabase.table('kutsero_profile').update(update_data).eq('kutsero_id', kutsero_id).execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Your profile information has been updated successfully!',
                'data': response.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Failed to update profile',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_kutsero_profile(request):
    """
    Create new kutsero profile from frontend formData
    """
    try:
        form_data = request.data
        
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
            'kutsero_phone': form_data.get('phoneNumber', ''),
            'kutsero_province': form_data.get('province'),
            # Location Info
            'kutsero_city': form_data.get('city'),
            'kutsero_municipality': form_data.get('municipality'),
            'kutsero_bray': form_data.get('barangay'),
            'kutsero_zipcode': form_data.get('zipCode'),
            # Account Info
            'kutsero_email': form_data.get('email'),
            'kutsero_fb': form_data.get('facebook'),
            'kutsero_username': form_data.get('username'),
        }
        
        # Remove None values
        profile_data = {k: v for k, v in profile_data.items() if v is not None and v != ''}
        
        # Insert new profile
        response = supabase.table('kutsero_profile').insert(profile_data).execute()
        
        if response.data:
            return Response({
                'success': True,
                'message': 'Profile created successfully',
                'data': response.data[0]
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'message': 'Failed to create profile',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
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
        
        # Build the query
        query = supabase.table('kutsero_profile').select('*')
        
        # Apply filters if provided
        if city_filter:
            query = query.eq('kutsero_city', city_filter)
        if province_filter:
            query = query.eq('kutsero_province', province_filter)
        
        # Apply pagination
        query = query.range(int(offset), int(offset) + int(limit) - 1)
        
        # Execute the query
        response = query.execute()
        
        # Format each profile for frontend
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
                'created_at': profile.get('created_at')
            }
            formatted_profiles.append(formatted_profile)
        
        return Response({
            'success': True,
            'message': f'Fetched {len(formatted_profiles)} profiles',
            'data': formatted_profiles
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
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

# ------------------------------------------------ WATER MANAGEMENT API ------------------------------------------------


# ------------------------------------------------ ANNOUNCEMENT ------------------------------------------------
@api_view(['GET'])
def get_current_assignment(request, kutsero_id):
    """
    Get current active horse assignment for a kutsero
    Example: /api/assignments/kutsero/123/current
    """
    try:
        today = datetime.now().date().isoformat()
        
        # Get current assignment
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
        """).eq("kutsero_id", kutsero_id).eq("date_start", today).eq("status", "active").execute()
        
        if not data.data:
            return Response({"error": "No current assignment found"}, status=status.HTTP_404_NOT_FOUND)
        
        assignment = data.data[0]
        horse = assignment.get("horse_profile")
        
        if not horse:
            return Response({"error": "Horse data not found"}, status=status.HTTP_404_NOT_FOUND)
        
        response_data = {
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
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_assignment_status(request, assign_id):
    """
    Update assignment status (e.g., complete assignment)
    """
    new_status = request.data.get("status")
    
    if not new_status:
        return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        payload = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_assignment").update(payload).eq("assign_id", assign_id).execute()
        
        if data.data:
            return Response({
                "message": "Assignment status updated successfully", 
                "data": data.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def cancel_assignment(request, assign_id):
    """
    Cancel/delete an assignment
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_assignment").delete().eq("assign_id", assign_id).execute()
        
        if data.data:
            return Response({"message": "Assignment cancelled successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_available_horses(request):
    """
    Get horses that are available for assignment on a specific date
    Example: /api/horses/available?date=2024-05-30
    """
    date = request.GET.get("date")
    
    if not date:
        return Response({"error": "Date parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get all horses
        all_horses = supabase.table("horse_profile").select("*").execute()
        
        # Get assigned horses for the specific date
        assigned_horses = supabase.table("horse_assignment").select("horse_id").eq("date_start", date).eq("status", "active").execute()
        
        assigned_horse_ids = [assignment["horse_id"] for assignment in assigned_horses.data]
        
        # Filter available horses
        available_horses = []
        for horse in all_horses.data:
            if horse["id"] not in assigned_horse_ids:
                horse_data = {
                    "id": str(horse.get("id")),
                    "name": horse.get("horse_name"),
                    "healthStatus": horse.get("health_status", "Healthy"),
                    "status": horse.get("status", "Ready for work"),
                    "breed": horse.get("horse_breed"),
                    "age": horse.get("horse_age"),
                    "lastCheckup": horse.get("last_checkup"),
                    "nextCheckup": horse.get("next_checkup"),
                    "image": horse.get("horse_image")
                }
                available_horses.append(horse_data)
        
        return Response(available_horses, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# Additional API endpoints for complete horse management

@api_view(['POST'])
def check_in_horse(request):
    """
    Check in with an assigned horse
    """
    kutsero_id = request.data.get("kutsero_id")
    horse_id = request.data.get("horse_id")
    check_in_time = request.data.get("check_in_time")
    
    if not all([kutsero_id, horse_id, check_in_time]):
        return Response({
            "error": "kutsero_id, horse_id, and check_in_time are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        today = datetime.now().date().isoformat()
        
        # Find the assignment
        assignment_data = supabase.table("horse_assignment").select("*").eq(
            "kutsero_id", kutsero_id
        ).eq("horse_id", horse_id).eq("date_start", today).eq("status", "active").execute()
        
        if not assignment_data.data:
            return Response({
                "error": "No active assignment found for today"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update assignment with check-in time
        payload = {
            "check_in_time": check_in_time,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_assignment").update(payload).eq(
            "assign_id", assignment_data.data[0]["assign_id"]
        ).execute()
        
        if data.data:
            return Response({
                "message": "Checked in successfully",
                "data": data.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to update check-in"}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def check_out_horse(request):
    """
    Check out from an assigned horse
    """
    kutsero_id = request.data.get("kutsero_id")
    horse_id = request.data.get("horse_id")
    check_out_time = request.data.get("check_out_time")
    
    if not all([kutsero_id, horse_id, check_out_time]):
        return Response({
            "error": "kutsero_id, horse_id, and check_out_time are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        today = datetime.now().date().isoformat()
        
        # Find the assignment
        assignment_data = supabase.table("horse_assignment").select("*").eq(
            "kutsero_id", kutsero_id
        ).eq("horse_id", horse_id).eq("date_start", today).eq("status", "active").execute()
        
        if not assignment_data.data:
            return Response({
                "error": "No active assignment found for today"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update assignment with check-out time and complete status
        payload = {
            "check_out_time": check_out_time,
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_assignment").update(payload).eq(
            "assign_id", assignment_data.data[0]["assign_id"]
        ).execute()
        
        if data.data:
            return Response({
                "message": "Checked out successfully",
                "data": data.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to update check-out"}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_assignment_history(request, kutsero_id):
    """
    Get assignment history for a kutsero with pagination
    Example: /api/assignments/kutsero/123/history?page=1&limit=10
    """
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        offset = (page - 1) * limit
        
        # Get total count
        count_data = supabase.table("horse_assignment").select(
            "assign_id", count="exact"
        ).eq("kutsero_id", kutsero_id).execute()
        
        total_count = count_data.count if count_data.count else 0
        
        # Get paginated data
        data = supabase.table("horse_assignment").select("""
            *,
            horse_profile:horse_id (
                id,
                horse_name,
                horse_breed,
                horse_age,
                health_status,
                horse_image
            )
        """).eq("kutsero_id", kutsero_id).order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1).execute()
        
        # Transform data
        assignments = []
        for assignment in data.data:
            horse = assignment.get("horse_profile")
            if horse:
                assignment_data = {
                    "assign_id": assignment.get("assign_id"),
                    "date_start": assignment.get("date_start"),
                    "date_end": assignment.get("date_end"),
                    "status": assignment.get("status"),
                    "check_in_time": assignment.get("check_in_time"),
                    "check_out_time": assignment.get("check_out_time"),
                    "created_at": assignment.get("created_at"),
                    "horse": {
                        "id": str(horse.get("id")),
                        "name": horse.get("horse_name"),
                        "breed": horse.get("horse_breed"),
                        "age": horse.get("horse_age"),
                        "healthStatus": horse.get("health_status", "Healthy"),
                        "image": horse.get("horse_image")
                    }
                }
                assignments.append(assignment_data)
        
        return Response({
            "assignments": assignments,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_assignment_statistics(request, kutsero_id):
    """
    Get assignment statistics for a kutsero
    Example: /api/assignments/kutsero/123/statistics
    """
    try:
        # Get all assignments for the kutsero
        data = supabase.table("horse_assignment").select("*").eq("kutsero_id", kutsero_id).execute()
        
        assignments = data.data
        total_assignments = len(assignments)
        completed_assignments = len([a for a in assignments if a["status"] == "completed"])
        active_assignments = len([a for a in assignments if a["status"] == "active"])
        cancelled_assignments = len([a for a in assignments if a["status"] == "cancelled"])
        
        # Get unique horses worked with
        unique_horses = len(set([a["horse_id"] for a in assignments]))
        
        # Get current month statistics
        current_month = datetime.now().strftime("%Y-%m")
        current_month_assignments = [
            a for a in assignments 
            if a["date_start"] and a["date_start"].startswith(current_month)
        ]
        
        statistics = {
            "total_assignments": total_assignments,
            "completed_assignments": completed_assignments,
            "active_assignments": active_assignments,
            "cancelled_assignments": cancelled_assignments,
            "unique_horses_worked": unique_horses,
            "current_month_assignments": len(current_month_assignments),
            "completion_rate": round((completed_assignments / total_assignments * 100), 2) if total_assignments > 0 else 0
        }
        
        return Response(statistics, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horses_with_assignment_status(request):
    """
    Get all horses with their current assignment status
    Example: /api/horses/with-status?date=2024-12-01
    """
    date = request.GET.get("date", datetime.now().date().isoformat())
    
    try:
        # Get all horses
        horses_data = supabase.table("horse_profile").select("*").execute()
        
        # Get assignments for the specified date
        assignments_data = supabase.table("horse_assignment").select("""
            horse_id,
            kutsero_id,
            status,
            check_in_time,
            check_out_time
        """).eq("date_start", date).execute()
        
        # Create assignment lookup
        assignments_lookup = {a["horse_id"]: a for a in assignments_data.data}
        
        # Transform data
        horses_with_status = []
        for horse in horses_data.data:
            assignment = assignments_lookup.get(horse["id"])
            
            horse_data = {
                "id": str(horse.get("id")),
                "name": horse.get("horse_name"),
                "healthStatus": horse.get("health_status", "Healthy"),
                "status": horse.get("status", "Ready for work"),
                "breed": horse.get("horse_breed"),
                "age": horse.get("horse_age"),
                "image": horse.get("horse_image"),
                "assignmentStatus": {
                    "isAssigned": assignment is not None,
                    "assignedTo": assignment.get("kutsero_id") if assignment else None,
                    "assignmentStatus": assignment.get("status") if assignment else None,
                    "checkInTime": assignment.get("check_in_time") if assignment else None,
                    "checkOutTime": assignment.get("check_out_time") if assignment else None,
                }
            }
            horses_with_status.append(horse_data)
        
        return Response(horses_with_status, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_announcements(request):
    """
    Fetch announcements from Supabase with comment counts and images
    """
    try:
        logger.info("Fetching announcements...")
        
        if 'supabase' not in globals():
            logger.error("Supabase client not initialized")
            return Response(
                {"error": "Database connection not available"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            announcements_response = supabase.table("announcement") \
                .select("*") \
                .order("announce_date", desc=True) \
                .execute()
        except Exception as db_error:
            logger.error(f"Database query failed: {db_error}")
            return Response(
                {"error": "Failed to fetch announcements from database"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        logger.info(f"Found {len(announcements_response.data) if announcements_response.data else 0} announcements")

        if announcements_response.data:
            announcements_with_counts = []
            
            # Supabase configuration
            SUPABASE_URL = "https://drgknejiqupegkyxfaab.supabase.co"
            BUCKET_NAME = "announcement-img"
            
            for announcement in announcements_response.data:
                announce_id = announcement.get("announce_id")
                if not announce_id:
                    logger.warning(f"Skipping announcement without announce_id")
                    continue
                
                # Get comment count
                comment_count = 0
                try:
                    comment_count_response = supabase.table("comment") \
                        .select("id", count="exact") \
                        .eq("announcement_id", announce_id) \
                        .execute()
                    
                    comment_count = comment_count_response.count or 0
                except Exception as comment_error:
                    logger.warning(f"Error getting comment count for announcement {announce_id}: {comment_error}")
                    comment_count = 0
                
                # Handle image URL
                image_url = None
                announce_img = announcement.get("announce_img")
                
                if announce_img:
                    try:
                        # Check if it's a JSON array string
                        if isinstance(announce_img, str) and announce_img.startswith('['):
                            import json
                            img_array = json.loads(announce_img)
                            if img_array and len(img_array) > 0:
                                # Get the first URL from the array
                                image_url = img_array[0]
                        # Check if it's already a full URL
                        elif isinstance(announce_img, str) and announce_img.startswith('http'):
                            image_url = announce_img
                        # Otherwise, it's just a filename - construct the URL
                        elif isinstance(announce_img, str) and announce_img.strip():
                            filename = announce_img.strip()
                            image_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
                        
                        if image_url:
                            logger.info(f"Image URL for announcement {announce_id}: {image_url}")
                        else:
                            logger.info(f"Could not parse image for announcement {announce_id}")
                    except Exception as img_error:
                        logger.warning(f"Error parsing image for announcement {announce_id}: {img_error}")
                        image_url = None
                else:
                    logger.info(f"No image for announcement {announce_id}")
                
                # Build announcement data
                announcement_data = {
                    "id": str(announce_id),
                    "announce_id": announce_id,
                    "announce_title": announcement.get("announce_title", "Untitled"),
                    "announce_content": announcement.get("announce_content", ""),
                    "announce_date": announcement.get("announce_date", ""),
                    "announce_status": announcement.get("announce_status", "active"),
                    "created_at": announcement.get("created_at", ""),
                    "comment_count": comment_count,
                    "user_name": "CTU Announcement",
                    "image_url": image_url
                }
                
                announcements_with_counts.append(announcement_data)
            
            logger.info(f"Returning {len(announcements_with_counts)} valid announcements")
            return Response(
                {"announcements": announcements_with_counts}, 
                status=status.HTTP_200_OK
            )
        else:
            logger.info("No announcements found")
            return Response({"announcements": []}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in get_announcements: {e}")
        logger.error(traceback.format_exc())
        return Response(
            {"error": "Internal server error occurred while fetching announcements"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
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
        
        # Check if supabase client is available
        if 'supabase' not in globals():
            logger.error("[ERROR] Supabase client not initialized")
            return Response({"error": "Database connection not available"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check if announcement exists (using announce_id)
        try:
            announcement_response = supabase.table("announcement") \
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
                    comments_response = supabase.table("comment") \
                        .select("*") \
                        .eq("announcement_id", announcement_id) \
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
                            formatted_comment = {
                                "id": str(comment.get("id", "")),
                                "comment_text": comment.get("comment_text", ""),
                                "comment_date": comment.get("comment_date", ""),
                                "user_id": comment.get("user_id", ""),
                                "announcement_id": comment.get("announcement_id", ""),
                            }
                            
                            # Try to fetch user details from kutsero_profile table
                            try:
                                user_id = comment.get("user_id")
                                if user_id:
                                    logger.info(f"[DEBUG] Looking up user_id: {user_id}")
                                    
                                    # The user_id from comments should match kutsero_profile.kutsero_id
                                    profile_response = supabase.table("kutsero_profile") \
                                        .select("kutsero_id, kutsero_fname, kutsero_lname, kutsero_mname") \
                                        .eq("kutsero_id", user_id) \
                                        .execute()
                                    
                                    logger.info(f"[DEBUG] Profile response: {profile_response.data}")
                                    
                                    if profile_response.data and len(profile_response.data) > 0:
                                        profile_data = profile_response.data[0]
                                        formatted_comment.update({
                                            "kutsero_fname": profile_data.get("kutsero_fname", "Unknown"),
                                            "kutsero_lname": profile_data.get("kutsero_lname", "User"),
                                            "kutsero_username": f"{profile_data.get('kutsero_fname', '')} {profile_data.get('kutsero_lname', '')}".strip(),
                                            "user_email": None,  # Email not in kutsero_profile table
                                        })
                                        logger.info(f"[DEBUG] Found profile: {profile_data.get('kutsero_fname')} {profile_data.get('kutsero_lname')}")
                                    else:
                                        logger.warning(f"[WARN] No profile found for user_id: {user_id}")
                                        
                                        # Debug: Check what profiles are available
                                        debug_profiles = supabase.table("kutsero_profile") \
                                            .select("kutsero_id, kutsero_fname") \
                                            .limit(3) \
                                            .execute()
                                        logger.info(f"[DEBUG] Available profile kutsero_ids: {[p.get('kutsero_id') for p in debug_profiles.data] if debug_profiles.data else 'None'}")
                                        
                                        # Default values if profile not found
                                        formatted_comment.update({
                                            "kutsero_fname": "Unknown",
                                            "kutsero_lname": "User",
                                            "kutsero_username": None,
                                            "user_email": None,
                                        })
                            except Exception as user_error:
                                logger.warning(f"[WARN] Error fetching kutsero profile for comment {comment.get('id')}: {user_error}")
                                formatted_comment.update({
                                    "kutsero_fname": "Unknown",
                                    "kutsero_lname": "User",
                                    "kutsero_username": None,
                                    "user_email": None,
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
            return handle_post_comment(request, announcement_id)
            
    except Exception as e:
        logger.error(f"[ERROR] Error in announcement_comments_handler: {e}")
        logger.error(traceback.format_exc())
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def handle_post_comment(request, announcement_id):
    """
    Handle POST request for creating a new comment
    """
    try:
        logger.info(f"[DEBUG] Posting comment to announcement: {announcement_id}")
        logger.info(f"[DEBUG] Raw request data: {request.data}")
        logger.info(f"[DEBUG] Request content type: {request.content_type}")
        
        # Get and validate request data
        comment_text = request.data.get("comment_text", "").strip() if request.data else ""
        user_id = request.data.get("user_id") if request.data else None
        
        # Also check for kutsero_id in case frontend is still sending old field name
        if not user_id:
            user_id = request.data.get("kutsero_id") if request.data else None
            if user_id:
                logger.info(f"[DEBUG] Found kutsero_id instead of user_id: {user_id}")

        logger.info(f"[DEBUG] Comment data: text='{comment_text[:50] if comment_text else ''}...', user_id={user_id}")

        # Validation with more specific error messages
        if not comment_text:
            logger.error("[ERROR] Comment text is missing or empty")
            return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(comment_text) > 500:
            logger.error(f"[ERROR] Comment text too long: {len(comment_text)} characters")
            return Response({"error": "Comment is too long (max 500 characters)"}, status=status.HTTP_400_BAD_REQUEST)

        if not user_id:
            logger.error("[ERROR] User ID is missing")
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Insert comment with error handling
        comment_data = {
            "comment_text": comment_text,
            "user_id": str(user_id),
            "announcement_id": str(announcement_id),
            "comment_date": datetime.now().isoformat()
        }

        logger.info(f"[DEBUG] Inserting comment data: {comment_data}")

        try:
            response = supabase.table("comment").insert(comment_data).execute()
        except Exception as db_error:
            logger.error(f"[ERROR] Failed to insert comment: {db_error}")
            return Response({"error": "Failed to save comment to database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if response.data and len(response.data) > 0:
            comment = response.data[0]
            formatted_comment = {
                "id": str(comment.get("id", "")),
                "comment_text": comment.get("comment_text", ""),
                "comment_date": comment.get("comment_date", ""),
                "user_id": comment.get("user_id", ""),
                "announcement_id": comment.get("announcement_id", ""),
                "kutsero_fname": "Current",
                "kutsero_lname": "User",
                "kutsero_username": None,
                "user_email": None,
            }

            logger.info(f"[DEBUG] Comment posted successfully: {comment.get('id')}")

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

@api_view(["POST"])
def post_announcement_comment(request, announcement_id):
    """
    Legacy function - redirects to the main handler
    """
    return announcement_comments_handler(request, announcement_id)

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
    Create a new SOS request
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        user_id = request.data.get("user_id")
        contact_number = request.data.get("contact_number")
        additional_info = request.data.get("additional_info")
        emergency_type = request.data.get("emergency_type")
        horse_status = request.data.get("horse_status")  # array from frontend
        description = request.data.get("description")
        location_text = request.data.get("location_text")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")

        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        response = service_client.table("sos_requests").insert({
            "contact_number": contact_number,
            "additional_info": additional_info,
            "emergency_type": emergency_type,
            "horse_status": horse_status,  # store as array (Supabase supports JSON/array fields)
            "description": description,
            "location_text": location_text,
            "latitude": latitude,
            "longitude": longitude,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return Response({"message": "SOS request created", "data": response.data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error creating SOS request: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_sos_requests(request):
    """
    Get all SOS requests (latest first)
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        response = service_client.table("sos_requests").select("*").order("created_at", desc=True).execute()

        return Response({"sos_requests": response.data}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching SOS requests: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
def debug_urls(request):
    """
    Debug endpoint to see all registered URLs
    """
    url_patterns = []
    resolver = get_resolver()
    
    # Function to recursively extract URLs
    def extract_urls(patterns, prefix=''):
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):
                # This is an include
                extract_urls(pattern.url_patterns, prefix + str(pattern.pattern))
            else:
                url_patterns.append({
                    'pattern': prefix + str(pattern.pattern),
                    'name': getattr(pattern, 'name', 'N/A'),
                    'callback': pattern.callback.__name__ if hasattr(pattern, 'callback') else 'N/A'
                })
    
    extract_urls(resolver.url_patterns)
    return Response({'url_patterns': url_patterns})


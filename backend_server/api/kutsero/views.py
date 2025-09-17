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


logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

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

@api_view(['GET'])
def get_feeding_schedule(request):
    """
    Get feeding schedule for a specific user and horse
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get feeding schedule from feed_detail table - only select existing columns
        response = service_client.table("feed_detail").select(
            "fd_id, user_id, horse_id, fd_meal_type, fd_food_type, fd_qty, fd_time, completed, completed_at"
        ).eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        if not response.data:
            return Response([], status=status.HTTP_200_OK)
        
        return Response(response.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error fetching feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def save_feeding_schedule(request):
    """
    Save or update feeding schedule
    """
    try:
        data = request.data
        user_id = data.get("user_id")
        horse_id = data.get("horse_id")
        schedule = data.get("schedule", [])
        
        if not user_id or not horse_id:
            return Response({"error": "user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First, delete existing schedule for this user and horse from feed_detail table
        service_client.table("feed_detail").delete().eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        # Insert new schedule items
        for meal in schedule:
            # Only include columns that actually exist in your table
            meal_data = {
                "user_id": user_id,
                "horse_id": horse_id,
                "fd_meal_type": meal.get("meal_type", "General"),
                "fd_food_type": meal.get("food", ""),
                "fd_qty": meal.get("amount", ""),
                "fd_time": meal.get("time", ""),
                "completed": meal.get("completed", False),
                "completed_at": meal.get("completed_at"),
            }
            
            # Remove None values
            meal_data = {k: v for k, v in meal_data.items() if v is not None}
            
            service_client.table("feed_detail").insert(meal_data).execute()
        
        return Response({"message": "Feeding schedule saved successfully"}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error saving feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def mark_meal_fed(request):
    """
    Mark a meal as fed/completed
    """
    try:
        data = request.data
        user_id = data.get("user_id")
        horse_id = data.get("horse_id")
        fd_id = data.get("fd_id")
        completed_at = data.get("completed_at", datetime.now().isoformat())
        
        if not user_id or not horse_id or not fd_id:
            return Response({"error": "user_id, horse_id, and fd_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update the meal record in feed_detail table - only update existing columns
        update_data = {
            "completed": True,
            "completed_at": completed_at,
        }
        
        response = service_client.table("feed_detail").update(update_data).eq(
            "fd_id", fd_id
        ).eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        # Also log this feeding in a separate log table
        # First get the meal details
        meal_response = service_client.table("feed_detail").select("*").eq("fd_id", fd_id).execute()
        
        if meal_response.data:
            meal = meal_response.data[0]
            log_data = {
                "user_id": user_id,
                "horse_id": horse_id,
                "fd_meal_type": meal.get("fd_meal_type"),
                "fd_food_type": meal.get("fd_food_type"),
                "fd_qty": meal.get("fd_qty"),
                "fd_time": meal.get("fd_time"),
                "completed_at": completed_at,
            }
            
            # Check if feed_log table exists, if not, we'll just skip logging
            try:
                service_client.table("feed_log").insert(log_data).execute()
            except Exception as log_error:
                print(f"Warning: Could not log to feed_log table: {log_error}")
                # Continue without failing the main operation
        
        return Response({"message": "Meal marked as fed successfully"}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error marking meal as fed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_feeding_log(request):
    """
    Get feeding log for a specific user and horse
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    limit = request.GET.get("limit", 50)
    offset = request.GET.get("offset", 0)
    
    if not user_id or not horse_id:
        return Response({"error": "user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to get feeding log from supabase
        try:
            response = service_client.table("feed_log").select(
                "log_id, user_id, horse_id, fd_meal_type, fd_food_type, fd_qty, fd_time, completed_at"
            ).eq("user_id", user_id).eq("horse_id", horse_id).order(
                "completed_at", desc=True  # Use completed_at for ordering since logged_at might not exist
            ).limit(limit).offset(offset).execute()
            
            if not response.data:
                return Response([], status=status.HTTP_200_OK)
            
            return Response(response.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # If feed_log table doesn't exist, return empty array
            if "Could not find the table" in str(e):
                return Response([], status=status.HTTP_200_OK)
            raise e
        
    except Exception as e:
        print(f"Error fetching feeding log: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def debug_table_structure(request):
    """
    Debug endpoint to check the structure of your tables
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to get a sample record to see the structure
        feed_detail_sample = service_client.table("feed_detail").select("*").limit(1).execute()
        
        # Try to get feed_log structure if it exists
        try:
            feed_log_sample = service_client.table("feed_log").select("*").limit(1).execute()
        except:
            feed_log_sample = {"data": [], "error": "Table does not exist"}
        
        return Response({
            "feed_detail_columns": list(feed_detail_sample.data[0].keys()) if feed_detail_sample.data else [],
            "feed_log_columns": list(feed_log_sample.data[0].keys()) if feed_log_sample.data else [],
            "feed_detail_sample": feed_detail_sample.data[0] if feed_detail_sample.data else {},
            "feed_log_exists": bool(feed_log_sample.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
            'barangay': profile.get('kutsero_bray', ''),
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
    Fetch announcements from Supabase with comment counts
    """
    try:
        # Fetch announcements
        announcements_response = supabase.table("announcement") \
            .select("*") \
            .order("announce_date", desc=True) \
            .execute()

        print(f"[DEBUG] Raw announcements response: {announcements_response.data}")

        if announcements_response.data:
            announcements_with_counts = []
            
            for announcement in announcements_response.data:
                # Use announce_id as the primary key (not id)
                announce_id = announcement.get("announce_id")
                if not announce_id:
                    print(f"[WARN] Skipping announcement without announce_id: {announcement}")
                    continue
                    
                # Get comment count for each announcement
                try:
                    comment_count_response = supabase.table("comment") \
                        .select("id", count="exact") \
                        .eq("announcement_id", announce_id) \
                        .execute()
                    
                    comment_count = comment_count_response.count or 0
                except Exception as e:
                    print(f"[WARN] Error getting comment count for announcement {announce_id}: {e}")
                    comment_count = 0
                
                # Ensure all required fields are present - use announce_id as id for frontend
                announcement_data = {
                    "id": announce_id,  # Frontend expects 'id', but we use announce_id from DB
                    "announce_id": announce_id,  # Keep original field for reference
                    "announce_title": announcement.get("announce_title", "Untitled"),
                    "announce_content": announcement.get("announce_content", ""),
                    "announce_date": announcement.get("announce_date", ""),
                    "announce_status": announcement.get("announce_status", "active"),
                    "created_at": announcement.get("created_at", ""),
                    "comment_count": comment_count
                }
                
                print(f"[DEBUG] Processed announcement: ID={announcement_data['id']}, Title={announcement_data['announce_title']}")
                announcements_with_counts.append(announcement_data)
            
            print(f"[DEBUG] Total valid announcements: {len(announcements_with_counts)}")
            return Response({"announcements": announcements_with_counts}, status=status.HTTP_200_OK)
        else:
            print("[DEBUG] No announcements found")
            return Response({"announcements": []}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Error in get_announcements: {e}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_announcement_comments(request, announcement_id):
    """
    Fetch comments for a specific announcement
    """
    try:
        print(f"[DEBUG] Fetching comments for announcement ID: {announcement_id}")
        
        # Validate announcement_id
        if not announcement_id or announcement_id == "undefined":
            return Response({"error": "Invalid announcement ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if announcement exists (using announce_id)
        announcement_response = supabase.table("announcement").select("announce_id").eq("announce_id", announcement_id).execute()
        if not announcement_response.data:
            return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

        # Fetch comments
        comments_response = supabase.table("comment") \
            .select("*") \
            .eq("announcement_id", announcement_id) \
            .order("comment_date", desc=True) \
            .execute()

        print(f"[DEBUG] Found {len(comments_response.data) if comments_response.data else 0} comments")

        if comments_response.data:
            formatted_comments = []
            for comment in comments_response.data:
                formatted_comment = {
                    "id": comment["id"],
                    "comment_text": comment["comment_text"],
                    "comment_date": comment["comment_date"],
                    "kutsero_id": comment["kutsero_id"],
                    "announcement_id": comment["announcement_id"],
                }
                
                # Try to fetch user details separately
                try:
                    user_response = supabase.table("users") \
                        .select("id, email, user_metadata") \
                        .eq("id", comment["kutsero_id"]) \
                        .execute()
                    
                    if user_response.data and len(user_response.data) > 0:
                        user_data = user_response.data[0]
                        metadata = user_data.get("user_metadata", {})
                        formatted_comment.update({
                            "kutsero_fname": metadata.get("kutsero_fname"),
                            "kutsero_lname": metadata.get("kutsero_lname"),
                            "kutsero_username": metadata.get("kutsero_username"),
                            "user_email": user_data.get("email"),
                        })
                except Exception as user_error:
                    print(f"[WARN] Error fetching user details for comment {comment['id']}: {user_error}")
                    formatted_comment.update({
                        "kutsero_fname": "Unknown",
                        "kutsero_lname": "User",
                        "kutsero_username": None,
                    })
                
                formatted_comments.append(formatted_comment)
            
            return Response({"comments": formatted_comments}, status=status.HTTP_200_OK)
        else:
            return Response({"comments": []}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Error in get_announcement_comments: {e}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def post_announcement_comment(request, announcement_id):
    """
    Post a comment to a specific announcement
    """
    try:
        print(f"[DEBUG] Posting comment to announcement ID: {announcement_id}")
        
        # Validate announcement_id
        if not announcement_id or announcement_id == "undefined":
            return Response({"error": "Invalid announcement ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get request data
        comment_text = request.data.get("comment_text", "").strip()
        kutsero_id = request.data.get("kutsero_id")

        print(f"[DEBUG] Comment data: text='{comment_text[:50]}...', kutsero_id={kutsero_id}")

        # Validation
        if not comment_text:
            return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(comment_text) > 500:
            return Response({"error": "Comment is too long (max 500 characters)"}, status=status.HTTP_400_BAD_REQUEST)

        if not kutsero_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if announcement exists (using announce_id)
        announcement_response = supabase.table("announcement").select("announce_id").eq("announce_id", announcement_id).execute()
        if not announcement_response.data:
            return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

        # Insert comment
        comment_data = {
            "comment_text": comment_text,
            "kutsero_id": kutsero_id,
            "announcement_id": announcement_id,
            "comment_date": datetime.now().isoformat()
        }

        print(f"[DEBUG] Inserting comment data: {comment_data}")

        response = supabase.table("comment").insert(comment_data).execute()

        if response.data:
            comment = response.data[0]
            formatted_comment = {
                "id": comment["id"],
                "comment_text": comment["comment_text"],
                "comment_date": comment["comment_date"],
                "kutsero_id": comment["kutsero_id"],
                "announcement_id": comment["announcement_id"],
                "kutsero_fname": "Current",
                "kutsero_lname": "User",
            }

            print(f"[DEBUG] Comment posted successfully: {comment['id']}")

            return Response({
                "message": "Comment posted successfully",
                "comment": formatted_comment
            }, status=status.HTTP_201_CREATED)

        return Response({"error": "Failed to post comment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print(f"[ERROR] Error in post_announcement_comment: {e}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Replace your announcement_comments_handler function with this:

@api_view(["GET", "POST"])
def announcement_comments_handler(request, announcement_id):
    """
    Handle both GET and POST requests for announcement comments
    """
    try:
        print(f"[DEBUG] {request.method} request for announcement ID: {announcement_id}")
        
        # Validate announcement_id
        if not announcement_id or announcement_id == "undefined":
            return Response({"error": "Invalid announcement ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.method == "GET":
            # GET: Fetch comments for announcement
            # Check if announcement exists (using announce_id)
            announcement_response = supabase.table("announcement").select("announce_id").eq("announce_id", announcement_id).execute()
            if not announcement_response.data:
                return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

            # Fetch comments
            comments_response = supabase.table("comment") \
                .select("*") \
                .eq("announcement_id", announcement_id) \
                .order("comment_date", desc=True) \
                .execute()

            print(f"[DEBUG] Found {len(comments_response.data) if comments_response.data else 0} comments")

            if comments_response.data:
                formatted_comments = []
                for comment in comments_response.data:
                    formatted_comment = {
                        "id": comment["id"],
                        "comment_text": comment["comment_text"],
                        "comment_date": comment["comment_date"],
                        "kutsero_id": comment["kutsero_id"],
                        "announcement_id": comment["announcement_id"],
                    }
                    
                    # Try to fetch user details separately
                    try:
                        user_response = supabase.table("users") \
                            .select("id, email, user_metadata") \
                            .eq("id", comment["kutsero_id"]) \
                            .execute()
                        
                        if user_response.data and len(user_response.data) > 0:
                            user_data = user_response.data[0]
                            metadata = user_data.get("user_metadata", {})
                            formatted_comment.update({
                                "kutsero_fname": metadata.get("kutsero_fname"),
                                "kutsero_lname": metadata.get("kutsero_lname"),
                                "kutsero_username": metadata.get("kutsero_username"),
                                "user_email": user_data.get("email"),
                            })
                    except Exception as user_error:
                        print(f"[WARN] Error fetching user details for comment {comment['id']}: {user_error}")
                        formatted_comment.update({
                            "kutsero_fname": "Unknown",
                            "kutsero_lname": "User",
                            "kutsero_username": None,
                        })
                    
                    formatted_comments.append(formatted_comment)
                
                return Response({"comments": formatted_comments}, status=status.HTTP_200_OK)
            else:
                return Response({"comments": []}, status=status.HTTP_200_OK)

        elif request.method == "POST":
            # POST: Create new comment
            # Get request data
            comment_text = request.data.get("comment_text", "").strip()
            kutsero_id = request.data.get("kutsero_id")

            print(f"[DEBUG] Comment data: text='{comment_text[:50] if comment_text else ''}...', kutsero_id={kutsero_id}")

            # Validation
            if not comment_text:
                return Response({"error": "Comment text is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            if len(comment_text) > 500:
                return Response({"error": "Comment is too long (max 500 characters)"}, status=status.HTTP_400_BAD_REQUEST)

            if not kutsero_id:
                return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if announcement exists (using announce_id)
            announcement_response = supabase.table("announcement").select("announce_id").eq("announce_id", announcement_id).execute()
            if not announcement_response.data:
                return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

            # Insert comment
            comment_data = {
                "comment_text": comment_text,
                "kutsero_id": kutsero_id,
                "announcement_id": announcement_id,
                "comment_date": datetime.now().isoformat()
            }

            print(f"[DEBUG] Inserting comment data: {comment_data}")

            response = supabase.table("comment").insert(comment_data).execute()

            if response.data:
                comment = response.data[0]
                formatted_comment = {
                    "id": comment["id"],
                    "comment_text": comment["comment_text"],
                    "comment_date": comment["comment_date"],
                    "kutsero_id": comment["kutsero_id"],
                    "announcement_id": comment["announcement_id"],
                    "kutsero_fname": "Current",
                    "kutsero_lname": "User",
                }

                print(f"[DEBUG] Comment posted successfully: {comment['id']}")

                return Response({
                    "message": "Comment posted successfully",
                    "comment": formatted_comment
                }, status=status.HTTP_201_CREATED)

            return Response({"error": "Failed to post comment"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print(f"[ERROR] Error in announcement_comments_handler: {e}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    

# ------------------------------------------------ CALENDAR ------------------------------------------------

@api_view(['GET'])
def get_calendar_events(request):
    """
    Retrieves all events from the calendar_events table.
    """
    events = []
    try:
        with connection.cursor() as cursor:
            # Query the database directly
            cursor.execute("SELECT id, title_event, date, time FROM calendar_events ORDER BY date, time")
            rows = cursor.fetchall()
            
            # Manually map rows to a list of dictionaries
            for row in rows:
                events.append({
                    'id': row[0],
                    'title_event': row[1],
                    'date': str(row[2]), # Convert date object to string
                    'time': str(row[3]), # Convert time object to string
                })
        
        return JsonResponse({'success': True, 'events': events})

    except Exception as e:
        print(f"Error fetching events: {e}")
        return JsonResponse({'success': False, 'message': 'Failed to retrieve events'}, status=500)


@api_view(['POST'])
def create_calendar_event(request):
    """
    Creates a new calendar event in Supabase.
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # CHANGE THIS LINE
        title = request.data.get('title_event')  # <-- Corrected key name
        date = request.data.get('date')
        time = request.data.get('time')

        if not all([title, date, time]):
            return Response({"error": "Missing event data."}, status=status.HTTP_400_BAD_REQUEST)

        event_data = {
            'title_event': title,
            'date': date,
            'time': time
        }

        response = service_client.table("calendar_events").insert(event_data).execute()

        return Response({"message": "Event created successfully", "data": response.data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error creating event: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_calendar_event(request, pk):
    """
    Deletes a specific calendar event using the Supabase client.
    """
    try:
        # Create a Supabase client
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Perform the delete operation on the 'calendar_event' table
        # We assume the primary key is named 'id' in your Supabase table.
        # The .eq() method filters for the row where the 'id' column matches the provided pk.
        delete_response = service_client.table("calendar_events").delete().eq("id", pk).execute()
        
        # Supabase returns a list of deleted rows. If the list is empty,
        # no row was found and nothing was deleted.
        if not delete_response.data:
            return Response({'error': 'Event not found or already deleted'}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({'success': 'Event deleted successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error deleting calendar event: {e}")
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


from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
<<<<<<< Updated upstream
<<<<<<< Updated upstream
from datetime import datetime, date
=======
import requests
import time
from datetime import datetime, timezone
>>>>>>> Stashed changes
=======
import requests
import time
from datetime import datetime, timezone
>>>>>>> Stashed changes

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

# ------------------------------------------------ HORSE ASSIGNMENT API ------------------------------------------------

<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
def assign_horse(request):
    """
    Assign a horse to a kutsero and immediately check them in (set date_start to now)
    This represents the kutsero checking in with the horse
    """
    try:
        print(f"Received request data: {request.data}")
        
        kutsero_id = request.data.get("kutsero_id")
        horse_id = request.data.get("horse_id")
        # Remove date_start from request - we'll set it to now (check-in time)
        force_switch = request.data.get("force_switch", False)
        
        print(f"Parsed data - kutsero_id: {kutsero_id}, horse_id: {horse_id}, force_switch: {force_switch}")
        
        if not kutsero_id or not horse_id:
            print("Missing required fields")
            return Response({
                "error": "Both kutsero_id and horse_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        now = datetime.now().isoformat()  # Current timestamp for check-in
        
        print(f"Check-in time: {now}")
        
        # Check if horse exists first
        try:
            horse_check = service_client.table("horse_profile").select("horse_id").eq("horse_id", horse_id).execute()
            if not horse_check.data:
                print(f"Horse with ID {horse_id} not found")
                return Response({
                    "error": "Horse not found"
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error checking horse existence: {e}")
            return Response({
                "error": f"Error validating horse: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check if horse is already checked in (has active assignment without check-out)
        try:
            print("Checking if horse is already checked in...")
            existing_assignment = service_client.table("horse_assignment")\
                .select("assign_id, kutsero_id, date_start, date_end")\
                .eq("horse_id", horse_id)\
                .is_("date_end", "null")\
                .execute()  # Only get assignments without check-out
            
            print(f"Found {len(existing_assignment.data)} active assignments for horse {horse_id}")
            
            # Check if horse is checked in with someone else
            other_kutsero_assignments = [a for a in existing_assignment.data if a['kutsero_id'] != kutsero_id]
            if other_kutsero_assignments:
                print(f"Horse is already checked in with another kutsero: {other_kutsero_assignments[0]}")
                return Response({
                    "error": "Horse is already checked in with another kutsero"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Error checking existing horse assignments: {e}")
            return Response({
                "error": f"Error checking horse availability: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Handle kutsero's existing assignments (check them out automatically)
        try:
            print("Checking kutsero's current check-ins...")
            existing_kutsero_assignment = service_client.table("horse_assignment")\
                .select("assign_id, horse_id, date_start, date_end")\
                .eq("kutsero_id", kutsero_id)\
                .is_("date_end", "null")\
                .execute()  # Only get assignments without check-out
            
            print(f"Found {len(existing_kutsero_assignment.data)} active assignments for kutsero {kutsero_id}")
            
            # If kutsero has active assignments, check them out automatically
            checked_out_assignments = []
            if existing_kutsero_assignment.data:
                print(f"Kutsero has {len(existing_kutsero_assignment.data)} active assignments, checking them out...")
                
                for assignment in existing_kutsero_assignment.data:
                    try:
                        print(f"Checking out from assignment: {assignment['assign_id']}")
                        checkout_time = datetime.now().isoformat()
                        end_result = service_client.table("horse_assignment")\
                            .update({"date_end": checkout_time})\
                            .eq("assign_id", assignment['assign_id'])\
                            .execute()
                        
                        if end_result.data:
                            checked_out_assignments.append(assignment['assign_id'])
                            print(f"Successfully checked out from assignment: {assignment['assign_id']}")
                        else:
                            print(f"Failed to check out from assignment: {assignment['assign_id']}")
                    except Exception as checkout_error:
                        print(f"Error checking out from assignment {assignment['assign_id']}: {checkout_error}")
                        continue
                
                print(f"Successfully checked out from {len(checked_out_assignments)} assignments")
                
                # Wait for database consistency
                import time
                time.sleep(0.5)
                
        except Exception as e:
            print(f"Error handling existing kutsero assignments: {e}")
            return Response({
                "error": f"Error handling existing assignments: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate UUID for new assignment
        try:
            assignment_id = str(uuid.uuid4())
            print(f"Generated assignment ID: {assignment_id}")
        except Exception as e:
            print(f"Error generating UUID: {e}")
            return Response({
                "error": "Error generating assignment ID"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create new assignment (check-in)
        assignment_data = {
            "assign_id": assignment_id,
            "kutsero_id": kutsero_id,
            "horse_id": horse_id,
            "date_start": now,  # Check-in timestamp
            "date_end": None    # Will be set when kutsero checks out
        }
        
        print(f"Creating check-in assignment with data: {assignment_data}")
        
        try:
            result = service_client.table("horse_assignment").insert(assignment_data).execute()
            print(f"Insert result: {result}")
            
            if result.data:
                print("Check-in successful")
                return Response({
                    "message": "Successfully checked in with horse",
                    "assignment": result.data[0],
                    "previous_assignments_ended": len(checked_out_assignments) if 'checked_out_assignments' in locals() else 0,
                    "checked_in_at": now
                }, status=status.HTTP_201_CREATED)
            else:
                print("Insert returned no data")
                return Response({
                    "error": "Failed to create check-in - no data returned"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print(f"Error inserting assignment: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return Response({
                "error": f"Database insert error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print(f"Unexpected error in assign_horse: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    Get current horse assignment for a kutsero (currently checked in)
    """
    kutsero_id = request.GET.get("kutsero_id")
    
    if not kutsero_id:
        return Response({
            "error": "kutsero_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get active assignment (where date_end is null - not checked out yet)
        assignment_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, date_start, date_end"
        ).eq("kutsero_id", kutsero_id)\
         .is_("date_end", "null")\
         .order("date_start", desc=True)\
         .limit(1)\
         .execute()
        
        print(f"Found {len(assignment_response.data or [])} active assignments for kutsero {kutsero_id}")
        
        if assignment_response.data:
            assignment = assignment_response.data[0]
            print(f"Found active assignment: {assignment['assign_id']}")
            
            # Get horse details
            horse_response = service_client.table("horse_profile").select(
                "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, op_id"
            ).eq("horse_id", assignment['horse_id']).execute()
            
            if horse_response.data:
                horse = horse_response.data[0]
                
                # Get op details
                op_name = "Unknown Op"
                if horse.get('op_id'):
                    op_response = service_client.table("horse_op_profile").select(
                        "op_fname, op_mname, op_lname"
                    ).eq("op_id", horse['op_id']).execute()
                    
                    if op_response.data:
                        op = op_response.data[0]
                        name_parts = []
                        if op.get('op_fname'):
                            name_parts.append(op['op_fname'])
                        if op.get('op_mname'):
                            name_parts.append(op['op_mname'])
                        if op.get('op_lname'):
                            name_parts.append(op['op_lname'])
                        
                        if name_parts:
                            op_name = " ".join(name_parts)
                
                return Response({
                    'assignment': {
                        'assignmentId': assignment['assign_id'],
                        'checkedInAt': assignment['date_start'],    # Check-in time
                        'checkedOutAt': assignment['date_end'],     # Will be null
                        'horse': {
                            'id': horse['horse_id'],
                            'name': horse['horse_name'] or 'Unnamed Horse',
                            'breed': horse['horse_breed'] or 'Mixed Breed',
                            'age': horse['horse_age'] or 5,
                            'color': horse['horse_color'] or 'Brown',
                            'image': horse['horse_image'],
                            'healthStatus': 'Healthy',
                            'status': 'Currently checked in',
                            'opName': op_name,
                            'ownerName': op_name,
                            'operatorName': op_name,
                            'lastCheckup': f"{((datetime.now() - datetime(2024, 5, 25)).days)} days ago",
                            'nextCheckup': "June 15, 2025"
                        }
                    }
                }, status=status.HTTP_200_OK)
        
        print("No active assignment found")
        return Response({
            'assignment': None,
            'message': 'No active horse assignment found'
        }, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"Error getting kutsero assignment: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
=======
=======
>>>>>>> Stashed changes
@api_view(['POST'])
def assign_horse(request):
    """
    Assign a horse to a kutsero for a specific date
    """
    kutsero_id = request.data.get("kutsero_id")
    horse_id = request.data.get("horse_id")
    date_start = request.data.get("date_start")
    date_end = request.data.get("date_end")
    
    if not all([kutsero_id, horse_id, date_start]):
        return Response({
            "error": "kutsero_id, horse_id, and date_start are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if horse is already assigned for the same date range
        existing_assignment = supabase.table("horse_assignment").select("*").eq("horse_id", horse_id).eq("date_start", date_start).execute()
        
        if existing_assignment.data:
            return Response({
                "error": "Horse is already assigned for this date"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payload = {
            "kutsero_id": kutsero_id,
            "horse_id": horse_id,
            "date_start": date_start,
            "date_end": date_end or date_start,  # Default to same day if no end date
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_assignment").insert(payload).execute()
        
        if data.data:
            return Response({
                "message": "Horse assigned successfully", 
                "data": data.data[0]
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": str(data.error)}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
<<<<<<< Updated upstream
<<<<<<< Updated upstream
def test_connection(request):
    return Response({"message": "Kutsero API is working"}, status=status.HTTP_200_OK)


# ------------------------------------------------ FEED MANAGEMENT API ------------------------------------------------

import uuid
from datetime import datetime, timezone

@api_view(['GET'])
def get_feeds(request, user_id, horse_id):
    """
    Get all feeds for a specific user and horse
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all feeds for this user and horse using correct column names
        feeds_response = service_client.table("feed_detail").select(
            "fd_id, fd_meal_type, fd_food_type, fd_qty, fd_time, user_id, horse_id, completed, completed_at, updated_at"
        ).eq("user_id", user_id).eq("horse_id", horse_id).order("updated_at", desc=False).execute()
        
        feeds = feeds_response.data or []
        
        # Transform data to match frontend expectations
        transformed_feeds = []
        for feed in feeds:
            transformed_feeds.append({
                'feed_id': feed['fd_id'],  # Map fd_id to feed_id for frontend
                'user_id': feed['user_id'],
                'horse_id': feed['horse_id'],
                'food': feed.get('fd_food_type', ''),
                'amount': feed.get('fd_qty', ''),
                'time': feed.get('fd_meal_type', ''),
                'completed': feed.get('completed', False),
                'completed_at': feed.get('completed_at'),
                'created_at': feed.get('updated_at'),
                'updated_at': feed.get('updated_at')
            })
        
        return Response({
            'success': True,
            'feeds': transformed_feeds,
            'total_count': len(transformed_feeds)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error fetching feeds: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_multiple_feeds(request):
    """
    Create multiple feeds for a meal
    """
    try:
        data = request.data
        user_id = data.get('user_id')
        horse_id = data.get('horse_id')
        meal_type = data.get('meal_type')
        feeds_data = data.get('feeds', [])
        
        if not all([user_id, horse_id, meal_type, feeds_data]):
            return Response({
                'success': False,
                'error': 'Missing required fields: user_id, horse_id, meal_type, feeds'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        current_time = datetime.now(timezone.utc).isoformat()
        
        created_feeds = []
        
        for feed_data in feeds_data:
            # Build food string from components
            food_components = []
            
            if feed_data.get('chaff'):
                food_components.append(f"Chaff: {feed_data['chaff']}")
            if feed_data.get('restone') and meal_type == 'breakfast':
                food_components.append(f"Restone: {feed_data['restone']}")
            if feed_data.get('magnesium') and meal_type == 'dinner':
                food_components.append(f"Magnesium: {feed_data['magnesium']}")
            if feed_data.get('dynamy'):
                food_components.append(f"Dynamy: {feed_data['dynamy']}")
            
            food_string = ", ".join(food_components) if food_components else "No food specified"
            
            # Calculate total amount
            amount_parts = []
            for component in food_components:
                if ":" in component:
                    amount_parts.append(component.split(":")[1].strip())
            amount = ", ".join(amount_parts) if amount_parts else "0"
            
            # Create feed record with correct column names
            feed_record = {
                'fd_id': str(uuid.uuid4()),
                'user_id': user_id,
                'horse_id': horse_id,
                'fd_food_type': food_string,
                'fd_qty': amount,
                'fd_meal_type': meal_type,
                'fd_time': meal_type,
                'completed': False,
                'completed_at': None,
                'updated_at': current_time
            }
            
            # Insert feed record
            result = service_client.table("feed_detail").insert(feed_record).execute()
            
            if result.data:
                created_feeds.extend(result.data)
        
        return Response({
            'success': True,
            'message': f'Successfully created {len(created_feeds)} feeds',
            'feeds': created_feeds
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Error creating feeds: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def mark_feed_completed(request, feed_id):
    """
    Mark a feed as completed
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Update feed to completed using correct column name
        result = service_client.table("feed_detail").update({
            'completed': True,
            'completed_at': current_time,
            'updated_at': current_time
        }).eq('fd_id', feed_id).execute()  # Use fd_id here
        
        if result.data:
            return Response({
                'success': True,
                'message': 'Feed marked as completed',
                'feed': result.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': 'Feed not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error marking feed as completed: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def clear_meal_feeds(request, user_id, horse_id, meal_type):
    """
    Clear all feeds for a specific meal type
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete all feeds for this meal type using correct column name
        result = service_client.table("feed_detail").delete().eq('user_id', user_id)\
                .eq('horse_id', horse_id).eq('fd_meal_type', meal_type).execute()
        
        return Response({
            'success': True,
            'message': f'Successfully cleared {meal_type} feeds',
            'deleted_count': len(result.data) if result.data else 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error clearing meal feeds: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_feed(request, feed_id):
    """
    Delete a specific feed
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete the feed using correct column name
        result = service_client.table("feed_detail").delete().eq('fd_id', feed_id).execute()
        
        if result.data:
            return Response({
                'success': True,
                'message': 'Feed deleted successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': 'Feed not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error deleting feed: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_feed_log(request, user_id, horse_id):
    """
    Get feed log with filtering options
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get query parameters
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        meal_type = request.GET.get('meal_type')
        completed_only = request.GET.get('completed_only') == 'true'
        limit = int(request.GET.get('limit', 50))
        offset = int(request.GET.get('offset', 0))
        
        # Build query with correct column names
        query = service_client.table("feed_detail").select(
            "fd_id, user_id, horse_id, fd_food_type, fd_qty, fd_meal_type, fd_time, completed, completed_at, updated_at"
        ).eq("user_id", user_id).eq("horse_id", horse_id)
        
        # Apply filters
        if date_from:
            query = query.gte('updated_at', date_from)
        if date_to:
            query = query.lte('updated_at', date_to)
        if meal_type:
            query = query.eq('fd_meal_type', meal_type)
        if completed_only:
            query = query.eq('completed', True)
        
        # Apply pagination and ordering
        query = query.order('updated_at', desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        feeds = result.data or []
        
        # Transform data for frontend
        transformed_feeds = []
        for feed in feeds:
            transformed_feeds.append({
                'feed_id': feed['fd_id'],
                'user_id': feed['user_id'],
                'horse_id': feed['horse_id'],
                'food': feed.get('fd_food_type', ''),
                'amount': feed.get('fd_qty', ''),
                'time': feed.get('fd_meal_type', ''),
                'completed': feed.get('completed', False),
                'completed_at': feed.get('completed_at'),
                'created_at': feed.get('updated_at'),
                'updated_at': feed.get('updated_at')
            })
        
        # Get total count for pagination using correct column name
        count_query = service_client.table("feed_detail").select(
            "fd_id", count="exact"
        ).eq("user_id", user_id).eq("horse_id", horse_id)
        
        if date_from:
            count_query = count_query.gte('updated_at', date_from)
        if date_to:
            count_query = count_query.lte('updated_at', date_to)
        if meal_type:
            count_query = count_query.eq('fd_meal_type', meal_type)
        if completed_only:
            count_query = count_query.eq('completed', True)
        
        count_result = count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(feeds)
        
        # Calculate statistics
        completed_feeds = [f for f in feeds if f.get('completed')]
        pending_feeds = [f for f in feeds if not f.get('completed')]
        
        # Group by meal type
        breakfast_feeds = [f for f in feeds if f.get('fd_meal_type') == 'breakfast']
        lunch_feeds = [f for f in feeds if f.get('fd_meal_type') == 'lunch']
        dinner_feeds = [f for f in feeds if f.get('fd_meal_type') == 'dinner']
        
        return Response({
            'success': True,
            'feeds': transformed_feeds,
            'pagination': {
                'total_count': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': len(feeds) == limit
            },
            'statistics': {
                'total_feeds': len(feeds),
                'completed_feeds': len(completed_feeds),
                'pending_feeds': len(pending_feeds),
                'breakfast_count': len(breakfast_feeds),
                'lunch_count': len(lunch_feeds),
                'dinner_count': len(dinner_feeds)
            },
            'filters_applied': {
                'date_from': date_from,
                'date_to': date_to,
                'meal_type': meal_type,
                'completed_only': completed_only
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error fetching feed log: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_feed_statistics(request, user_id, horse_id):
    """
    Get feeding statistics for a horse
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get date range (default to last 30 days)
        from datetime import timedelta
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).isoformat()
        if not date_to:
            date_to = datetime.now().isoformat()
        
        # Get all feeds in date range using correct column names
        feeds_response = service_client.table("feed_detail").select(
            "fd_id, fd_food_type, fd_qty, fd_meal_type, completed, completed_at, updated_at"
        ).eq("user_id", user_id).eq("horse_id", horse_id)\
         .gte('updated_at', date_from).lte('updated_at', date_to).execute()
        
        feeds = feeds_response.data or []
        
        # Calculate statistics
        stats = {
            'total_feeds': len(feeds),
            'completed_feeds': len([f for f in feeds if f.get('completed')]),
            'pending_feeds': len([f for f in feeds if not f.get('completed')]),
            'completion_rate': 0,
            'meal_breakdown': {
                'breakfast': {
                    'total': len([f for f in feeds if f.get('fd_meal_type') == 'breakfast']),
                    'completed': len([f for f in feeds if f.get('fd_meal_type') == 'breakfast' and f.get('completed')]),
                    'completion_rate': 0
                },
                'lunch': {
                    'total': len([f for f in feeds if f.get('fd_meal_type') == 'lunch']),
                    'completed': len([f for f in feeds if f.get('fd_meal_type') == 'lunch' and f.get('completed')]),
                    'completion_rate': 0
                },
                'dinner': {
                    'total': len([f for f in feeds if f.get('fd_meal_type') == 'dinner']),
                    'completed': len([f for f in feeds if f.get('fd_meal_type') == 'dinner' and f.get('completed')]),
                    'completion_rate': 0
                }
            },
            'date_range': {
                'from': date_from,
                'to': date_to
            }
        }
        
        # Calculate completion rates
        if stats['total_feeds'] > 0:
            stats['completion_rate'] = round((stats['completed_feeds'] / stats['total_feeds']) * 100, 2)
        
        for meal_type in ['breakfast', 'lunch', 'dinner']:
            meal_stats = stats['meal_breakdown'][meal_type]
            if meal_stats['total'] > 0:
                meal_stats['completion_rate'] = round((meal_stats['completed'] / meal_stats['total']) * 100, 2)
        
        return Response({
            'success': True,
            'statistics': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error fetching feed statistics: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def bulk_update_feeds(request):
    """
    Bulk update multiple feeds (e.g., mark multiple as completed)
    """
    try:
        data = request.data
        feed_ids = data.get('feed_ids', [])
        updates = data.get('updates', {})
        
        if not feed_ids or not updates:
            return Response({
                'success': False,
                'error': 'feed_ids and updates are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Add timestamp to updates
        updates['updated_at'] = current_time
        
        # If marking as completed, add completed_at timestamp
        if updates.get('completed') is True:
            updates['completed_at'] = current_time
        
        updated_feeds = []
        
        # Update each feed individually using correct column name
        for feed_id in feed_ids:
            result = service_client.table("feed_detail").update(updates).eq('fd_id', feed_id).execute()
            if result.data:
                updated_feeds.extend(result.data)
        
        return Response({
            'success': True,
            'message': f'Successfully updated {len(updated_feeds)} feeds',
            'updated_feeds': updated_feeds
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error bulk updating feeds: {e}")
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
=======
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
>>>>>>> Stashed changes
=======
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
>>>>>>> Stashed changes

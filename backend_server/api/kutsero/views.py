from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import uuid
from datetime import datetime, date

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

# ------------------------------------------------ HORSE ASSIGNMENT API ------------------------------------------------

@api_view(['GET'])
def available_horses(request):
    """
    Get all horses with their operator info for horse selection
    """
    operator_id = request.GET.get("operator_id")
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())
        
        # Get all horses
        horses_response = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, operator_id"
        ).execute()
        
        if not horses_response.data:
            return Response({
                'horses': [],
                'total_count': 0,
                'available_count': 0,
                'assigned_count': 0
            }, status=status.HTTP_200_OK)
        
        # Get all operators from horse_operator_profile table
        operators_response = service_client.table("horse_operator_profile").select(
            "operator_id, operator_fname, operator_lname"
        ).execute()
        
        # Get all active assignments (where date_end is null or >= today)
        active_assignments_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, kutsero_id, date_start, date_end"
        ).or_(
            f"date_end.is.null,date_end.gte.{today}"
        ).lte("date_start", today).execute()
        
        # Create lookup dictionaries
        operators_dict = {}
        if operators_response.data:
            operators_dict = {op['operator_id']: op for op in operators_response.data}
        
        assignments_dict = {}
        if active_assignments_response.data:
            assignments_dict = {assign['horse_id']: assign for assign in active_assignments_response.data}
        
        # Transform data
        horses = []
        for horse in horses_response.data:
            # Get operator info
            operator_name = "Unknown Operator"
            if horse.get('operator_id'):  # Check if operator_id exists and is not None
                operator = operators_dict.get(horse['operator_id'])
                if operator:
                    if operator.get('operator_fname') and operator.get('operator_lname'):
                        operator_name = f"{operator['operator_fname']} {operator['operator_lname']}"
                    elif operator.get('operator_fname'):
                        operator_name = operator['operator_fname']
                    elif operator.get('operator_lname'):
                        operator_name = operator['operator_lname']
                    else:
                        operator_name = "Unnamed Operator"
                else:
                    operator_name = "Operator Not Found"
            else:
                operator_name = "No Operator Assigned"
            
            # Check assignment status
            assignment = assignments_dict.get(horse['horse_id'])
            if assignment:
                assignment_status = 'assigned'
                health_status = 'Under Care'
                status_text = 'Currently assigned'
                current_assignment_id = assignment['assign_id']
                assignment_start = assignment['date_start']
                assignment_end = assignment['date_end']
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
                'operatorName': operator_name,
                'assignmentStatus': assignment_status,
                'currentAssignmentId': current_assignment_id,
                'assignmentStart': assignment_start,
                'assignmentEnd': assignment_end,
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
    Assign a horse to a kutsero (create horse assignment)
    """
    try:
        # Log the incoming request data for debugging
        print(f"Received request data: {request.data}")
        
        kutsero_id = request.data.get("kutsero_id")
        horse_id = request.data.get("horse_id")
        date_start = request.data.get("date_start", str(date.today()))
        date_end = request.data.get("date_end")  # Optional, can be null for indefinite assignment
        
        print(f"Parsed data - kutsero_id: {kutsero_id}, horse_id: {horse_id}, date_start: {date_start}, date_end: {date_end}")
        
        if not kutsero_id or not horse_id:
            print("Missing required fields")
            return Response({
                "error": "Both kutsero_id and horse_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())
        print(f"Today's date: {today}")
        
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
        
        # Check if kutsero exists (assuming you have a kutsero table)
        # Uncomment if you have a kutsero profile table
        # try:
        #     kutsero_check = service_client.table("kutsero_profile").select("kutsero_id").eq("kutsero_id", kutsero_id).execute()
        #     if not kutsero_check.data:
        #         print(f"Kutsero with ID {kutsero_id} not found")
        #         return Response({
        #             "error": "Kutsero not found"
        #         }, status=status.HTTP_404_NOT_FOUND)
        # except Exception as e:
        #     print(f"Error checking kutsero existence: {e}")
        
        # Check if horse is already assigned (simplified query)
        try:
            print("Checking existing horse assignments...")
            existing_assignment = service_client.table("horse_assignment")\
                .select("assign_id, kutsero_id, date_start, date_end")\
                .eq("horse_id", horse_id)\
                .execute()
            
            print(f"Found {len(existing_assignment.data)} total assignments for horse {horse_id}")
            
            # Filter for active assignments in Python instead of complex SQL
            active_assignments = []
            for assignment in existing_assignment.data:
                assignment_end = assignment.get('date_end')
                assignment_start = assignment.get('date_start')
                
                # Assignment is active if:
                # 1. date_end is null (indefinite) OR
                # 2. date_end is >= today AND date_start <= today
                if assignment_end is None:
                    active_assignments.append(assignment)
                elif assignment_start <= today and assignment_end >= today:
                    active_assignments.append(assignment)
            
            print(f"Found {len(active_assignments)} active assignments")
            
            if active_assignments:
                print(f"Horse is already assigned: {active_assignments[0]}")
                return Response({
                    "error": "Horse is already assigned to someone else"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Error checking existing horse assignments: {e}")
            return Response({
                "error": f"Error checking horse availability: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check if kutsero already has an active assignment
        try:
            print("Checking existing kutsero assignments...")
            existing_kutsero_assignment = service_client.table("horse_assignment")\
                .select("assign_id, horse_id, date_start, date_end")\
                .eq("kutsero_id", kutsero_id)\
                .execute()
            
            print(f"Found {len(existing_kutsero_assignment.data)} total assignments for kutsero {kutsero_id}")
            
            # Filter for active assignments in Python
            active_kutsero_assignments = []
            for assignment in existing_kutsero_assignment.data:
                assignment_end = assignment.get('date_end')
                assignment_start = assignment.get('date_start')
                
                if assignment_end is None:
                    active_kutsero_assignments.append(assignment)
                elif assignment_start <= today and assignment_end >= today:
                    active_kutsero_assignments.append(assignment)
            
            print(f"Found {len(active_kutsero_assignments)} active kutsero assignments")
            
            if active_kutsero_assignments:
                print(f"Kutsero already has assignment: {active_kutsero_assignments[0]}")
                return Response({
                    "error": "Kutsero already has an active horse assignment"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Error checking existing kutsero assignments: {e}")
            return Response({
                "error": f"Error checking kutsero assignments: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate UUID for assignment
        try:
            assignment_id = str(uuid.uuid4())
            print(f"Generated assignment ID: {assignment_id}")
        except Exception as e:
            print(f"Error generating UUID: {e}")
            return Response({
                "error": "Error generating assignment ID"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create new assignment
        assignment_data = {
            "assign_id": assignment_id,
            "kutsero_id": kutsero_id,
            "horse_id": horse_id,
            "date_start": date_start,
            "date_end": date_end
        }
        
        print(f"Creating assignment with data: {assignment_data}")
        
        try:
            result = service_client.table("horse_assignment").insert(assignment_data).execute()
            print(f"Insert result: {result}")
            
            if result.data:
                print("Assignment created successfully")
                return Response({
                    "message": "Horse assigned successfully",
                    "assignment": result.data[0]
                }, status=status.HTTP_201_CREATED)
            else:
                print("Insert returned no data")
                return Response({
                    "error": "Failed to create assignment - no data returned"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print(f"Error inserting assignment: {e}")
            # Log the full exception details
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return Response({
                "error": f"Database insert error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print(f"Unexpected error in assign_horse: {e}")
        # Log the full exception details
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def end_assignment(request, assignment_id):
    """
    End a horse assignment (set end date to today)
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update the assignment end date
        result = service_client.table("horse_assignment")\
            .update({"date_end": str(date.today())})\
            .eq("assign_id", assignment_id)\
            .execute()
        
        if result.data:
            return Response({
                "message": "Horse assignment ended successfully"
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Assignment not found"
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print(f"Error ending assignment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def current_assignment(request):
    """
    Get current horse assignment for a kutsero
    """
    kutsero_id = request.GET.get("kutsero_id")
    
    if not kutsero_id:
        return Response({
            "error": "kutsero_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        today = str(date.today())
        
        # Get current assignment
        assignment_response = service_client.table("horse_assignment").select(
            "assign_id, horse_id, date_start, date_end"
        ).eq("kutsero_id", kutsero_id)\
         .lte("date_start", today)\
         .or_(f"date_end.is.null,date_end.gte.{today}")\
         .order("date_start", desc=True)\
         .limit(1)\
         .execute()
        
        if assignment_response.data and len(assignment_response.data) > 0:
            assignment = assignment_response.data[0]
            
            # Get horse details
            horse_response = service_client.table("horse_profile").select(
                "horse_id, horse_name, horse_breed, horse_age, horse_color, horse_image, operator_id"
            ).eq("horse_id", assignment['horse_id']).single().execute()
            
            if horse_response.data:
                horse = horse_response.data
                
                # Get operator details
                operator_name = "Unknown Operator"
                if horse.get('operator_id'):
                    operator_response = service_client.table("horse_operator_profile").select(
                        "operator_fname, operator_lname"
                    ).eq("operator_id", horse['operator_id']).single().execute()
                    
                    if operator_response.data:
                        operator = operator_response.data
                        if operator.get('operator_fname') and operator.get('operator_lname'):
                            operator_name = f"{operator['operator_fname']} {operator['operator_lname']}"
                        elif operator.get('operator_fname'):
                            operator_name = operator['operator_fname']
                        elif operator.get('operator_lname'):
                            operator_name = operator['operator_lname']
                        else:
                            operator_name = "Unnamed Operator"
                
                return Response({
                    'assignment': {
                        'assignmentId': assignment['assign_id'],
                        'startDate': assignment['date_start'],
                        'endDate': assignment['date_end'],
                        'horse': {
                            'id': horse['horse_id'],
                            'name': horse['horse_name'] or 'Unnamed Horse',
                            'breed': horse['horse_breed'] or 'Mixed Breed',
                            'age': horse['horse_age'] or 5,
                            'color': horse['horse_color'] or 'Brown',
                            'image': horse['horse_image'],
                            'healthStatus': 'Healthy',
                            'status': 'Ready for work',
                            'operatorName': operator_name,
                            'lastCheckup': f"{((datetime.now() - datetime(2024, 5, 25)).days)} days ago",
                            'nextCheckup': "June 15, 2025"
                        }
                    }
                }, status=status.HTTP_200_OK)
        
        return Response({
            'assignment': None,
            'message': 'No active horse assignment found'
        }, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"Error getting kutsero assignment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def debug_schema(request):
    """
    Debug function to check table schemas and data
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to get a sample record from each table to see column names and data
        results = {}
        
        # Check horse_profile table
        try:
            horse_sample = service_client.table("horse_profile").select("*").limit(3).execute()
            results['horse_profile_sample'] = horse_sample.data if horse_sample.data else "No data"
            if horse_sample.data:
                results['horse_profile_columns'] = list(horse_sample.data[0].keys())
        except Exception as e:
            results['horse_profile_error'] = str(e)
        
        # Check horse_operator_profile table
        try:
            operator_sample = service_client.table("horse_operator_profile").select("*").limit(3).execute()
            results['horse_operator_profile_sample'] = operator_sample.data if operator_sample.data else "No data"
            if operator_sample.data:
                results['horse_operator_profile_columns'] = list(operator_sample.data[0].keys())
        except Exception as e:
            results['horse_operator_profile_error'] = str(e)
        
        # Check horse_assignment table
        try:
            assignment_sample = service_client.table("horse_assignment").select("*").limit(3).execute()
            results['horse_assignment_sample'] = assignment_sample.data if assignment_sample.data else "No data"
            if assignment_sample.data:
                results['horse_assignment_columns'] = list(assignment_sample.data[0].keys())
        except Exception as e:
            results['horse_assignment_error'] = str(e)
        
        # Check specific horse operator relationship
        try:
            horse_with_operator = service_client.table("horse_profile").select("horse_id, horse_name, operator_id").execute()
            results['horse_operator_relationships'] = horse_with_operator.data[:3] if horse_with_operator.data else "No data"
        except Exception as e:
            results['horse_operator_error'] = str(e)
        
        return Response(results, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def test_connection(request):
    return Response({"message": "Kutsero API is working"}, status=status.HTTP_200_OK)
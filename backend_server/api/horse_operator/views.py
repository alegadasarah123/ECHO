from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
<<<<<<< Updated upstream
import uuid
from datetime import datetime
from datetime import datetime, timedelta
import logging

# Set up logging
logger = logging.getLogger(__name__)
=======
import requests
import time
from datetime import datetime, timezone
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY


# ------------------------------------------------ HORSE PROFILE API ------------------------------------------------

@api_view(['GET'])
def get_horse_operator_data(request):
    try:
        data = supabase.table("horse_op_profile").select("*").execute()
        return Response(data.data)
    except Exception as e:
        logger.error(f"Error fetching horse operator data: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def add_horse(request):
<<<<<<< Updated upstream
    op_id = request.data.get("user_id")
    if not op_id:
=======
    """
    Insert a new horse record for the current user
    """
    user_id = request.data.get("user_id")
    if not user_id:
>>>>>>> Stashed changes
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = {
        "horse_id": str(uuid.uuid4()),
        "op_id": op_id,
        "horse_name": request.data.get("name"),
        "horse_age": request.data.get("age"),
        "horse_dob": request.data.get("dateOfBirth"),
        "horse_sex": request.data.get("sex"),
        "horse_breed": request.data.get("breed"),
        "horse_color": request.data.get("color"),
        "horse_height": request.data.get("height"),
        "horse_weight": request.data.get("weight"),
        "horse_image": request.data.get("image") or None,
        "health_status": request.data.get("health_status", "Healthy"),
        "status": request.data.get("status", "Ready for work"),
        "last_checkup": request.data.get("last_checkup"),
        "next_checkup": request.data.get("next_checkup"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").insert(payload).execute()
        if data.data:
            return Response(
                {"message": "Horse added successfully", "data": data.data},
                status=status.HTTP_201_CREATED
            )
        else:
            return Response({"error": str(data.error)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error adding horse: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horses(request):
<<<<<<< Updated upstream
    op_id = request.GET.get("user_id")
    if not op_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        data = supabase.table("horse_profile").select("*").eq("op_id", op_id).execute()
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching horses: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_horse(request, horse_id):
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").delete().eq("horse_id", horse_id).execute()
        if data.data:
            return Response({"message": "Horse deleted successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting horse: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ FEEDING SCHEDULE API ------------------------------------------------

@api_view(['GET'])
def get_feeding_schedule(request):
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        data = supabase.table("feed_detail") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("horse_id", horse_id) \
            .order("fd_time", desc=False) \
            .execute()
        return Response(data.data, status=status.HTTP_200_OK)
=======
    """
    Fetch all horses for a given user or all available horses for selection
    Example: /api/horses?user_id=123 or /api/horses (for all available horses)
    """
    user_id = request.GET.get("user_id")
    
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    try:
        if user_id:
            # Get horses owned by specific user
            data = supabase.table("horse_profile").select("*").eq("operator_id", user_id).execute()
        else:
            # Get all available horses for selection
            data = supabase.table("horse_profile").select("*").execute()
        
        # Transform data to match frontend format
        horses = []
        for horse in data.data:
            horse_data = {
                "id": str(horse.get("id")),
                "name": horse.get("horse_name"),
                "healthStatus": horse.get("health_status", "Healthy"),
                "status": horse.get("status", "Ready for work"),
                "breed": horse.get("horse_breed"),
                "age": horse.get("horse_age"),
                "lastCheckup": horse.get("last_checkup"),
                "nextCheckup": horse.get("next_checkup"),
                "image": horse.get("horse_image"),
                "color": horse.get("horse_color"),
                "height": horse.get("horse_height"),
                "weight": horse.get("horse_weight"),
                "sex": horse.get("horse_sex"),
                "dob": horse.get("horse_dob")
            }
            horses.append(horse_data)
            
        return Response(horses, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_by_id(request, horse_id):
    """
    Fetch a specific horse by ID
    Example: /api/horses/123
    """
    try:
        data = supabase.table("horse_profile").select("*").eq("id", horse_id).execute()
        
        if not data.data:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
        
        horse = data.data[0]
        horse_data = {
            "id": str(horse.get("id")),
            "name": horse.get("horse_name"),
            "healthStatus": horse.get("health_status", "Healthy"),
            "status": horse.get("status", "Ready for work"),
            "breed": horse.get("horse_breed"),
            "age": horse.get("horse_age"),
            "lastCheckup": horse.get("last_checkup"),
            "nextCheckup": horse.get("next_checkup"),
            "image": horse.get("horse_image"),
            "color": horse.get("horse_color"),
            "height": horse.get("horse_height"),
            "weight": horse.get("horse_weight"),
            "sex": horse.get("horse_sex"),
            "dob": horse.get("horse_dob")
        }
        
        return Response(horse_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_horse(request, horse_id):
    """
    Update horse information
    """
    try:
        payload = {}
        
        # Only update fields that are provided
        if request.data.get("name"):
            payload["horse_name"] = request.data.get("name")
        if request.data.get("age"):
            payload["horse_age"] = request.data.get("age")
        if request.data.get("breed"):
            payload["horse_breed"] = request.data.get("breed")
        if request.data.get("health_status"):
            payload["health_status"] = request.data.get("health_status")
        if request.data.get("status"):
            payload["status"] = request.data.get("status")
        if request.data.get("last_checkup"):
            payload["last_checkup"] = request.data.get("last_checkup")
        if request.data.get("next_checkup"):
            payload["next_checkup"] = request.data.get("next_checkup")
        
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").update(payload).eq("id", horse_id).execute()
        
        if data.data:
            return Response({"message": "Horse updated successfully", "data": data.data}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
            
>>>>>>> Stashed changes
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_meal_name_from_time(time_str):
    """
    Determine meal type based on time string
    Matches the logic from the React Native frontend getMealName function
    """
    try:
        # Split time and period
        time_parts = time_str.split(' ')
        time_component = time_parts[0]
        period = time_parts[1] if len(time_parts) > 1 else 'AM'
        
        # Parse hour
        hour = int(time_component.split(':')[0])
        
        # Convert to 24-hour format
        if period.upper() == 'PM' and hour != 12:
            hour24 = hour + 12
        elif period.upper() == 'AM' and hour == 12:
            hour24 = 0
        else:
            hour24 = hour
        
        # Classify meal based on 24-hour time
        if hour24 < 10:
            return 'Breakfast'  # 12:00 AM - 9:59 AM
        elif hour24 < 16:
            return 'Lunch'      # 10:00 AM - 3:59 PM
        else:
            return 'Dinner'     # 4:00 PM - 11:59 PM
            
    except Exception as e:
        logger.error(f'Error parsing time {time_str}: {e}')
        return 'Meal'  # Default fallback
 
@api_view(['POST'])
def save_feeding_schedule(request):
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Delete existing schedule for this user and horse
        service_client.table("feed_detail").delete().eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        payloads = []
        for meal in schedule:
            # Get meal type from time
            meal_type = get_meal_name_from_time(meal.get("time"))
            
            payloads.append({
                "fd_id": str(uuid.uuid4()),
                "user_id": user_id,
                "horse_id": horse_id,
                "fd_meal_type": meal_type,
                "fd_food_type": meal.get("food"),
                "fd_qty": meal.get("amount"),
                "fd_time": meal.get("time"),
                "completed": meal.get("completed", False),
                "completed_at": meal.get("completed_at")
            })
        
        service_client.table("feed_detail").insert(payloads).execute()
        return Response({"message": "Feeding schedule saved successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_meal_fed(request):
    """
    Mark a specific meal as fed AND add to feedlog automatically
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    fd_id = request.data.get("fd_id")
    completed_at = request.data.get("completed_at") or datetime.now().isoformat()

    if not all([user_id, horse_id, fd_id]):
        return Response({"error": "user_id, horse_id, and fd_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Update feed_detail table
        updated = service_client.table("feed_detail").update({
            "completed": True,
            "completed_at": completed_at
        }).eq("user_id", user_id).eq("horse_id", horse_id).eq("fd_id", fd_id).execute()

        if not updated.data:
            return Response({"error": "Feed not found"}, status=status.HTTP_404_NOT_FOUND)

        feed_row = updated.data[0]

        # Get operator full name - CORRECTED TABLE NAME
        user_data = supabase.table("horse_op_profile") \
            .select("op_fname, op_lname") \
            .eq("op_id", user_id).execute()
        user_full_name = "Unknown User"
        if user_data.data:
            fn = user_data.data[0].get("op_fname", "")
            ln = user_data.data[0].get("op_lname", "")
            user_full_name = f"{fn} {ln}".strip()

        # Get horse name for logging
        horse_data = supabase.table("horse_profile") \
            .select("horse_name") \
            .eq("horse_id", horse_id).execute()
        horse_name = "Unknown Horse"
        if horse_data.data:
            horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")

        # Insert into feed_log with CORRECTED COLUMN NAMES
        log_payload = {
            "log_id": str(uuid.uuid4()),
            "log_user_full_name": user_full_name,
            "log_date": datetime.now().date().isoformat(),
            "log_meal": feed_row.get("fd_meal_type"),
            "log_time": feed_row.get("fd_time"),
            "log_food": feed_row.get("fd_food_type"),
            "log_amount": feed_row.get("fd_qty"),
            "log_status": "Fed",
            "log_action": "Completed",
            "user_id": user_id,
            "horse_id": horse_id,
            "created_at": completed_at
        }
        service_client.table("feed_log").insert(log_payload).execute()

        return Response({"message": "Meal marked as fed and logged"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error marking meal as fed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_feed_logs(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        data = supabase.table("feed_log").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        # Transform data to match frontend expectations
        transformed_data = []
        for log in data.data:
            # Get horse name
            horse_data = supabase.table("horse_profile") \
                .select("horse_name") \
                .eq("horse_id", log["horse_id"]).execute()
            horse_name = "Unknown Horse"
            if horse_data.data:
                horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")
            
            transformed_data.append({
                "log_id": log["log_id"],
                "date": log["log_date"],
                "horse": horse_name,
                "horse_id": log["horse_id"],
                "timestamp": log["created_at"],
                "user_full_name": log["log_user_full_name"],
                "meal": log["log_meal"],
                "time": log["log_time"],
                "food": log["log_food"],
                "amount": log["log_amount"],
                "status": log["log_status"],
                "action": log["log_action"].lower()
            })
        
        return Response(transformed_data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching feed logs: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def clear_feed_logs(request):
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        service_client.table("feed_log").delete().eq("user_id", user_id).execute()
        return Response({"message": "All feed logs cleared successfully"}, status=status.HTTP_200_OK)
=======
    try:
=======
    try:
>>>>>>> Stashed changes
        if user_id:
            # Get horses owned by specific user
            data = supabase.table("horse_profile").select("*").eq("operator_id", user_id).execute()
        else:
            # Get all available horses for selection
            data = supabase.table("horse_profile").select("*").execute()
        
        # Transform data to match frontend format
        horses = []
        for horse in data.data:
            horse_data = {
                "id": str(horse.get("id")),
                "name": horse.get("horse_name"),
                "healthStatus": horse.get("health_status", "Healthy"),
                "status": horse.get("status", "Ready for work"),
                "breed": horse.get("horse_breed"),
                "age": horse.get("horse_age"),
                "lastCheckup": horse.get("last_checkup"),
                "nextCheckup": horse.get("next_checkup"),
                "image": horse.get("horse_image"),
                "color": horse.get("horse_color"),
                "height": horse.get("horse_height"),
                "weight": horse.get("horse_weight"),
                "sex": horse.get("horse_sex"),
                "dob": horse.get("horse_dob")
            }
            horses.append(horse_data)
            
        return Response(horses, status=status.HTTP_200_OK)
<<<<<<< Updated upstream
=======
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_by_id(request, horse_id):
    """
    Fetch a specific horse by ID
    Example: /api/horses/123
    """
    try:
        data = supabase.table("horse_profile").select("*").eq("id", horse_id).execute()
        
        if not data.data:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
        
        horse = data.data[0]
        horse_data = {
            "id": str(horse.get("id")),
            "name": horse.get("horse_name"),
            "healthStatus": horse.get("health_status", "Healthy"),
            "status": horse.get("status", "Ready for work"),
            "breed": horse.get("horse_breed"),
            "age": horse.get("horse_age"),
            "lastCheckup": horse.get("last_checkup"),
            "nextCheckup": horse.get("next_checkup"),
            "image": horse.get("horse_image"),
            "color": horse.get("horse_color"),
            "height": horse.get("horse_height"),
            "weight": horse.get("horse_weight"),
            "sex": horse.get("horse_sex"),
            "dob": horse.get("horse_dob")
        }
        
        return Response(horse_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_horse(request, horse_id):
    """
    Update horse information
    """
    try:
        payload = {}
        
        # Only update fields that are provided
        if request.data.get("name"):
            payload["horse_name"] = request.data.get("name")
        if request.data.get("age"):
            payload["horse_age"] = request.data.get("age")
        if request.data.get("breed"):
            payload["horse_breed"] = request.data.get("breed")
        if request.data.get("health_status"):
            payload["health_status"] = request.data.get("health_status")
        if request.data.get("status"):
            payload["status"] = request.data.get("status")
        if request.data.get("last_checkup"):
            payload["last_checkup"] = request.data.get("last_checkup")
        if request.data.get("next_checkup"):
            payload["next_checkup"] = request.data.get("next_checkup")
        
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").update(payload).eq("id", horse_id).execute()
        
        if data.data:
            return Response({"message": "Horse updated successfully", "data": data.data}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
            
>>>>>>> Stashed changes
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_by_id(request, horse_id):
    """
    Fetch a specific horse by ID
    Example: /api/horses/123
    """
    try:
        data = supabase.table("horse_profile").select("*").eq("id", horse_id).execute()
        
        if not data.data:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
        
        horse = data.data[0]
        horse_data = {
            "id": str(horse.get("id")),
            "name": horse.get("horse_name"),
            "healthStatus": horse.get("health_status", "Healthy"),
            "status": horse.get("status", "Ready for work"),
            "breed": horse.get("horse_breed"),
            "age": horse.get("horse_age"),
            "lastCheckup": horse.get("last_checkup"),
            "nextCheckup": horse.get("next_checkup"),
            "image": horse.get("horse_image"),
            "color": horse.get("horse_color"),
            "height": horse.get("horse_height"),
            "weight": horse.get("horse_weight"),
            "sex": horse.get("horse_sex"),
            "dob": horse.get("horse_dob")
        }
        
        return Response(horse_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_horse(request, horse_id):
    """
    Update horse information
    """
    try:
        payload = {}
        
        # Only update fields that are provided
        if request.data.get("name"):
            payload["horse_name"] = request.data.get("name")
        if request.data.get("age"):
            payload["horse_age"] = request.data.get("age")
        if request.data.get("breed"):
            payload["horse_breed"] = request.data.get("breed")
        if request.data.get("health_status"):
            payload["health_status"] = request.data.get("health_status")
        if request.data.get("status"):
            payload["status"] = request.data.get("status")
        if request.data.get("last_checkup"):
            payload["last_checkup"] = request.data.get("last_checkup")
        if request.data.get("next_checkup"):
            payload["next_checkup"] = request.data.get("next_checkup")
        
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").update(payload).eq("id", horse_id).execute()
        
        if data.data:
            return Response({"message": "Horse updated successfully", "data": data.data}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
            
>>>>>>> Stashed changes
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_feeds(request):
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        service_client.table("feed_detail").update({
            "completed": False,
            "completed_at": None
        }).eq("user_id", user_id).eq("horse_id", horse_id).execute()
        return Response({"message": "Daily feeds reset successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ------------------------------------------------ VETERINARIAN API ------------------------------------------------

@api_view(['GET'])
def get_veterinarians(request):
    """
    Fetch all veterinarians
    """
    try:
        data = supabase.table("vet_profile").select(
            "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_specialization"
        ).execute()
        
        # Transform data to match frontend expectations
        vets = []
        for vet in data.data:
            vets.append({
                "id": vet["vet_id"],
                "first_name": vet["vet_fname"],
                "last_name": vet["vet_lname"],
                "email": vet["vet_email"],
                "phone": vet.get("vet_phone_num"),
                "specialization": vet.get("vet_specialization"),
                "avatar": f"/placeholder-doctor.png"  # Default avatar
            })
        
        return Response(vets, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching veterinarians: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ MESSAGING API ------------------------------------------------

@api_view(['GET'])
def get_chat_messages(request):
    """
    Get chat messages between operator and veterinarian
    """
    user_id = request.GET.get("user_id")
    contact_id = request.GET.get("contact_id")
    
    if not user_id or not contact_id:
        return Response({"error": "user_id and contact_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = supabase.table("chat_messages").select("*").eq("user_id", user_id).eq("contact_id", contact_id).order("created_at", desc=False).execute()
        
        messages = []
        for msg in data.data:
            messages.append({
                "id": msg["message_id"],
                "text": msg["message_text"],
                "isOutgoing": msg["is_outgoing"],
                "timestamp": msg["created_at"],
            })
        
        return Response(messages, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching chat messages: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def send_chat_message(request):
    """
    Send a chat message
    """
    user_id = request.data.get("user_id")
    contact_id = request.data.get("contact_id")
    message_text = request.data.get("message_text")
    is_outgoing = request.data.get("is_outgoing", True)
    
    if not all([user_id, contact_id, message_text]):
        return Response({"error": "user_id, contact_id, and message_text are required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = {
        "message_id": str(uuid.uuid4()),
        "user_id": user_id,
        "contact_id": contact_id,
        "message_text": message_text,
        "is_outgoing": is_outgoing,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("chat_messages").insert(payload).execute()
        
        if data.data:
            # Also update the conversations list
            update_conversation_list(user_id, contact_id, message_text, is_outgoing)
            
            return Response({
                "message": "Message sent successfully",
                "data": {
                    "id": payload["message_id"],
                    "text": message_text,
                    "isOutgoing": is_outgoing,
                    "timestamp": payload["created_at"]
                }
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": "Failed to send message"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error sending chat message: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def update_conversation_list(user_id, contact_id, message_text, is_outgoing):
    """
    Helper function to update conversations list
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if conversation already exists
        existing = service_client.table("conversations").select("*").eq("user_id", user_id).eq("contact_id", contact_id).execute()
        
        preview = message_text[:50] + "..." if len(message_text) > 50 else message_text
        if is_outgoing:
            preview = f"You: {preview}"
        
        conversation_data = {
            "user_id": user_id,
            "contact_id": contact_id,
            "last_message": preview,
            "last_message_time": datetime.now().isoformat(),
            "unread": not is_outgoing,  # Mark as unread if incoming message
            "updated_at": datetime.now().isoformat()
        }
        
        if existing.data:
            # Update existing conversation
            service_client.table("conversations").update(conversation_data).eq("user_id", user_id).eq("contact_id", contact_id).execute()
        else:
            # Create new conversation
            conversation_data["conversation_id"] = str(uuid.uuid4())
            conversation_data["created_at"] = datetime.now().isoformat()
            service_client.table("conversations").insert(conversation_data).execute()
            
    except Exception as e:
        logger.error(f"Error updating conversation list: {e}")


@api_view(['GET'])
def get_conversations(request):
    """
    Get all conversations for a user - FIXED VERSION
    """
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.info(f"Fetching conversations for user_id: {user_id}")
        
        # First, get basic conversations
        conversations_data = supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        
        logger.info(f"Found {len(conversations_data.data)} conversations")
        
        conversations = []
        for conv in conversations_data.data:
            contact_id = conv["contact_id"]
            
            # Default conversation info
            conversation_item = {
                "id": contact_id,
                "name": "Contact",
                "avatar": "/placeholder-doctor.png",
                "message": conv["last_message"],
                "time": format_time(conv["last_message_time"]),
                "unread": conv.get("unread", False)
            }
            
            # Handle AI Assistant specially
            if contact_id == "ai_assistant":
                conversation_item["name"] = "AI Assistant"
                conversation_item["avatar"] = "/ai-robot-assistant.png"
            else:
                # Try to get veterinarian info separately
                try:
                    vet_data = supabase.table("vet_profile").select("vet_fname, vet_lname").eq("vet_id", contact_id).execute()
                    if vet_data.data and len(vet_data.data) > 0:
                        vet_info = vet_data.data[0]
                        conversation_item["name"] = f"Dr. {vet_info['vet_fname']} {vet_info['vet_lname']}"
                except Exception as vet_error:
                    logger.warning(f"Could not fetch vet info for contact_id {contact_id}: {vet_error}")
                    # Keep default name
            
            conversations.append(conversation_item)
        
        # If no conversations exist, return empty array (frontend will handle showing AI Assistant)
        logger.info(f"Returning {len(conversations)} conversations")
        return Response(conversations, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        # Return empty array instead of error to allow frontend to handle gracefully
        return Response([], status=status.HTTP_200_OK)


def format_time(timestamp_str):
    """
    Helper function to format timestamp
    """
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now()
        
        if timestamp.date() == now.date():
            return timestamp.strftime('%I:%M %p')
        elif timestamp.date() == (now.date() - timedelta(days=1)):
            return "Yesterday"
        else:
            return timestamp.strftime('%m/%d/%y')
    except:
        return timestamp_str


# ------------------------------------------------ APPOINTMENT API ------------------------------------------------

@api_view(['POST'])
def book_appointment(request):
    """
    Book an appointment with a veterinarian - IMPROVED VERSION with better vet validation
    """
    try:
        # Log the incoming request data for debugging
        logger.info(f"Booking appointment request data: {request.data}")
        
        # Validate required fields
        user_id = request.data.get("user_id")
        vet_id = request.data.get("vet_id")
        horse_id = request.data.get("horse_id")
        appointment_date = request.data.get("date")
        appointment_time = request.data.get("time")
        service_type = request.data.get("service")
        notes = request.data.get("notes", "")
        
        # Check for missing required fields
        missing_fields = []
        if not user_id:
            missing_fields.append("user_id")
        if not vet_id:
            missing_fields.append("vet_id")
        if not horse_id:
            missing_fields.append("horse_id")
        if not appointment_date:
            missing_fields.append("date")
        if not appointment_time:
            missing_fields.append("time")
        if not service_type:
            missing_fields.append("service")
            
        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(error_msg)
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # VALIDATION: Check if vet_id exists in vet_profile table
        try:
            vet_check = supabase.table("vet_profile").select("vet_id, vet_fname, vet_lname").eq("vet_id", vet_id).execute()
            if not vet_check.data or len(vet_check.data) == 0:
                error_msg = f"Invalid vet_id: {vet_id}. Veterinarian not found in database."
                logger.error(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            vet_info = vet_check.data[0]
            logger.info(f"Valid veterinarian found: Dr. {vet_info['vet_fname']} {vet_info['vet_lname']} (ID: {vet_id})")
            
        except Exception as vet_check_error:
            logger.error(f"Error validating vet_id: {vet_check_error}")
            return Response({"error": "Error validating veterinarian"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # VALIDATION: Check if horse_id exists and belongs to the user
        try:
            horse_check = supabase.table("horse_profile").select("horse_id, horse_name, op_id").eq("horse_id", horse_id).eq("op_id", user_id).execute()
            if not horse_check.data or len(horse_check.data) == 0:
                error_msg = f"Invalid horse_id: {horse_id}. Horse not found or doesn't belong to user."
                logger.error(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            horse_info = horse_check.data[0]
            logger.info(f"Valid horse found: {horse_info['horse_name']} (ID: {horse_id})")
            
        except Exception as horse_check_error:
            logger.error(f"Error validating horse_id: {horse_check_error}")
            return Response({"error": "Error validating horse"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Generate UUID for appointment
        app_id = str(uuid.uuid4())
        logger.info(f"Generated appointment ID: {app_id}")

        # Prepare payload for database
        payload = {
            "app_id": app_id,
            "app_service": service_type,
            "app_date": appointment_date,
            "app_time": appointment_time,
            "app_note": notes,
            "user_id": user_id,
            "horse_id": horse_id,
            "vet_id": vet_id,  # This is now validated to exist in vet_profile table
            "app_status": "pending"
        }
        
        logger.info(f"Inserting appointment with validated payload: {payload}")

        # Insert into database
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("appointment").insert(payload).execute()
        
        # Check if insertion was successful
        if data.data and len(data.data) > 0:
            logger.info(f"Appointment booked successfully: {data.data[0]}")
            return Response({
                "message": "Appointment booked successfully",
                "app_id": app_id,
                "appointment_data": data.data[0],
                "vet_info": {
                    "vet_id": vet_id,
                    "vet_name": f"Dr. {vet_info['vet_fname']} {vet_info['vet_lname']}"
                },
                "horse_info": {
                    "horse_id": horse_id,
                    "horse_name": horse_info['horse_name']
                }
            }, status=status.HTTP_201_CREATED)
        else:
            # Log the full response for debugging
            logger.error(f"Failed to insert appointment. Response: {data}")
            error_msg = "Failed to book appointment"
            if hasattr(data, 'error') and data.error:
                error_msg += f": {data.error}"
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Exception in book_appointment: {str(e)}", exc_info=True)
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_appointments(request):
    """
    Get all appointments for a user
    """
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get appointments with corrected field names to match your database schema
        appointments_data = supabase.table("appointment").select("*").eq("user_id", user_id).order("app_date", desc=True).execute()
        
        appointments = []
        for appt in appointments_data.data:
            appointment_item = {
                "app_id": appt["app_id"],
                "vet_name": "Unknown",
                "horse_name": "Unknown",
                "app_date": appt["app_date"],
                "app_time": appt["app_time"],
                "app_service": appt["app_service"],
                "app_note": appt["app_note"],
                "app_status": appt["app_status"]
            }
            
            # Get veterinarian info separately
            try:
                vet_data = supabase.table("vet_profile").select("vet_fname, vet_lname").eq("vet_id", appt["vet_id"]).execute()
                if vet_data.data:
                    vet_info = vet_data.data[0]
                    appointment_item["vet_name"] = f"Dr. {vet_info['vet_fname']} {vet_info['vet_lname']}"
            except Exception as vet_error:
                logger.warning(f"Could not fetch vet info for appointment: {vet_error}")
            
            # Get horse info separately
            try:
                horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", appt["horse_id"]).execute()
                if horse_data.data:
                    horse_info = horse_data.data[0]
                    appointment_item["horse_name"] = horse_info["horse_name"]
            except Exception as horse_error:
                logger.warning(f"Could not fetch horse info for appointment: {horse_error}")
            
            appointments.append(appointment_item)
        
        return Response(appointments, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_appointment(request, app_id):
    """
    Update an existing appointment
    """
    try:
        update_data = {}
        
        # Only update fields that are provided
        if request.data.get("date"):
            update_data["app_date"] = request.data.get("date")
        if request.data.get("time"):
            update_data["app_time"] = request.data.get("time")
        if request.data.get("service"):
            update_data["app_service"] = request.data.get("service")
        if request.data.get("notes") is not None:  # Allow empty notes
            update_data["app_note"] = request.data.get("notes")
        if request.data.get("status"):
            update_data["app_status"] = request.data.get("status")

        if not update_data:
            return Response({"error": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("appointment").update(update_data).eq("app_id", app_id).execute()
        
        if data.data:
            return Response({
                "message": "Appointment updated successfully",
                "appointment_data": data.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error updating appointment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def cancel_appointment(request, app_id):
    """
    Cancel an appointment (soft delete by updating status)
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("appointment").update({
            "app_status": "cancelled"
        }).eq("app_id", app_id).execute()
        
        if data.data:
            return Response({
                "message": "Appointment cancelled successfully"
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error cancelling appointment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
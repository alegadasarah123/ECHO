from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import uuid
from datetime import datetime

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY


# ------------------------------------------------ HORSE PROFILE API ------------------------------------------------

@api_view(['GET'])
def get_horse_operator_data(request):
    data = supabase.table("horse_operator_profile").select("*").execute()
    return Response(data.data)

@api_view(['POST'])
def add_horse(request):
    """
    Insert a new horse record for the current operator (user)
    """
    operator_id = request.data.get("user_id")   # 👈 operator's id (FK)
    if not operator_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = {

        "horse_id": str(uuid.uuid4()),
        "operator_id": operator_id,  # 👈 foreign key link to operator
        "horse_name": request.data.get("name"),
        "horse_age": request.data.get("age"),
        "horse_dob": request.data.get("dateOfBirth"),
        "horse_sex": request.data.get("sex"),
        "horse_breed": request.data.get("breed"),
        "horse_color": request.data.get("color"),
        "horse_height": request.data.get("height"),
        "horse_weight": request.data.get("weight"),
        "horse_image": request.data.get("image") or None,
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
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horses(request):
    """
    Fetch all horses for a given operator (user)
    Example: /api/horse_operator/get_horses/?user_id=123
    """
    operator_id = request.GET.get("user_id")
    if not operator_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        print(f"🔍 Looking for horses with operator_id: {operator_id}")  # Debug log
        
        # ✅ Make sure we're querying the right table and field
        data = supabase.table("horse_profile").select("*").eq("operator_id", operator_id).execute()
        
        print(f"📊 Supabase response: {data}")  # Debug log
        print(f"📊 Found {len(data.data) if data.data else 0} horses")  # Debug log
        
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"❌ Error fetching horses: {e}")  # Debug log
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['DELETE'])
def delete_horse(request, horse_id):
    """
    Delete a horse by horse_id (UUID).
    Example: /api/delete_horse/<horse_id>/
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Delete the horse
        data = service_client.table("horse_profile").delete().eq("horse_id", horse_id).execute()

        if data.data:
            return Response({"message": "Horse deleted successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ FEEDING SCHEDULE API ------------------------------------------------

@api_view(['GET'])
def get_feeding_schedule(request):
    """
    Fetch feeding schedule for a specific horse and user
    Example: /api/horse_operator/get_feeding_schedule/?user_id=123&horse_id=456
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = supabase.table("feed").select("*").eq("user_id", user_id).eq("horse_id", horse_id).execute()
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_feeding_schedule(request):
    """
    Save/update feeding schedule for a specific horse and user
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete existing schedule for this user-horse combination
        service_client.table("feed").delete().eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        # Insert new schedule
        for meal in schedule:
            payload = {
                "feed_id": str(uuid.uuid4()),
                "user_id": user_id,
                "horse_id": horse_id,
                "food": meal.get("food"),
                "amount": meal.get("amount"),
                "time": meal.get("time"),
                "completed": meal.get("completed", False),
                "completed_at": meal.get("completedAt")
            }
            service_client.table("feed").insert(payload).execute()
            
        return Response({"message": "Feeding schedule saved successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_meal_fed(request):
    """
    Mark a specific meal as fed
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    meal_id = request.data.get("meal_id")
    completed_at = request.data.get("completed_at")
    
    if not all([user_id, horse_id, meal_id]):
        return Response({"error": "user_id, horse_id, and meal_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update the meal as completed
        data = service_client.table("feed").update({
            "completed": True,
            "completed_at": completed_at or datetime.now().isoformat()
        }).eq("user_id", user_id).eq("horse_id", horse_id).eq("meal_id", meal_id).execute()
        
        return Response({"message": "Meal marked as fed successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def add_feed_log_entry(request):
    """
    Add an entry to the feed log
    """
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": request.data.get("date"),
        "meal": request.data.get("meal"),
        "horse": request.data.get("horse"),
        "time": request.data.get("time"),
        "food": request.data.get("food"),
        "amount": request.data.get("amount"),
        "status": request.data.get("status"),
        "action": request.data.get("action"),
        "timestamp": request.data.get("timestamp", datetime.now().isoformat())
    }

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("feed_logs").insert(payload).execute()

        if data.data:
            return Response({"message": "Feed log entry added successfully"}, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": str(data.error)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_feed_logs(request):
    """
    Fetch feed logs for a specific user
    Example: /api/horse_operator/get_feed_logs/?user_id=123
    """
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = supabase.table("feed_logs").select("*").eq("user_id", user_id).order("timestamp", desc=True).execute()
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_feeds(request):
    """
    Reset all meals for a specific horse to not completed
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Reset all meals for this horse
        data = service_client.table("feed").update({
            "completed": False,
            "completed_at": None
        }).eq("user_id", user_id).eq("horse_id", horse_id).execute()
        
        return Response({"message": "Daily feeds reset successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
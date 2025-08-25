from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import time

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY


# ------------------------------------------------ HORSE PROFILE API ------------------------------------------------

@api_view(['POST'])
def add_horse(request):
    """
    Insert a new horse record for the current user
    """
    user_id = request.data.get("user_id")   # 👈 should come from frontend (current logged-in user)
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = {
        "horse_id": user_id,
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
            return Response({"message": "Horse added successfully", "data": data.data}, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": str(data.error)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horses(request):
    """
    Fetch all horses for a given user
    Example: /api/horses?user_id=123
    """
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = supabase.table("horse_profile").select("*").eq("operator_id", user_id).execute()
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

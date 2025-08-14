from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client
from django.conf import settings
import requests

CONTENT_TYPE_JSON = "application/json"

# Supabase clients
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL


@api_view(['POST'])
def signup(request):
    # Extract and clean data
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()
    ctu_id = request.data.get("ctuId", "").strip()
    first_name = request.data.get("firstName", "").strip()
    last_name = request.data.get("lastName", "").strip()
    phone_number = request.data.get("phoneNumber", "").strip()

    # Validate required fields
    if not all([email, password, ctu_id, first_name, last_name]):
        return Response(
            {"error": "Email, password, vet ID, first name, and last name are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if vet ID already exists
    existing_vet = supabase.table("ctu_vet_profile").select("*").eq("ctu_id", ctu_id).execute()
    if existing_vet.data:
        return Response({"error": "Vet ID already exists"}, status=status.HTTP_400_BAD_REQUEST)

    # Create Supabase Auth user
    signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": CONTENT_TYPE_JSON
    }
    auth_payload = {"email": email, "password": password, "email_confirm": True}

    try:
        auth_response = requests.post(signup_url, json=auth_payload, headers=headers)
        auth_response.raise_for_status()
    except requests.RequestException as e:
        return Response({"error": "Failed to create user in Supabase Auth", "details": str(e)}, status=400)

    user_id = auth_response.json().get("id")

    # Insert vet profile
    profile_payload = {
        "ctu_id": ctu_id,
        "ctu_fname": first_name,
        "ctu_lname": last_name,
        "ctu_email": email,
        "ctu_phonenum": phone_number
    }

    try:
        profile_response = supabase.table("ctu_vet_profile").insert(profile_payload).execute()
        if not profile_response.data:
            raise Exception("No data returned from profile insert")
    except Exception as e:
        # Rollback Auth user
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert vet profile", "details": str(e)}, status=400)

    return Response({
        "message": "User created successfully",
        "user": {
            "id": user_id,
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "ctuId": ctu_id,
            "phoneNumber": phone_number
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def user_login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": CONTENT_TYPE_JSON
    }
    payload = {"email": email, "password": password}

    try:
        auth_response = requests.post(login_url, json=payload, headers=headers)
        auth_response.raise_for_status()
        auth_data = auth_response.json()
    except requests.RequestException:
        return Response({"error": "Invalid login credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except ValueError:
        return Response({"error": "Invalid response from Supabase"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    user_id = auth_data.get("user", {}).get("id")

    # Fetch vet profile info
    vet_profile = supabase.table("ctu_vet_profile").select("*").eq("ctu_email", email).execute()
    profile_data = vet_profile.data[0] if vet_profile.data else {}

    # Only return tokens and vet profile (do not return password)
    return Response({
        "message": "Login successful",
        "access_token": auth_data.get("access_token"),
        "refresh_token": auth_data.get("refresh_token"),
        "vet_profile": profile_data
    }, status=status.HTTP_200_OK)

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
    # Extract and strip required fields
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()
    ctu_id = request.data.get("ctuId", "").strip()
    first_name = request.data.get("firstName", "").strip()
    last_name = request.data.get("lastName", "").strip()
    phone_number = request.data.get("phoneNumber", "").strip()

    # Validate required fields
    if not all([email, password, ctu_id, first_name, last_name, phone_number]):
        return Response(
            {"error": "All fields are required: email, password, ctu ID, first name, last name, phone number"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Convert numeric fields
    try:
        ctu_id = int(ctu_id)
        phone_number = int(phone_number)
    except ValueError:
        return Response({"error": "CTU ID and phone number must be numbers"}, status=status.HTTP_400_BAD_REQUEST)

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
    auth_response = requests.post(signup_url, json=auth_payload, headers=headers)

    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Failed to create user in Supabase Auth", "details": auth_response.text}, status=400)

    user_id = auth_response.json().get("id")

    # Insert into ctu_vet_profile
    profile_payload = {
        "ctu_id": ctu_id,
        "ctu_fname": first_name,
        "ctu_lname": last_name,
        "ctu_email": email,
        "ctu_phonenum": phone_number
    }
    profile_response = supabase.table("ctu_vet_profile").insert(profile_payload).execute()

    if not profile_response.data:
        # Rollback Auth user
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert vet profile"}, status=400)

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
    auth_response = requests.post(login_url, json=payload, headers=headers)

    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Invalid login credentials", "details": auth_response.text}, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()

    # Fetch vet profile info
    vet_profile = supabase.table("ctu_vet_profile").select("*").eq("ctu_email", email).execute()
    profile_data = vet_profile.data[0] if vet_profile.data else {}

    return Response({
        "message": "Login successful",
        "auth_data": auth_data,
        "vet_profile": profile_data
    }, status=status.HTTP_200_OK)

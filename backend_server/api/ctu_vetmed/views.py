from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client
import os, requests
from django.conf import settings





# Environment config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")
CONTENT_TYPE_JSON = "application/json"

# Supabase service role client
sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)



@api_view(['POST'])
def signup(request):
    try:
        email = request.data.get("email", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        password = request.data.get("password", "").strip()  # 👈 added

        if not all([email, first_name, last_name, phone_number, password]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Admin headers
        admin_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": CONTENT_TYPE_JSON
        }

        # Check if email already exists
        check_url = f"{SUPABASE_URL}/auth/v1/admin/users?email={email}"
        check_res = requests.get(check_url, headers=admin_headers)
        if check_res.status_code == 200:
            users_list = check_res.json().get("users", [])
            if any(u.get("email") == email for u in users_list):
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # 1️⃣ Create user with password in Supabase Auth
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        payload_auth = {"email": email, "password": password}  # 👈 add password here
        auth_res = requests.post(signup_url, json=payload_auth, headers=admin_headers)
        if auth_res.status_code not in [200, 201]:
            return Response({"error": "Failed to create user in Supabase Auth"}, status=400)

        user_data = auth_res.json()
        user_id = user_data.get("id")

        # 2️⃣ Insert into public.users
        user_payload = {
            "id": user_id,
            "role": "Ctu-VetMed",
            "status": "approved"
        }
        insert_users_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_users_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": CONTENT_TYPE_JSON,
            "Prefer": "return=representation"
        }
        users_res = requests.post(insert_users_url, json=user_payload, headers=insert_users_headers)
        if users_res.status_code not in [200, 201]:
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=admin_headers)
            return Response({"error": "Failed to insert into public.users"}, status=400)

        # 3️⃣ Insert into ctu_vet_profile (including ctu_pass)
        profile_payload = {
            "ctu_id": user_id,
            "ctu_fname": first_name,
            "ctu_lname": last_name,
            "ctu_email": email,
            "ctu_phonenum": phone_number,
            "ctu_pass": password   # 👈 added
        }
        profile_res = sr_client.table("ctu_vet_profile").insert(profile_payload).execute()
        if not profile_res.data:
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_users_headers)
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=admin_headers)
            return Response({"error": "Failed to insert into ctu_vet_profile"}, status=400)

        # ✅ No need for reset email since we already created with password
        return Response({
            "message": "User created successfully.",
            "user": {
                "id": user_id,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "phoneNumber": phone_number
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": "Internal Server Error", "details": str(e)}, status=500)




@api_view(['GET'])
def get_vet_profiles(request):
    try:
        # Query vet_profile table and include user's status
        response = sr_client.table("vet_profile").select("*, users(status)").execute()

        if response.data:
            return Response(response.data, status=status.HTTP_200_OK)
        else:
            return Response({"message": "No records found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(["PATCH"])
def update_vet_status(request, vet_profile_id):
    try:
        new_status = request.data.get("status")
        allowed_statuses = ["pending", "approved", "rejected"]

        if not new_status:
            return Response({"error": "Status is required"}, status=400)

        if new_status not in allowed_statuses:
            return Response(
                {"error": f"Invalid status. Allowed values: {allowed_statuses}"},
                status=400
            )

        vet_profile_res = (
            sr_client.table("vet_profile")
            .select("vet_id")
            .eq("id", vet_profile_id)
            .single()
            .execute()
        )

        if not vet_profile_res.data:
            return Response({"error": "Vet profile not found"}, status=404)

        vet_id = vet_profile_res.data["vet_id"]

        user_update_res = (
            sr_client.table("users")
            .update({"status": new_status})
            .eq("id", vet_id)
            .execute()
        )

        if not user_update_res.data:
            return Response({"error": "User not found"}, status=404)

        return Response(
            {
                "message": f"Vet status updated to {new_status}",
                "data": user_update_res.data[0],
            },
            status=200,
        )

    except Exception as e:
        logger.error(f"🔥 ERROR in update_vet_status: {str(e)}")
        return Response({"error": "Internal server error"}, status=500)

from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def get_recent_activity(request):
    try:
        response = (
            sr_client.table("vet_profile")
            .select("id, vet_fname, vet_lname, created_at, users(status)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        if not response.data:
            return Response([], status=200)

        activities = []
        for row in response.data:
            user_status = row.get("users", {}).get("status", "unknown")
            first_name = row.get("vet_fname", "")
            last_name = row.get("vet_lname", "")
            full_name = f"{first_name} {last_name}".strip()

            # Initials like "HEC"
            initials = "".join([w[0] for w in full_name.split() if w]).upper()

            activities.append({
                "id": row["id"],
                "title": full_name,
                "initials": initials,
                "description": f"User is currently {user_status.capitalize()}",
                "status": user_status,
                "date": row.get("created_at"),
            })

        return Response(activities, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_status_counts(request):
    try:
        # Query vet_profile and join with users (status)
        response = (
            sr_client.table("vet_profile")
            .select("id, users(status)")
            .execute()
        )

        if not response.data:
            return Response({"pending": 0, "approved": 0, "declined": 0}, status=200)

        counts = {"pending": 0, "approved": 0, "declined": 0}
        for row in response.data:
            user_status = row.get("users", {}).get("status", "").lower()
            if user_status in counts:
                counts[user_status] += 1

        return Response(counts, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

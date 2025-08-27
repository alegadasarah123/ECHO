
from uuid import UUID
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client
import os, requests, logging
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
import datetime






# Environment config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")
CONTENT_TYPE_JSON = "application/json"

# Supabase service role client
sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# --------------------ADD NEW USERS IN SETTINGS--------------------
@api_view(['POST'])
def signup(request):
    try:
        email = request.data.get("email", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        password = request.data.get("password", "").strip()  # 👈 added
        role = request.data.get("role", "").strip()  # 👈 added

        if not all([email, first_name, last_name, phone_number, password,role]):
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
            "ctu_pass": password,
            "role": role      # 👈 added
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
                "phoneNumber": phone_number,
                 "role": role
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": "Internal Server Error", "details": str(e)}, status=500)



# -------------------- GET VET PROFILES --------------------
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


# -------------------- UPDATE STATUS --------------------
@api_view(['PATCH'])
def update_vet_status(request, vet_profile_id):
    """
    Update the status of a vet user (pending, approved, declined)
    """
    new_status = request.data.get("status")
    allowed_statuses = ["pending", "approved", "declined"]

    if new_status not in allowed_statuses:
        return Response({"error": f"Invalid status. Allowed: {allowed_statuses}"}, status=400)

    service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Get vet_id from vet_profile
    vet_profile_res = service_client.table("vet_profile").select("vet_id").eq("id", vet_profile_id).execute()
    if not vet_profile_res.data:
        return Response({"error": "Vet profile not found"}, status=404)
    vet_id = vet_profile_res.data[0]["vet_id"]

    # Update user status
    update_res = service_client.table("users").update({"status": new_status}).eq("id", vet_id).execute()
    if not update_res.data:
        return Response({"error": "User not found"}, status=404)

    return Response({"message": f"Status updated to {new_status}", "data": update_res.data[0]}, status=200)

    
# -------------------- DASHBOARD RECENTLY ACTIVITIES --------------------
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


# -------------------- DASHBOARD TOTAL COUNT --------------------
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




# -------------------- GET PROFILES IN SETTINGS --------------------
@api_view(['GET'])
def get_ctu_vet_profiles(request):
    try:
        user_id = request.GET.get('user_id')
        query = sr_client.table("ctu_vet_profile").select("*")

        # Validate user_id if it exists
        if user_id:
            try:
                user_uuid = str(UUID(user_id))  # make sure it's a valid UUID
                query = query.eq("user_id", user_uuid)
            except ValueError:
                return Response({"error": "Invalid user_id format"}, status=status.HTTP_400_BAD_REQUEST)

        response = query.execute()
        print("Supabase response:", response)  # check in console

        if hasattr(response, "data") and response.data:
            return Response(response.data, status=status.HTTP_200_OK)
        else:
            return Response({"message": "No profiles found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        print("Error in get_ctu_vet_profiles:", str(e))  # see exactly what broke
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_users(request):
    try:
        current_user_id = request.GET.get("user_id")
        current_user_role = request.GET.get("role")

        if not current_user_id:
            return Response({"error": "Missing user_id"}, status=status.HTTP_400_BAD_REQUEST)

        query = sr_client.table("ctu_vet_profile").select("*")

        if current_user_role != "admin":
            query = query.eq("ctu_id", current_user_id)

        response = query.execute()

        users_data = [
            {
                "id": u.get("id"),
                "firstname": u.get("ctu_fname"),
                "lastname": u.get("ctu_lname"),
                "email": u.get("ctu_email"),
                "phone": u.get("ctu_phonenum"),
                "role": u.get("role") or "general",
                "status": u.get("status") or "pending",
                "password": u.get("ctu_pass") or ""
            }
            for u in response.data or []
        ]

        return Response(users_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



@api_view(["GET"])
def get_vetnotifications(request):
    """
    Fetch notifications:
    1. New pending veterinarians.
    2. Veterinarian activities (updates/requests).
    """
    try:
        manila_tz = datetime.timezone(datetime.timedelta(hours=8))

        # --- Get pending veterinarians ---
        pending_vets_query = sr_client.table("users") \
            .select("id, status, role, created_at, vet_profile(vet_fname, vet_lname)") \
            .eq("role", "veterinarian") \
            .eq("status", "pending") \
            .execute()
        pending_vets = pending_vets_query.data or []

        # --- Fetch existing notifications (to prevent duplicates) ---
        existing = sr_client.table("notification").select("id").execute()
        existing_ids = {row["id"] for row in (existing.data or [])}

        # --- Insert notifications for pending vets ---
        for vet in pending_vets:
            user_id = vet.get("id")
            if user_id and user_id not in existing_ids:
                vet_profile = vet.get("vet_profile") or {}
                vet_name = f"{vet_profile.get('vet_fname', 'Unknown')} {vet_profile.get('vet_lname', '')}".strip()

                notif_message = f"New veterinarian registered: Dr. {vet_name}. Please accept the request."
                created_at = vet.get("created_at")
                dt_ph = (
                    datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00")).astimezone(manila_tz)
                    if created_at else datetime.datetime.now(manila_tz)
                )

                sr_client.table("notification").insert({
                    "id": user_id,
                    "notif_message": notif_message,
                    "notif_date": dt_ph.strftime("%Y-%m-%d"),
                    "notif_time": dt_ph.strftime("%H:%M:%S"),
                }).execute()

        # --- Fetch all notifications ---
        result = sr_client.table("notification").select("*").order("notif_date", desc=True).execute()
        notifications = [
            {
                "id": row["notif_id"],
                "message": row["notif_message"],
                "date": f"{row['notif_date']}T{row['notif_time']}+08:00",
            }
            for row in (result.data or [])
        ]

        return Response(notifications, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

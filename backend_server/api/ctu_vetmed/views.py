from uuid import UUID
from functools import wraps
import os
import requests
import logging
import datetime
import random
import jwt

from django.conf import settings
from django.contrib.auth.decorators import login_required

from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from supabase import create_client 

# -------------------- SUPABASE CLIENT --------------------
# Environment config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")
CONTENT_TYPE_JSON = "application/json"

# Supabase service role client
sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# -------------------- AUTH HELPERS --------------------
def get_token_from_cookie(request):
    """Return the JWT or access token from the HttpOnly cookie"""
    return request.COOKIES.get("access_token")

def login_required(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        token = get_token_from_cookie(request)
        if not token:
            return Response({"error": "Authentication required"}, status=401)
        # Optional: verify token with Supabase here
        return func(request, *args, **kwargs)
    return wrapper

# -------------------- TEST ENDPOINT --------------------
@api_view(["GET"])
def test_cookie(request):
    token = request.COOKIES.get("access_token")
    return Response({"cookie_received": bool(token), "token": token})



def generate_sequential_id():
    """
    Generate a sequential ID starting from 1, ensuring it contains the digit 2
    and does not collide with existing IDs in ctu_vet_profile.
    """
    existing = sr_client.table("ctu_vet_profile").select("id").execute()
    existing_ids = [r["id"] for r in getattr(existing, "data", [])]

    new_id = 1
    while True:
        if new_id not in existing_ids and '2' in str(new_id):
            return new_id
        new_id += 1


# -------------------- SIGNUP ENDPOINT --------------------

@api_view(['POST'])
def signup(request):
    try:
        # Get fields from request
        email = request.data.get("email", "").strip().lower()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        password = request.data.get("password", "").strip()
        role = request.data.get("role", "").strip()

        if not all([email, first_name, last_name, phone_number, password, role]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }

        # Step 1: Check if email exists in Supabase Auth
        check_res = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users?email={email}", headers=headers)
        user_id = None
        if check_res.status_code == 200:
            users_list = check_res.json().get("users", [])
            for u in users_list:
                if u.get("email") == email:
                    user_id = u.get("id")
                    break

        # Step 2: Create Supabase Auth user if not exists
        if not user_id:
            auth_res = requests.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True  # bypass email verification
                },
                headers=headers
            )
            if auth_res.status_code not in [200, 201]:
                return Response({"error": "Failed to create user in Supabase Auth", "details": auth_res.text}, status=400)
            user_id = auth_res.json().get("id")

        # Step 3: Insert into public.users table with status="approved"
        users_headers = headers.copy()
        users_headers["Prefer"] = "return=representation"
        users_res = requests.post(
            f"{SUPABASE_URL}/rest/v1/users",
            json={"id": user_id, "role": role, "status": "approved"},
            headers=users_headers
        )

        # Step 4: Insert into ctu_vet_profile safely
        unique_id = generate_sequential_id()

        profile_payload = {
            "id": unique_id,
            "ctu_id": user_id,
            "ctu_fname": first_name,
            "ctu_lname": last_name,
            "ctu_email": email,
            "ctu_phonenum": phone_number,
            "ctu_pass": password,
            "role": role
        }

        profile_res = sr_client.table("ctu_vet_profile").insert(profile_payload).execute()

        # Handle APIResponse safely to avoid 500
        profile_data = getattr(profile_res, "data", None)
        profile_error = getattr(profile_res, "error", None)
        if profile_error or profile_data is None:
            return Response({
                "error": "Failed to insert into ctu_vet_profile",
                "details": profile_error or profile_data
            }, status=400)

        return Response({
            "message": "User created successfully.",
            "user": {
                "id": user_id,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "phoneNumber": phone_number,
                "role": role,
                "status": "approved"
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
@api_view(["GET"])
@login_required
def get_ctu_vet_profiles(request):
    token = request.COOKIES.get("access_token")
    if not token:
        return Response({"error": "Authentication required"}, status=401)

    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token"}, status=401)
    except Exception:
        return Response({"error": "Invalid token"}, status=401)

    res = sr_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
    profile = res.data[0] if res.data else None

    if not profile:
        return Response({"error": "Profile not found"}, status=404)

    return Response({
        "ctu_id": profile.get("ctu_id"),
        "user_id": user_id,
        "ctu_email": profile.get("ctu_email", ""),
        "ctu_fname": profile.get("ctu_fname", ""),
        "ctu_lname": profile.get("ctu_lname", ""),
        "ctu_phonenum": profile.get("ctu_phonenum", "")
    })

# Assuming you have your Supabase client setup as sr_client
# -------------------- SAVE CTU VET PROFILE --------------------
@api_view(["POST"])
def save_ctu_vet_profile(request):
    """
    Save first-time CTU Vet profile:
    - fname, lname, phone, email
    - Uses Supabase table 'ctu_vet_profile'
    """
    try:
        # 1️⃣ Get token to identify user
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        ctu_id = payload.get("sub")
        if not ctu_id:
            return Response({"error": "Invalid token"}, status=401)

        # 2️⃣ Get input values
        ctu_fname = request.data.get("ctu_fname", "").strip()
        ctu_lname = request.data.get("ctu_lname", "").strip()
        ctu_email = request.data.get("ctu_email", "").strip()
        ctu_phonenum = request.data.get("ctu_phonenum", "")

        # 3️⃣ Validate required fields
        errors = {}
        if not ctu_fname:
            errors["ctu_fname"] = "First name is required."
        if not ctu_lname:
            errors["ctu_lname"] = "Last name is required."
        if not ctu_email:
            errors["ctu_email"] = "Email is required."
        if not ctu_phonenum:
            errors["ctu_phonenum"] = "Phone number is required."

        if errors:
            return Response({"errors": errors}, status=400)

        # 4️⃣ Upsert profile in Supabase
        profile_data = {
            "ctu_id": ctu_id,
            "ctu_fname": ctu_fname,
            "ctu_lname": ctu_lname,
            "ctu_email": ctu_email,
            "ctu_phonenum": ctu_phonenum,
        }

        response = sr_client.table("ctu_vet_profile").upsert(profile_data, on_conflict="ctu_id").execute()

        # ✅ Safe handling
        profile_error = getattr(response, "error", None)
        profile_result = getattr(response, "data", None)

        if profile_error:
            return Response({"error": str(profile_error)}, status=500)
        if not profile_result:
            return Response({"error": "Failed to save profile"}, status=400)

        return Response({
            "message": "Profile saved successfully",
            "profile": profile_result[0]
        })

    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)


# -------------------- UPDATE CTU VET PROFILE --------------------
@api_view(["POST"])
def update_ctu_vet_profile(request):
    """
    Update existing CTU Vet profile
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        ctu_id = payload.get("sub")
        if not ctu_id:
            return Response({"error": "Invalid token"}, status=401)

        data = request.data
        update_data = {}

        if "ctu_fname" in data:
            update_data["ctu_fname"] = data["ctu_fname"].strip()
        if "ctu_lname" in data:
            update_data["ctu_lname"] = data["ctu_lname"].strip()
        if "ctu_email" in data:
            update_data["ctu_email"] = data["ctu_email"].strip()
        if "ctu_phonenum" in data:
            update_data["ctu_phonenum"] = data["ctu_phonenum"]

        if not update_data:
            return Response({"error": "No fields provided to update"}, status=400)

        # Supabase update
        response = sr_client.table("ctu_vet_profile").update(update_data).eq("ctu_id", ctu_id).execute()

        # ✅ Safe handling
        update_error = getattr(response, "error", None)
        update_result = getattr(response, "data", None)

        if update_error:
            return Response({"error": str(update_error)}, status=500)
        if not update_result:
            return Response({"error": "Profile not found"}, status=404)

        return Response({
            "message": "Profile updated successfully",
            "profile": update_result[0]
        })

    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)
# -------------------- SAVE CTU VET PROFILE --------------------
@api_view(["POST"])
def save_ctu_vet_profile(request):
    """
    Save first-time CTU Vet profile:
    - fname, lname, phone, email
    - Uses Supabase table 'ctu_vet_profile'
    """
    try:
        # 1️⃣ Get token to identify user
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        ctu_id = payload.get("sub")
        if not ctu_id:
            return Response({"error": "Invalid token"}, status=401)

        # 2️⃣ Get input values
        ctu_fname = request.data.get("ctu_fname", "").strip()
        ctu_lname = request.data.get("ctu_lname", "").strip()
        ctu_email = request.data.get("ctu_email", "").strip()
        ctu_phonenum = request.data.get("ctu_phonenum", "")

        # 3️⃣ Validate required fields
        errors = {}
        if not ctu_fname:
            errors["ctu_fname"] = "First name is required."
        if not ctu_lname:
            errors["ctu_lname"] = "Last name is required."
        if not ctu_email:
            errors["ctu_email"] = "Email is required."
        if not ctu_phonenum:
            errors["ctu_phonenum"] = "Phone number is required."

        if errors:
            return Response({"errors": errors}, status=400)

        # 4️⃣ Upsert profile in Supabase
        profile_data = {
            "ctu_id": ctu_id,
            "ctu_fname": ctu_fname,
            "ctu_lname": ctu_lname,
            "ctu_email": ctu_email,
            "ctu_phonenum": ctu_phonenum,
        }

        response = sr_client.table("ctu_vet_profile").upsert(profile_data, on_conflict="ctu_id").execute()

        # ✅ Safe handling
        profile_error = getattr(response, "error", None)
        profile_result = getattr(response, "data", None)

        if profile_error:
            return Response({"error": str(profile_error)}, status=500)
        if not profile_result:
            return Response({"error": "Failed to save profile"}, status=400)

        return Response({
            "message": "Profile saved successfully",
            "profile": profile_result[0]
        })

    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)


# -------------------- UPDATE CTU VET PROFILE --------------------
@api_view(["POST"])
def update_ctu_vet_profile(request):
    """
    Update existing CTU Vet profile
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        ctu_id = payload.get("sub")
        if not ctu_id:
            return Response({"error": "Invalid token"}, status=401)

        data = request.data
        update_data = {}

        if "ctu_fname" in data:
            update_data["ctu_fname"] = data["ctu_fname"].strip()
        if "ctu_lname" in data:
            update_data["ctu_lname"] = data["ctu_lname"].strip()
        if "ctu_email" in data:
            update_data["ctu_email"] = data["ctu_email"].strip()
        if "ctu_phonenum" in data:
            update_data["ctu_phonenum"] = data["ctu_phonenum"]

        if not update_data:
            return Response({"error": "No fields provided to update"}, status=400)

        # Supabase update
        response = sr_client.table("ctu_vet_profile").update(update_data).eq("ctu_id", ctu_id).execute()

        # ✅ Safe handling
        update_error = getattr(response, "error", None)
        update_result = getattr(response, "data", None)

        if update_error:
            return Response({"error": str(update_error)}, status=500)
        if not update_result:
            return Response({"error": "Profile not found"}, status=404)

        return Response({
            "message": "Profile updated successfully",
            "profile": update_result[0]
        })

    except Exception as e:
        return Response({"error": f"Server error: {str(e)}"}, status=500)














@api_view(['GET'])
def get_users(request):
    try:
        current_user_id = request.GET.get("user_id")
        current_user_role = request.GET.get("role")

        if not current_user_id:
            return Response({"error": "Missing user_id"}, status=status.HTTP_400_BAD_REQUEST)

        query = sr_client.table("ctu_vet_profile").select("*")

        if current_user_role != "Ctu-Admin":
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
    





# --------------------UPDATE THE STATUS IN ACCOUNT APPROVAL--------------------


@api_view(['PATCH'])
def update_vet_status(request, vet_profile_id):
    """
    Update the status of a vet user (pending, approved, declined)
    """
    new_status = request.data.get("status")
    allowed_statuses = ["pending", "approved", "declined"]

    if new_status not in allowed_statuses:
        return Response({"error": f"Invalid status. Allowed: {allowed_statuses}"}, status=400)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Get vet_id from vet_profile
        vet_profile_res = service_client.table("vet_profile").select("vet_id").eq("id", vet_profile_id).execute()
        if not vet_profile_res.data:
            return Response({"error": f"Vet profile with id {vet_profile_id} not found"}, status=404)

        vet_id = vet_profile_res.data[0].get("vet_id")
        if not vet_id:
            return Response({"error": "Vet ID not found in profile"}, status=404)

        # Update user status
        update_res = service_client.table("users").update({"status": new_status}).eq("id", vet_id).execute()
        if not update_res.data:
            return Response({"error": f"User with id {vet_id} not found"}, status=404)

        return Response({"message": f"Status updated to {new_status}", "data": update_res.data[0]}, status=200)

    except Exception as e:
        # Catch all unexpected errors
        logging.exception("Failed to update vet status")
        return Response({"error": "Internal server error", "details": str(e)}, status=500)


# --------------------NOTIFICATIONS--------------------

@api_view(["GET"])
def get_vetnotifications(request):
    """
    Fetch pending and approved veterinarians only, insert notifications in Supabase, 
    and return all notifications.
    """
    try:
        manila_tz = datetime.timezone(datetime.timedelta(hours=8))

        # 1️⃣ Fetch all vet profiles joined with users (status + role)
        vets_res = sr_client.table("vet_profile") \
            .select("vet_id, vet_fname, vet_lname, created_at, users(status, role)") \
            .execute()

        # ✅ Filter only pending veterinarians
        pending_vets = [
            v for v in (vets_res.data or [])
            if v.get("users", {}).get("status", "").lower() == "pending" and
               v.get("users", {}).get("role", "").lower() == "veterinarian"
        ]

        # ✅ Filter approved veterinarians
        approved_vets = [
            v for v in (vets_res.data or [])
            if v.get("users", {}).get("status", "").lower() == "approved" and
               v.get("users", {}).get("role", "").lower() == "veterinarian"
        ]

        # 2️⃣ Get existing notifications to avoid duplicates
        existing_res = sr_client.table("notification").select("id").execute()
        existing_ids = {row["id"] for row in (existing_res.data or [])}

        # 3️⃣ Insert notifications for pending veterinarians
        for vet in pending_vets:
            vet_id = str(vet.get("vet_id"))
            if vet_id in existing_ids:
                continue

            vet_name = f"{vet.get('vet_fname','')} {vet.get('vet_lname','')}".strip()
            created_at = vet.get("created_at")
            dt_ph = (datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                     .astimezone(manila_tz)) if created_at else datetime.datetime.now(manila_tz)

            notif_payload = {
                "id": vet_id,
                "notif_message": f"New veterinarian registered: Dr. {vet_name}.",
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
            }

            sr_client.table("notification").insert(notif_payload).execute()

        # 4️⃣ Insert notifications for approved veterinarians
        for vet in approved_vets:
            vet_id = str(vet.get("vet_id"))
            if vet_id in existing_ids:
                continue

            vet_name = f"{vet.get('vet_fname','')} {vet.get('vet_lname','')}".strip()
            created_at = vet.get("created_at")
            dt_ph = (datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                     .astimezone(manila_tz)) if created_at else datetime.datetime.now(manila_tz)

            notif_payload = {
                "id": vet_id,
                "notif_message": f"New veterinarian approved: Dr. {vet_name}.",
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
            }

            sr_client.table("notification").insert(notif_payload).execute()

        # 5️⃣ Fetch all notifications (latest first)
        all_notifs_res = sr_client.table("notification") \
            .select("*") \
            .order("notif_date", desc=True) \
            .order("notif_time", desc=True) \
            .execute()

        notifications = []
        for row in (all_notifs_res.data or []):
            notif_msg = row.get("notif_message", "")
            if "veterinarian" not in notif_msg.lower():
                continue

            date_iso = f"{row['notif_date']}T{row['notif_time']}+08:00"
            notifications.append({
                "id": row["id"],
                "message": notif_msg,
                "date": date_iso,
            })

        return Response(notifications, status=200)

    except Exception as e:
        print("Error in get_vetnotifications:", e)
        return Response({"error": str(e)}, status=500)




# -------------------- GET VET,KUTSERO, HORSE OPERATOR PROFILE --------------------

@api_view(['GET'])
def get_directory_profiles(request):
    """
    Fetch all records from vet_profile, kutsero_profile, and horse_operator_profile
    """
    try:
        vets = sr_client.table("vet_profile").select("*, users(status)").execute()
        kutseros = sr_client.table("kutsero_profile").select("*, users(status)").execute()
        horse_operators = sr_client.table("horse_operator_profile").select(
            "*, users!horse_operator_profile_operator_id_fkey(status)"
        ).execute()

        return Response({
            "vets": vets.data or [],
            "kutseros": kutseros.data or [],
            "horse_operators": horse_operators.data or []
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logging.exception("Error fetching directory profiles")
        return Response(
            {"error": "Internal Server Error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




@api_view(['GET'])
def display_ctu_profiles(request):
    """
    Fetch all CTU VetMed profiles.
    Non-admin users only get their own profile.
    """
    user_id = request.GET.get("user_id")
    role = request.GET.get("role", "")

    try:
        query = sr_client.table("ctu_vet_profile").select("*")

        # Non-admin users only see their own record
        if role != "admin" and user_id:
            query = query.eq("ctu_id", user_id)

        response = query.execute()
        data = response.data or []

        # Standardize field names for frontend
        profiles = []
        for p in data:
            profiles.append({
                "id": p.get("ctu_id"),
                "ctu_fname": p.get("ctu_fname"),
                "ctu_lname": p.get("ctu_lname"),
                "ctu_email": p.get("ctu_email"),
                "ctu_phonenum": p.get("ctu_phonenum"),
                "role": p.get("role") or "Ctu-VetMed",
                "status": p.get("status") or "pending"
            })

        return Response(profiles, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error fetching CTU profiles:", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
def get_account_counts(request):
    """
    Returns the counts of vet accounts by status: pending, approved, declined
    from Supabase vet_profile table joined with users table for status.
    """
    try:
        # Query vet_profile with joined user status
        response = sr_client.table("vet_profile").select("id, users(status)").execute()

        # Initialize counters
        counts = {"pending": 0, "approved": 0, "declined": 0}

        if response.data:
            for row in response.data:
                user_status = row.get("users", {}).get("status", "").lower()
                if user_status in counts:
                    counts[user_status] += 1

        return Response(counts, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Internal Server Error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
def delete_vet_profile(request, vet_id):
    """
    Delete a vet profile from the Supabase vet_profile table.
    """
    try:
        response = sr_client.table("vet_profile").delete().eq("id", vet_id).execute()

        if not response.data:
            return Response(
                {"error": f"Vet profile with id {vet_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {"message": f"Vet profile with id {vet_id} deleted successfully."},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": "Internal Server Error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    


@api_view(["POST"])
@login_required
def update_ctu_profile(request):
    """
    Update CTU Vet profile: ctu_fname, ctu_lname, ctu_email, ctu_phonenum
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        import jwt
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        ctu_fname = request.data.get("ctu_fname", "").strip()
        ctu_lname = request.data.get("ctu_lname", "").strip()
        ctu_email = request.data.get("ctu_email", "").strip()
        ctu_phonenum = request.data.get("ctu_phonenum", "").strip()

        errors = {}
        if not ctu_fname:
            errors["ctu_fname"] = "First name is required."
        if not ctu_lname:
            errors["ctu_lname"] = "Last name is required."
        if not ctu_email:
            errors["ctu_email"] = "Email is required."
        if not ctu_phonenum:
            errors["ctu_phonenum"] = "Phone number is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # Convert phone number to int
        try:
            ctu_phonenum = int(ctu_phonenum)
        except ValueError:
            return Response({"error": "Phone number must be numeric"}, status=400)

        # Upsert using service role client
        sr_client.table("ctu_vet_profile").upsert({
            "ctu_id": user_id,
            "ctu_fname": ctu_fname,
            "ctu_lname": ctu_lname,
            "ctu_email": ctu_email,
            "ctu_phonenum": ctu_phonenum
        }, on_conflict="ctu_id").execute()

        return Response({"message": "Profile updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)









@api_view(["POST"])
@login_required  # your decorator reads JWT from cookie
def ctu_change_password(request):
    """
    Update CTU Vet user's password using JWT from cookie
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token"}, status=401)

        # Fetch the user (adjust your User model if needed)
        user = User.objects.get(id=user_id)

        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response({"error": "Old password is incorrect"}, status=400)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password updated successfully"}, status=200)

    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

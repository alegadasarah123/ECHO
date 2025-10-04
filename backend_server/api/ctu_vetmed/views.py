from uuid import UUID
from functools import wraps
import os
import requests
import logging
import random
import jwt
from django.conf import settings
from django.contrib.auth.decorators import login_required
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import re
from supabase import create_client 
from django.http import JsonResponse
from django.utils import timezone
import base64
from collections import defaultdict
from datetime import datetime, timezone, timedelta



# -------------------- SUPABASE CLIENT --------------------
# Environment config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")
CONTENT_TYPE_JSON = "application/json"

# Supabase service role client
sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
storage_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)  # for storage operations



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


# -------------------- SIGNUP ENDPOINT --------------------
@api_view(['POST'])
def signup(request):
    try:
        # 1️⃣ Extract and clean fields
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        role = request.data.get("role", "Ctu-Vetmed").strip()   # Default = Ctu-Vetmed

        if not all([email, password, first_name, last_name, phone_number]):
            return Response({"error": "All fields are required"}, status=400)

        # 2️⃣ Validate phone
        if not re.fullmatch(r"09\d{9}", phone_number):
            return Response({"error": "Phone number must start with 09 and be 11 digits long"}, status=400)

        # Supabase Auth headers
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }

        # 3️⃣ Check if user already exists in Auth
        check_res = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users?email={email}", headers=headers)
        if check_res.status_code != 200:
            return Response({"error": "Failed to check existing users"}, status=400)

        users_list = check_res.json().get("users", [])
        user_id = next((u.get("id") for u in users_list if u.get("email") == email), None)

        # 4️⃣ Create in Auth if not exists
        if not user_id:
            auth_res = requests.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=headers,
                json={"email": email, "password": password, "email_confirm": True}
            )
            if auth_res.status_code not in [200, 201]:
                return Response({"error": "Failed to create user in Supabase Auth", "details": auth_res.text}, status=400)
            user_id = auth_res.json().get("id")

        # 5️⃣ Insert/Update central users table
        user_record = {
            "id": user_id,         # must match auth.users.id
            "role": role,          # "Ctu-Vetmed" or "Ctu-Admin"
            "status": "approved"   # could also be "pending"
        }
        users_res = sr_client.table("users").upsert(user_record).execute()
        if getattr(users_res, "error", None):
            return Response({"error": "Failed to insert into users table", "details": users_res.error}, status=400)

        # 6️⃣ Insert into CTU Vet profile
        profile_payload = {
            "ctu_id": user_id,
            "ctu_fname": first_name,
            "ctu_lname": last_name,
            "ctu_email": email,
            "ctu_phonenum": phone_number,
            "ctu_role": role
        }
        profile_res = sr_client.table("ctu_vet_profile").upsert(profile_payload).execute()
        if getattr(profile_res, "error", None):
            return Response({"error": "Failed to insert profile", "details": profile_res.error}, status=400)

        # ✅ Success
        return Response({
            "message": "User created successfully",
            "user": {
                "id": user_id,
                "role": role,
                "status": "approved"
            }
        }, status=201)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": "Internal Server Error", "details": str(e)}, status=500)



# -------------------- GET VET PROFILES --------------------
# -------------------- GET VET PROFILES --------------------
@api_view(["GET"])
def get_vet_profiles(request):
    import json
    import logging

    try:
        response = sr_client.table("vet_profile").select("*, users(status)").execute()
        data = response.data or []

        for row in data:
            # Normalize vet_profile_photo
            profile_photo = row.get("vet_profile_photo")
            if profile_photo:
                if isinstance(profile_photo, str) and not profile_photo.startswith("http"):
                    # If only filename stored, get full public URL
                    public_url = sr_client.storage.from_("vet_profile").get_public_url(profile_photo)
                    row["vet_profile_photo"] = public_url
                # Else already a full URL — leave as is

            # Normalize vet_documents (may be stored as JSON string or list)
            documents = row.get("vet_documents", "[]")
            normalized_docs = []

            # Decode JSON string if needed
            if isinstance(documents, str):
                try:
                    docs_list = json.loads(documents)
                except json.JSONDecodeError:
                    docs_list = []
            elif isinstance(documents, list):
                docs_list = documents
            else:
                docs_list = []

            # Normalize each document URL
            for doc in docs_list:
                if isinstance(doc, str) and doc.strip():
                    if doc.startswith("http"):
                        normalized_docs.append(doc)
                    else:
                        public_url = sr_client.storage.from_("vet_documents").get_public_url(doc)
                        if public_url:
                            normalized_docs.append(public_url)

            # Always return vet_documents as a list
            row["vet_documents"] = normalized_docs

        return Response({"data": data}, status=status.HTTP_200_OK)

    except Exception:
        logging.exception("Failed to fetch vet profiles")
        return Response({"error": "Failed to fetch vet profiles"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# -------------------- UPDATE STATUS --------------------
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
import logging

# assume sr_client is already created at module top
# sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

@api_view(['PATCH'])
def update_vet_status(request, vet_profile_id):
    """
    Update the status of a vet user (pending, approved, declined)
    and send a modern HTML email notification on approved or declined.
    """
    new_status = request.data.get("status")
    decline_reason = request.data.get("decline_reason")  # Get decline reason from request
    reason_text = decline_reason if decline_reason else "Not provided"

    allowed_statuses = ["pending", "approved", "declined"]
    if new_status not in allowed_statuses:
        return Response({"error": f"Invalid status. Allowed: {allowed_statuses}"}, status=400)

    # Get vet profile
    vet_profile_res = sr_client.table("vet_profile")\
        .select("vet_id, vet_email, vet_fname, vet_lname")\
        .eq("vet_id", str(vet_profile_id)).execute()

    if not vet_profile_res.data:
        return Response({"error": "Vet profile not found"}, status=404)

    vet_data = vet_profile_res.data[0]
    vet_id = vet_data["vet_id"]
    vet_email = vet_data.get("vet_email")
    vet_name = f"{vet_data.get('vet_fname','')} {vet_data.get('vet_lname','')}".strip() or "User"

    # Update user status and save decline_reason in users table
    update_data = {"status": new_status}
    if new_status == "declined":
        update_data["decline_reason"] = reason_text

    update_res = sr_client.table("users").update(update_data).eq("id", vet_id).execute()
    if not update_res.data:
        return Response({"error": "User not found"}, status=404)

    # Send email when approved or declined
    if vet_email and new_status in ["approved", "declined"]:
        if new_status == "approved":
            subject = "Your Veterinarian Account Has Been Approved"
            plain_message = f"Hello {vet_name},\n\nYour veterinarian account has been approved. You can now log in and start using the system.\n\nBest regards,\nECHOSys Team"
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                    <h1 style="margin:0; font-size:24px;">Account Approved ✅</h1>
                  </div>
                  <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                    <p>Hello {vet_name},</p>
                    <p>Good news! Your veterinarian account has been approved by the admin. You can now log in and start using the system.</p>
                    <div style="text-align:center; margin:30px 0;">
                      <a href="http://localhost:5173/login" style="background-color:#8B4513; color:white; text-decoration:none; padding:12px 25px; border-radius:6px; font-weight:bold;">Login Now</a>
                    </div>
                    <p>Best regards,<br>ECHOSys Team</p>
                  </div>
                </div>
              </body>
            </html>
            """
        else:  # declined
            subject = "Your Veterinarian Account Has Been Declined"
            plain_message = f"Hello {vet_name},\n\nWe’re sorry to inform you that your veterinarian account request has been declined by the admin. The reason: {reason_text}. Please contact support if needed.\n\nBest regards,\nECHOSys Team"
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                    <h1 style="margin:0; font-size:24px;">Account Declined ⚠️</h1>
                  </div>
                  <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                    <p>Hello {vet_name},</p>
                    <p>We’re sorry to inform you that your veterinarian account request has been declined by the admin. The reason: <strong>{reason_text}</strong>.</p>
                    
                    <p>Best regards,<br>ECHOSys Team</p>
                  </div>
                </div>
              </body>
            </html>
            """

        # Send the email
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[vet_email],
                fail_silently=False,
                html_message=html_message
            )
        except Exception as e:
            logging.exception("Failed to send vet status email")
            return Response({
                "message": f"Status updated to {new_status}, but email failed to send",
                "error": str(e)
            }, status=200)

    return Response({
        "message": f"Status updated to {new_status}",
        "data": update_res.data[0]
    }, status=200)








    
# -------------------- DASHBOARD RECENTLY ACTIVITIES --------------------
# -------------------- DASHBOARD RECENTLY ACTIVITIES --------------------
@api_view(["GET"])
def get_recent_activity(request):
    try:
        response = (
            sr_client.table("vet_profile")
            .select(
                "vet_id, vet_fname, vet_lname, vet_email, created_at, "
                "users!vet_profile_vet_id_fkey(status)"
            )
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        if not response.data:
            return Response([], status=200)

        activities = []
        for row in response.data:
            # Safely extract user status
            user_data = row.get("users") or {}
            user_status = user_data.get("status", "unknown")

            first_name = row.get("vet_fname", "")
            last_name = row.get("vet_lname", "")
            full_name = f"{first_name} {last_name}".strip()

            initials = "".join([w[0] for w in full_name.split() if w]).upper()

            activities.append({
                "id": row["vet_id"],                  # vet_id
                "title": full_name,                   # full name
                "initials": initials,                 # initials
                "description": f"User is currently {user_status.capitalize()}",
                "status": user_status,                # status
                "date": row.get("created_at"),        # created_at
                "email": row.get("vet_email")         # vet_email
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
            .select("vet_id, users(status)")
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
        "ctu_phonenum": profile.get("ctu_phonenum", ""),
        "ctu_role": profile.get("ctu_role", "")
        
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
    

# --------------------NOTIFICATIONS--------------------


from datetime import datetime, timedelta, timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def get_vetnotifications(request):
    """
    Fetch notifications related ONLY to veterinarians and med record access:
    - New registration (pending)
    - Approved
    - Declined
    - Pending medical record access requests
    """
    try:
        manila_tz = timezone(timedelta(hours=8))

        # -------------------- FETCH VET PROFILES -------------------- #
        vets_res = sr_client.table("vet_profile") \
            .select("vet_id, vet_fname, vet_lname, created_at, users(status, role)") \
            .execute()

        # -------------------- FETCH EXISTING NOTIFICATIONS -------------------- #
        existing_res = sr_client.table("notification") \
            .select("id, notif_message") \
            .execute()

        existing_ids = {
            row["id"] for row in (existing_res.data or [])
            if "veterinarian" in row.get("notif_message", "").lower()
               or "vet." in row.get("notif_message", "").lower()
        }

        notifications_to_insert = []

        # -------------------- VETERINARIAN STATUS NOTIFICATIONS -------------------- #
        def add_vet_notif(vet, status_label, message_prefix):
            vet_id = str(vet.get("vet_id"))
            if vet_id in existing_ids:
                return
            vet_name = f"{vet.get('vet_fname','')} {vet.get('vet_lname','')}".strip()
            created_at = vet.get("created_at")
            dt_ph = (
                datetime.fromisoformat(created_at.replace("Z", "+00:00")).astimezone(manila_tz)
                if created_at else datetime.now(manila_tz)
            )
            notifications_to_insert.append({
                "id": vet_id,
                "notif_message": f"{message_prefix} Dr. {vet_name}.",
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
            })

        for vet in (vets_res.data or []):
            role = vet.get("users", {}).get("role", "").lower()
            status = vet.get("users", {}).get("status", "").lower()
            if role != "veterinarian":
                continue
            if status == "pending":
                add_vet_notif(vet, status, "New veterinarian registered:")
            elif status == "approved":
                add_vet_notif(vet, status, "New veterinarian approved:")
            elif status == "declined":
                add_vet_notif(vet, status, "Veterinarian declined:")

        # -------------------- MEDICAL RECORD ACCESS REQUESTS -------------------- #
        medreq_res = sr_client.table("medrec_access_request") \
            .select("request_id, vet_id, horse_id, request_status, requested_at, horse_profile(horse_name)") \
            .execute()

        pending_requests = [
            r for r in (medreq_res.data or [])
            if r.get("request_status", "").lower() == "pending"
        ]

        # Fetch vet names separately
        vet_map = {
            str(v["vet_id"]): f"{v.get('vet_fname','')} {v.get('vet_lname','')}".strip()
            for v in (vets_res.data or [])
        }

        for req in pending_requests:
            req_id = str(req.get("request_id"))
            if req_id in existing_ids:
                continue
            vet_id = str(req.get("vet_id"))
            vet_name = vet_map.get(vet_id, "Unknown Vet")
            horse_name = req.get("horse_profile", {}).get("horse_name", "Unknown Horse")
            requested_at = req.get("requested_at")

            dt_ph = (
                datetime.fromisoformat(requested_at.replace("Z", "+00:00")).astimezone(manila_tz)
                if requested_at else datetime.now(manila_tz)
            )

            notifications_to_insert.append({
                "id": req_id,
                "notif_message": f"Vet. {vet_name} requested access to {horse_name}'s medical records.",
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
            })

        # -------------------- INSERT NEW NOTIFICATIONS -------------------- #
        for notif in notifications_to_insert:
            sr_client.table("notification").insert(notif).execute()

        # -------------------- FETCH ALL VET-RELATED NOTIFICATIONS -------------------- #
        all_notifs_res = sr_client.table("notification") \
            .select("*") \
            .order("notif_date", desc=True) \
            .order("notif_time", desc=True) \
            .execute()

        notifications = []
        for row in (all_notifs_res.data or []):
            notif_msg = row.get("notif_message", "")
            if "veterinarian" not in notif_msg.lower() and "vet." not in notif_msg.lower():
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





# -------------------- GET VET,KUTSERO, HORSE OPERATOR PROFILE IN DIRECRORY --------------------

@api_view(['GET'])
def get_directory_profiles(request):
    """
    Fetch all records from vet_profile, kutsero_profile, and horse_op_profile
    """
    try:
        # Fetch vets with their user status
        vets = sr_client.table("vet_profile").select("*, users(status)").execute()

        # Fetch kutseros with their user status
        kutseros = sr_client.table("kutsero_profile").select("*, users(status)").execute()

        # Fetch horse operators with their user status
        # FK is horse_op_profile_operator_id_fkey pointing to users.id
        horse_operators = sr_client.table("horse_op_profile").select(
            "*, users!horse_op_profile_operator_id_fkey(status)"
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
        response = sr_client.table("vet_profile").select("vet_id, users(status)").execute()

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









# -------------------- CHANGE PASSWORD --------------------


@api_view(["POST"])
def ctu_change_password(request):
    """
    Change password for the logged-in CTU VetMed user
    """
    try:
        # 🔑 Get token from cookies
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        # Decode JWT to get user_id
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token"}, status=401)

        # Get passwords and email
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()
        ctu_email = request.data.get("ctu_email", "").strip().lower()

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if not ctu_email:
            errors["ctu_email"] = "Email is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Verify current password by logging in again with Supabase
        verify_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_SERVICE_ROLE_KEY},
            json={"email": ctu_email, "password": current_password}
        )
        verify_data = verify_resp.json()
        if verify_resp.status_code != 200 or "access_token" not in verify_data:
            return Response({"errors": {"current_password": "Incorrect current password"}}, status=400)

        # ✅ Update password via Supabase Admin API
        update_resp = requests.put(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            },
            json={"password": new_password}
        )
        if update_resp.status_code not in [200, 201]:
            return Response({"error": "Failed to update password in Supabase"}, status=400)

        return Response({"message": "Password updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)







# -------------------- HELPER --------------------
def get_current_user(request):
    token = request.COOKIES.get("access_token")
    if not token:
        print("No access_token cookie found")
        return None
    try:
        # Use token as a JWT
        user_res = sr_client.auth.get_user(jwt=token)
        if user_res and getattr(user_res, "user", None):
            print("Authenticated user:", user_res.user.id)
            return user_res.user.id
        print("No user found in Supabase response")
        return None
    except Exception as e:
        print("Auth error:", e)
        return None



# -------------------- FETCH USERS --------------------
# -------------------- FETCH USERS --------------------
@api_view(['GET'])
def fetch_users(request):
    try:
        # kuha sa profiles
        profiles_res = sr_client.table("ctu_vet_profile").select("*").execute()

        # kuha sa users (id, role, status)
        users_res = sr_client.table("users").select("id, role, status").execute()
        users_map = {u["id"]: {"role": u["role"], "status": u["status"]} for u in users_res.data or []}

        profiles = []
        for p in profiles_res.data or []:
            user_data = users_map.get(p.get("ctu_id"), {})
            profiles.append({
                "id": p.get("ctu_id"),
                "ctu_fname": p.get("ctu_fname"),
                "ctu_lname": p.get("ctu_lname"),
                "ctu_email": p.get("ctu_email"),
                "ctu_phonenum": p.get("ctu_phonenum"),
                # override role + status with data from users table
                "role": user_data.get("role", "N/A"),
                "status": user_data.get("status", "pending"),
            })

        return Response(profiles, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)






from django.http import JsonResponse
from rest_framework.decorators import api_view

# -------------------- Deactivate User --------------------
@api_view(['POST'])
def deactivate_user(request, user_id):
    try:
        # Check if user exists
        result = sr_client.table("users").select("*").eq("id", user_id).execute()
        user = result.data[0] if result.data else None

        if not user:
            return JsonResponse({"error": f"User with id {user_id} not found"}, status=404)

        # Update status
        sr_client.table("users").update({"status": "deactivated"}).eq("id", user_id).execute()

        return JsonResponse({"message": "User deactivated successfully"}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




# -------------------- Reactivate User --------------------
@api_view(['POST'])
def reactivate_user(request, user_id):
    try:
        result = sr_client.table("users").select("*").eq("id", user_id).execute()
        user = result.data[0] if result.data else None

        if not user:
            return JsonResponse({"error": f"User with id {user_id} not found"}, status=404)

        # Update to approved (active)
        sr_client.table("users").update({"status": "approved"}).eq("id", user_id).execute()

        return JsonResponse({"message": "User reactivated successfully"}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




# -------------------- MESSAGES ------------------------------

# GET messages between two users
@api_view(["GET"])
@login_required
def get_messages(request, user_id, receiver_id):
    """Fetch all messages between two users"""
    res = sr_client.table("messages").select("*").or_(
        f"(user_id.eq.{user_id},receiver_id.eq.{receiver_id}),"
        f"(user_id.eq.{receiver_id},receiver_id.eq.{user_id})"
    ).order("mes_date", desc=False).execute()
    
    return Response(res.data or [])

# POST new message
@api_view(["POST"])
@login_required
def send_message(request):
    """Send a new message"""
    user_id = request.data.get("user_id")
    receiver_id = request.data.get("receiver_id")
    mes_content = request.data.get("mes_content", "").strip()

    if not mes_content:
        return Response({"error": "Message content cannot be empty"}, status=400)

    res = sr_client.table("messages").insert({
        "user_id": user_id,
        "receiver_id": receiver_id,
        "mes_content": mes_content,
        "mes_date": timezone.now(),
        "is_read": False
    }).execute()

    if res.data:
        return Response(res.data[0], status=201)
    return Response({"error": "Failed to send message"}, status=500)

# -------------------- SEARCH VETS ------------------------------

# GET vets only
@api_view(["GET"])
@login_required
def search_vets(request):
    query = request.GET.get("q", "").strip().lower()

    # Fetch all vet profiles
    vets_res = sr_client.table("vet_profiles").select("*").execute()
    vets = vets_res.data or []

    # Fetch all kutsero profiles
    kutseros_res = sr_client.table("kutsero_profiles").select("*").execute()
    kutseros = kutseros_res.data or []

    # Fetch all horse operator profiles
    ops_res = sr_client.table("horse_op_profiles").select("*").execute()
    horse_ops = ops_res.data or []

    results = []

    # Filter vets
    for v in vets:
        if v.get("users", {}).get("status") != "approved":
            continue
        full_name = f"{v.get('vet_fname','')} {v.get('vet_lname','')}".strip()
        if not query or query in full_name.lower():
            results.append({
                "id": str(v.get("vet_id")),
                "name": full_name,
                "email": v.get("vet_email"),
            })

    # Filter kutseros
    for k in kutseros:
        if k.get("users", {}).get("status") != "approved":
            continue
        full_name = f"{k.get('kutsero_fname','')} {k.get('kutsero_lname','')}".strip()
        if not query or query in full_name.lower():
            results.append({
                "id": str(k.get("kutsero_id")),
                "name": full_name,
                "email": k.get("kutsero_email"),
            })

    # Filter horse operators
    for op in horse_ops:
        if op.get("users", {}).get("status") != "approved":
            continue
        full_name = f"{op.get('op_fname','')} {op.get('op_lname','')}".strip()
        if not query or query in full_name.lower():
            results.append({
                "id": str(op.get("op_id")),
                "name": full_name,
                "email": op.get("op_email"),
            })

    return Response({"users": results}, status=200)




# -------------------- CREATE POST --------------------


# -------------------- HELPER FUNCTIONS --------------------
def _get_user_from_cookie(request):
    token = request.COOKIES.get("access_token")
    if not token:
        return None, Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user_info_url = f"{SUPABASE_URL}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": CONTENT_TYPE_JSON,
        }
        r = requests.get(user_info_url, headers=headers, timeout=10)
        if r.status_code != 200:
            return None, Response({"error": "Invalid or expired session"}, status=status.HTTP_401_UNAUTHORIZED)
        user = r.json() or {}
        user_id = user.get("id")
        if not user_id:
            return None, Response({"error": "User not found"}, status=status.HTTP_401_UNAUTHORIZED)
        return user_id, None
    except requests.RequestException:
        logging.exception("Supabase auth request failed")
        return None, Response({"error": "Auth service unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

# -------------------- CREATE ANNOUNCEMENT --------------------
@api_view(["POST"])
def create_post(request):
    """
    Create an announcement with optional images.
    Images are uploaded to Supabase 'announcement-img' bucket.
    Timestamps use UTC.
    """
    import json
    import base64
    import random
    import logging
    from datetime import datetime, timezone

    user_id, error_response = _get_user_from_cookie(request)
    if error_response:
        return error_response

    title = (request.data.get("announce_title") or "CTU Announcement").strip()
    content = (request.data.get("announce_content") or "").strip()
    images_data = request.data.get("announce_img", [])

    if not content and not images_data:
        return Response({"error": "Content or image is required"}, status=status.HTTP_400_BAD_REQUEST)

    now_iso = datetime.now(timezone.utc).isoformat()
    image_urls = []

    for idx, img_b64 in enumerate(images_data):
        try:
            # Validate base64 image
            if ";base64," not in img_b64:
                logging.warning(f"Skipping invalid image at index {idx}")
                continue

            format, imgstr = img_b64.split(";base64,")
            ext = format.split("/")[-1]
            timestamp = int(datetime.now().timestamp())
            file_name = f"{user_id}_{timestamp}_{random.randint(1000,9999)}.{ext}"
            file_bytes = base64.b64decode(imgstr)

            # Optional: delete first if exists to mimic overwrite
            try:
                sr_client.storage.from_("announcement-img").remove([file_name])
            except Exception:
                pass  # ignore if file does not exist

            # Upload to Supabase
            print(f"[DEBUG] Uploading file: {file_name}")
            upload_res = sr_client.storage.from_("announcement-img").upload(
                file_name,
                file_bytes,
                {"content-type": f"image/{ext}"}
            )
            print(f"[DEBUG] Upload response: {upload_res}")

            # Get public URL
            public_url = sr_client.storage.from_("announcement-img").get_public_url(file_name)
            print(f"[DEBUG] Public URL: {public_url}")

            if public_url and public_url.strip():
                image_urls.append(public_url)
            else:
                logging.error(f"Failed to get public URL for {file_name}")

        except Exception as e:
            logging.exception(f"Image processing/upload failed at index {idx}: {e}")
            continue

    # Prepare row for insert
    row = {
        "announce_title": title,
        "announce_content": content,
        "announce_img": json.dumps(image_urls),  # Convert list to JSON string
        "announce_date": now_iso,
        "user_id": user_id,
    }

    print(f"[DEBUG] Row to insert: {row}")

    try:
        result = sr_client.table("announcement").insert(row).execute()
        print(f"[DEBUG] Insert result: {result}")

        if getattr(result, "data", None):
            return Response({"post": result.data[0]}, status=status.HTTP_201_CREATED)
        return Response({"error": "Failed to create post"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        logging.exception("Supabase insert failed")
        return Response({"error": "Failed to create post"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- GET ANNOUNCEMENTS --------------------
@api_view(["GET"])
def get_announcements(request):
    import json
    import logging

    try:
        result = sr_client.table("announcement").select("*").execute()
        data = result.data or []

        for row in data:
            imgs = row.get("announce_img", "[]")  # default to JSON empty array
            normalized_urls = []

            # Decode JSON string if needed
            if isinstance(imgs, str):
                try:
                    imgs_list = json.loads(imgs)
                except json.JSONDecodeError:
                    imgs_list = []
            elif isinstance(imgs, list):
                imgs_list = imgs
            else:
                imgs_list = []

            # Normalize each image URL
            for img in imgs_list:
                if isinstance(img, str) and img.strip():
                    if img.startswith("http"):
                        normalized_urls.append(img)
                    else:
                        # If stored as filename, get public URL
                        public_url = sr_client.storage.from_("announcement-img").get_public_url(img)
                        if public_url:
                            normalized_urls.append(public_url)

            row["announce_img"] = normalized_urls  # Always a list

        return Response({"data": data}, status=status.HTTP_200_OK)

    except Exception:
        logging.exception("Failed to fetch announcements")
        return Response({"error": "Failed to fetch announcements"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- SEARCH VETS --------------------
# -------------------- SEARCH VETS --------------------
@api_view(["GET"])
@login_required
def search_vet(request):
    query = request.GET.get("q", "").strip().lower()

    try:
        # Fetch all vets from Supabase table "vet_profile"
        response = sr_client.table("vet_profile").select("*").execute()
        vets = response.data or []

        # Optional: filter results by query (fname, lname, or email)
        if query:
            vets = [
                v for v in vets
                if query in (v.get("vet_fname", "").lower())
                or query in (v.get("vet_lname", "").lower())
                or query in (v.get("vet_email", "").lower())
            ]

        # Transform results into frontend-friendly structure
        results = [
            {
                "id": str(v.get("vet_id")),
                "name": f"{v.get('vet_fname', '')} {v.get('vet_lname', '')}".strip(),
                "email": v.get("vet_email"),
                "specialization": v.get("vet_specialization"),
                "phone": v.get("vet_phone_num"),
                "org": v.get("vet_org"),
            }
            for v in vets
        ]

        return Response({"users": results}, status=status.HTTP_200_OK)

    except Exception as e:
        logging.error(f"Error fetching vets: {e}")
        return Response({"error": "Failed to fetch vets"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------- display horses with owner full name --------------------



@api_view(['GET'])
def get_horses(request):
    """
    Fetch all horses with owner info (including operator phone number),
    medical records, treatments, and veterinarian name.
    """
    try:
        horses_response = sr_client.table("horse_profile").select("""
            horse_id,
            horse_name,
            horse_breed,
            horse_dob,
            horse_age,
            horse_sex,
            horse_color,
            horse_weight,
            horse_height,
            horse_image,
            horse_status,
            created_at,
            horse_op_profile (
                op_fname,
                op_mname,
                op_lname,
                op_phone_num,
                op_province,
                op_city,
                op_municipality,
                users (status, role)
            ),
            horse_medical_record (
                medrec_id,
                medrec_date,
                medrec_heart_rate,
                medrec_resp_rate,
                medrec_body_temp,
                medrec_clinical_signs,
                medrec_diagnostic_protocol,
                medrec_lab_results,
                medrec_lab_img,
                medrec_diagnosis,
                medrec_prognosis,
                medrec_recommendation,
                medrec_followup_date,
                medrec_horsestatus,                                                  
                medrec_vet_id,
                vet_profile (
                    vet_fname,
                    vet_mname,
                    vet_lname
                ),
                horse_treatment (
                    treatment_id,
                    treatment_name,
                    treatment_dosage,
                    followup_date,
                    treatment_duration,
                    treatment_outcome
                )
            )
        """).execute()

        horse_list = []

        for horse in horses_response.data:
            # Owner info
            owner = horse.get("horse_op_profile", {})
            fullname = " ".join(filter(None, [owner.get("op_fname"), owner.get("op_mname"), owner.get("op_lname")]))
            location = ", ".join(filter(None, [owner.get("op_municipality"), owner.get("op_city"), owner.get("op_province")]))
            user_info = owner.get("users", {})

            horse["owner_fullname"] = fullname.strip()
            horse["location"] = location.strip()
            horse["status"] = user_info.get("status", "Unknown")
            horse["role"] = user_info.get("role", "N/A")
            horse["owner_phone"] = owner.get("op_phone_num", "")

            if "horse_op_profile" in horse:
                del horse["horse_op_profile"]

            # Vet name in medical records
            med_records = horse.get("horse_medical_record", [])
            for record in med_records:
                vet_info = record.get("vet_profile", {})
                vet_name = " ".join(filter(None, [vet_info.get("vet_fname"), vet_info.get("vet_mname"), vet_info.get("vet_lname")]))
                record["vet_name"] = vet_name.strip()

            horse_list.append(horse)

        return Response(horse_list, status=200)

    except Exception as e:
        logging.exception("Error fetching horses")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=500
        )






# -------------------- SOS REQUESTS ENDPOINT --------------------
@api_view(["GET"])
def get_sos_requests(request):
    """
    Fetch all SOS requests from Supabase 'sos_requests' table.
    Handles Supabase/network errors gracefully.
    """
    try:
        # Fetch all rows
        response = sr_client.table("sos_requests").select("*").execute()

        # Access data safely
        data = getattr(response, "data", None)
        if data is None:
            return Response(
                {"error": "Supabase returned no data or an unexpected response."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Format data for frontend
        formatted_data = [
            {
                "id": item.get("id"),
                "type": item.get("emergency_type", "Emergency"),
                "contact": item.get("contact_name", "Unknown Contact"),
                "phone": item.get("contact_number", "N/A"),
                "location": item.get("location_text", "No location provided"),
                "time": item.get("created_at"),
                "urgent": item.get("status") == "pending" or item.get("urgent") is True,
            }
            for item in data
        ]

        return Response({"sos_requests": formatted_data}, status=status.HTTP_200_OK)

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"error": f"An unexpected error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# -------------------- Access Requests -------------------- #
@api_view(['GET'])
def get_access_requests(request):
    """Fetch all access requests with vet profile and horse details"""
    try:
        # Select all access requests with vet_profile and horse details
        response = sr_client.table("medrec_access_request") \
            .select(
                """
                request_id,
                request_status,
                requested_at,
                approved_at,
                approved_by,
                note,
                vet_id:vet_profile (
                    vet_fname,
                    vet_mname,
                    vet_lname,
                    vet_email,
                    vet_phone_num,
                    vet_specialization,
                    vet_org,
                    vet_license_num
                ),
                horse_id (
                    horse_name,
                    horse_breed,
                    horse_dob
                )
                """
            ).execute()

        # Format data
        formatted_data = []
        for req in response.data:
            vet = req.get("vet_id")  # from vet_profile relation
            horse = req.get("horse_id")

            formatted_data.append({
                "request_id": req.get("request_id"),
                "status": req.get("request_status"),
                "requested_at": req.get("requested_at"),
                "approved_at": req.get("approved_at"),
                "approved_by": req.get("approved_by"),
                "note": req.get("note") or "",

                # Vet Profile
                "vet_name": " ".join(filter(None, [
                    vet.get("vet_fname") if vet else None,
                    vet.get("vet_mname") if vet else None,
                    vet.get("vet_lname") if vet else None
                ])) if vet else None,
                "vet_email": vet.get("vet_email") if vet else None,
                "vet_phone_num": vet.get("vet_phone_num") if vet else None,
                "vet_specialization": vet.get("vet_specialization") if vet else None,
                "vet_org": vet.get("vet_org") if vet else None,
                "vet_license_num": vet.get("vet_license_num") if vet else None,

                # Horse
                "horse_name": horse.get("horse_name") if horse else None,
                "horse_breed": horse.get("horse_breed") if horse else None,
                "horse_dob": horse.get("horse_dob") if horse else None,
            })

        return Response(formatted_data)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





# -------------------- APPROVE REQUEST --------------------
@api_view(['PATCH'])
def approve_access_request(request, request_id):
    """Approve an access request"""
    try:
        # Update the request to approved
        response = sr_client.table("medrec_access_request") \
            .update({
                "request_status": "approved",
                "approved_at": timezone.now().isoformat(),
                "approved_by": "CTU-VET"   # 👈 force approver name
            }) \
            .eq("request_id", str(request_id)) \
            .execute()

        if not response.data:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "message": "Access request successfully approved ✅",
                "data": response.data[0]
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- DECLINE REQUEST --------------------
@api_view(['PATCH'])
def decline_access_request(request, request_id):
    """Decline an access request"""
    try:
        response = sr_client.table("medrec_access_request") \
            .update({
                "request_status": "declined",
                "approved_at": timezone.now().isoformat(),
                "approved_by": request.user.id if request.user.is_authenticated else None,
                "note": request.data.get("note", "")
            }) \
            .eq("request_id", str(request_id)) \
            .execute()

        if not response.data:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"message": "Access request declined", "data": response.data[0]})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(["PATCH"])

def edit_post(request, post_id):
    try:
        new_content = request.data.get("announce_content")
        if not new_content:
            return Response({"error": "No content provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Update Supabase announcement
        result = sr_client.table("announcement").update(
            {"announce_content": new_content}
        ).eq("announce_id", str(post_id)).execute()

        if result.data:
            return Response(
                {"message": "Post updated successfully", "data": result.data},
                status=status.HTTP_200_OK,
            )
        else:
            return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





@api_view(["GET"])
def get_horse_statistics(request):
    try:
        # Join horse_profile → horse_op_profile → users
        query = (
            sr_client.table("horse_profile")
            .select("horse_status, created_at, horse_op_profile(op_id, users(id, status))")
            .execute()
        )

        rows = query.data or []

        # Filter out deactivated users
        filtered_rows = []
        for row in rows:
            op_profile = row.get("horse_op_profile")
            if not op_profile:
                continue

            user = op_profile.get("users")
            if not user:
                continue

            if user.get("status", "").lower() != "deactivated":
                filtered_rows.append(row)

        # Mapping categories
        status_mapping = {
            "healthy": ["healthy", "normal", "good", "excellent"],
            "sick": ["sick", "ill", "critical", "emergency"],
            "unhealthy": ["unhealthy", "poor", "poor_health", "poor health"]
        }

        # Monthly counts
        monthly_data = defaultdict(lambda: {"healthy": 0, "sick": 0, "unhealthy": 0, "total": 0})

        for row in filtered_rows:
            status_text = (row.get("horse_status") or "").strip().lower()
            created_at = row.get("created_at")

            # Default to current month if no created_at
            if created_at:
                try:
                    date_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except:
                    date_obj = datetime.now()
            else:
                date_obj = datetime.now()

            month_label = date_obj.strftime("%b %Y")  # e.g., "Oct 2025"

            # Count categories
            for category, keywords in status_mapping.items():
                if status_text in keywords:
                    monthly_data[month_label][category] += 1
                    break

            monthly_data[month_label]["total"] += 1

        # Convert to sorted list by month
        result = []
        for month in sorted(monthly_data.keys(), key=lambda d: datetime.strptime(d, "%b %Y")):
            result.append({
                "month": month,
                "healthy": monthly_data[month]["healthy"],
                "sick": monthly_data[month]["sick"],
                "unhealthy": monthly_data[month]["unhealthy"],
                "total": monthly_data[month]["total"]
            })

        return Response(result)

    except Exception as e:
        return Response(
            {"detail": "Internal server error", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




logger = logging.getLogger(__name__)

# -------------------- ADD COMMENT --------------------
@api_view(["POST"])
def add_comment(request):
    """
    Add a new comment to an announcement
    """
    try:
        data = request.data
        post_id = data.get("announcement_id")
        comment_text = data.get("comment_text")
        user_id = data.get("user_id")

        if not post_id or not comment_text:
            return Response(
                {"error": "announcement_id and comment_text are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"Adding comment for announcement_id: {post_id}")

        result = sr_client.table("comment").insert({
            "announcement_id": str(post_id),
            "comment_text": comment_text,
            "user_id": str(user_id) if user_id else None,
            "comment_date": timezone.now().isoformat(),
        }).execute()

        if result.status_code != 201:
            logger.error(f"Supabase insert error: {result.data}")
            return Response({"error": result.data}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": "Comment added successfully", "data": result.data[0]},
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.exception("Error adding comment")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- GET COMMENTS FOR ANNOUNCEMENT --------------------
@api_view(["GET"])
def get_comments(request, post_id):
    """
    Fetch all comments for a given announcement
    """
    try:
        logger.info(f"Fetching comments for post_id: {post_id}")

        result = (
            sr_client.table("comment")
            .select("*")
            .eq("announcement_id", str(post_id))
            .order("comment_date", desc=False)  # ascending order
            .execute()
        )

        # Check for errors
        if result.data is None:
            logger.error(f"Supabase fetch error: {result}")
            return Response({"error": "Failed to fetch comments"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": "Comments fetched successfully", "data": result.data},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception(f"Error fetching comments for post_id={post_id}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import os
import re
import jwt
import base64
import random
import logging
import requests
from uuid import UUID
from functools import wraps
from collections import defaultdict
from datetime import datetime, timedelta

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from supabase import create_client, Client

# -------------------- Environment Config --------------------
SUPABASE_URL = getattr(settings, "SUPABASE_URL", os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co"))
SUPABASE_ANON_KEY = getattr(settings, "SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY"))
SUPABASE_SERVICE_ROLE_KEY = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY"))
CONTENT_TYPE_JSON = "application/json"

# -------------------- Supabase Clients --------------------
# ✅ Main Supabase client (service role for backend operations)
sr_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ✅ Separate client for storage (if needed)
storage_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


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
    existing = sr_client.table("dvmf_user_profile").select("id").execute()
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
        # 1️⃣ Extract and clean fields
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        role = request.data.get("role", "Dvmf").strip()   # Default = Ctu-Vetmed

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
            "dvmf_id": user_id,
            "dvmf_fname": first_name,
            "dvmf_lname": last_name,
            "dvmf_email": email,
            "dvmf_phonenum": phone_number,
            "dvmf_role": role
        }
        profile_res = sr_client.table("dvmf_user_profile").upsert(profile_payload).execute()
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
            plain_message = f"Hello {vet_name},\n\nWe’re sorry to inform you that your veterinarian account request was NOT APPROVED by the admin. The reason: {reason_text}. Please contact support if needed.\n\nBest regards,\nECHOSys Team"
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                    <h1 style="margin:0; font-size:24px;">Account Declined ⚠️</h1>
                  </div>
                  <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                    <p>Hello {vet_name},</p>
                    <p>We’re sorry to inform you that your veterinarian account request has been NOT APPROVED by the admin. The reason: <strong>{reason_text}</strong>.</p>
                    
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








    
# -------------------- GET RECENT ACTIVITY --------------------
@api_view(["GET"])
@login_required
def get_recent_activity(request):
    try:
        # ✅ Create a Supabase client using the service role key
        sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # ✅ Query recent vet profiles
        response = sr_client.table("vet_profile").select(
            "vet_id, vet_fname, vet_lname, vet_email, created_at, users(status)"
        ).order("created_at", desc=True).limit(10).execute()

        if not response.data:
            return Response([], status=200)

        activities = []
        for row in response.data:
            user_data = row.get("users") or {}
            user_status = user_data.get("status", "unknown")

            first_name = row.get("vet_fname", "")
            last_name = row.get("vet_lname", "")
            full_name = f"{first_name} {last_name}".strip()
            initials = "".join([w[0] for w in full_name.split() if w]).upper()

            activities.append({
                "id": row["vet_id"],
                "title": full_name,
                "initials": initials,
                "description": f"User is currently {user_status.capitalize()}",
                "status": user_status,
                "date": row.get("created_at"),
                "email": row.get("vet_email")
            })

        return Response(activities, status=200)

    except Exception as e:
        print(f"[ERROR] get_recent_activity: {e}")
        return Response({"error": str(e)}, status=500)



# -------------------- GET STATUS COUNTS --------------------
# -------------------- GET STATUS COUNTS --------------------
@api_view(["GET"])
@login_required
def get_status_counts(request):
    try:
        # ✅ Create Supabase client
        sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # ✅ Fetch vet profiles with related user status
        response = sr_client.table("vet_profile").select("vet_id, users(status)").execute()

        if not response.data:
            return Response({"pending": 0, "approved": 0, "declined": 0}, status=200)

        # ✅ Initialize counts
        counts = {"pending": 0, "approved": 0, "declined": 0}

        # ✅ Count based on status
        for row in response.data:
            user_status = row.get("users", {}).get("status", "").lower()
            if user_status in counts:
                counts[user_status] += 1

        return Response(counts, status=200)

    except Exception as e:
        import traceback
        print("[ERROR] get_status_counts:", e)
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=500)


# -------------------- GET PROFILES IN SETTINGS --------------------
@api_view(["GET"])
@login_required
def get_dvmf_user_profiles(request):
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

    res = sr_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
    profile = res.data[0] if res.data else None

    if not profile:
        return Response({"error": "Profile not found"}, status=404)

    return Response({
        "dvmf_id": profile.get("dvmf_id"),
        "user_id": user_id,
        "dvmf_email": profile.get("dvmf_email", ""),
        "dvmf_fname": profile.get("dvmf_fname", ""),
        "dvmf_lname": profile.get("dvmf_lname", ""),
        "dvmf_phonenum": profile.get("dvmf_phonenum", ""),
        "dvmf_role": profile.get("dvmf_role", "")
        
    })



# -------------------- UPDATE CTU VET PROFILE --------------------
@api_view(["POST"])
def update_dvmf_user_profile(request):
    """
    Update existing CTU Vet profile
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        dvmf_id = payload.get("sub")
        if not dvmf_id:
            return Response({"error": "Invalid token"}, status=401)

        data = request.data
        update_data = {}

        if "dvmf_fname" in data:
            update_data["dvmf_fname"] = data["dvmf_fname"].strip()
        if "dvmf_lname" in data:
            update_data["dvmf_lname"] = data["dvmf_lname"].strip()
        if "dvmf_email" in data:
            update_data["dvmf_email"] = data["dvmf_email"].strip()
        if "dvmf_phonenum" in data:
            update_data["dvmf_phonenum"] = data["dvmf_phonenum"]

        if not update_data:
            return Response({"error": "No fields provided to update"}, status=400)

        # Supabase update
        response = sr_client.table("dvmf_user_profile").update(update_data).eq("dvmf_id", dvmf_id).execute()

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
def save_dvmf_user_profile(request):
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
        dvmf_id = payload.get("sub")
        if not dvmf_id:
            return Response({"error": "Invalid token"}, status=401)

        # 2️⃣ Get input values
        dvmf_fname = request.data.get("dvmf_fname", "").strip()
        dvmf_lname = request.data.get("dvmf_lname", "").strip()
        dvmf_email = request.data.get("dvmf_email", "").strip()
        dvmf_phonenum = request.data.get("dvmf_phonenum", "")

        # 3️⃣ Validate required fields
        errors = {}
        if not dvmf_fname:
            errors["dvmf_fname"] = "First name is required."
        if not dvmf_lname:
            errors["dvmf_lname"] = "Last name is required."
        if not dvmf_email:
            errors["dvmf_email"] = "Email is required."
        if not dvmf_phonenum:
            errors["dvmf_phonenum"] = "Phone number is required."

        if errors:
            return Response({"errors": errors}, status=400)

        # 4️⃣ Upsert profile in Supabase
        profile_data = {
            "dvmf_id": dvmf_id,
            "dvmf_fname": dvmf_fname,
            "dvmf_lname": dvmf_lname,
            "dvmf_email": dvmf_email,
            "dvmf_phonenum": dvmf_phonenum,
        }

        response = sr_client.table("dvmf_user_profile").upsert(profile_data, on_conflict="dvmf_id").execute()

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














@api_view(['GET'])
def get_users(request):
    try:
        current_user_id = request.GET.get("user_id")
        current_user_role = request.GET.get("role")

        if not current_user_id:
            return Response({"error": "Missing user_id"}, status=status.HTTP_400_BAD_REQUEST)

        query = sr_client.table("dvmf_user_profile").select("*")

        if current_user_role != "Ctu-Admin":
            query = query.eq("ctu_id", current_user_id)

        response = query.execute()

        users_data = [
            {
                "id": u.get("id"),
                "firstname": u.get("dvmf_fname"),
                "lastname": u.get("dvmf_lname"),
                "email": u.get("dvmf_email"),
                "phone": u.get("dvmf_phonenum"),
                "role": u.get("role") or "general",
                "status": u.get("status") or "pending",
                "password": u.get("dvmf_pass") or ""
            }
            for u in response.data or []
        ]

        return Response(users_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# -------------------- GET VET NOTIFICATIONS --------------------
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def get_vetnotifications(request):
    try:
        existing_keys = set()
        notifications_to_insert = []

        # ---------------- FETCH EXISTING NOTIFICATIONS ----------------
        try:
            # Get ALL existing notifications (including read ones) to prevent duplicates
            existing_res = sr_client.table("notification") \
                .select("related_id, notif_read") \
                .not_.is_("related_id", None) \
                .execute()
            existing_keys = {row["related_id"] for row in (existing_res.data or [])}
        except Exception as e:
            print(f"Error fetching existing notifications: {e}")
            existing_keys = set()

        # ---------------- HELPER FUNCTION ----------------
        def add_notification(user_id, message, notif_type, related_id, created_at=None):
            # Prevent duplicates based on related_id regardless of read status
            if not user_id or not related_id or related_id in existing_keys:
                return

            dt_ph = datetime.fromisoformat(created_at) if created_at else datetime.now()
            notifications_to_insert.append({
                "user_id": user_id,  # Fixed: should be user_id, not id
                "notif_message": message,
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
                "notif_read": False,
                "notification_type": notif_type,
                "related_id": related_id
            })
            existing_keys.add(related_id)

        # ---------------- VET REGISTRATION / APPROVAL / DECLINE ----------------
        try:
            vets_res = sr_client.table("vet_profile") \
                .select("vet_id, vet_fname, vet_lname, created_at, users(id, status, role)") \
                .execute()

            for vet in (vets_res.data or []):
                users = vet.get("users") or {}
                if users.get("role", "").lower() != "veterinarian":
                    continue

                user_id = users.get("id")
                status = users.get("status", "").lower()
                vet_name = f"{vet.get('vet_fname', '')} {vet.get('vet_lname', '')}".strip()

                if status in ["pending", "approved", "declined"]:
                    related_id = f"vet_{vet['vet_id']}_{status}"
                    add_notification(
                        user_id,
                        f"Veterinarian {status}: Dr. {vet_name}.",
                        status,
                        related_id,
                        vet.get("created_at")
                    )
        except Exception as e:
            print(f"Error in vet notifications: {e}")

        # ---------------- MEDICAL RECORD ACCESS REQUESTS ----------------
        try:
            medreq_res = sr_client.table("medrec_access_request") \
                .select("request_id, vet_profile(vet_fname, vet_lname, users(id)), horse_profile(horse_name), requested_at, request_status") \
                .execute()

            for req in (medreq_res.data or []):
                if req.get("request_status", "").lower() != "pending":
                    continue

                vet = req.get("vet_profile") or {}
                users = vet.get("users") or {}
                user_id = users.get("id")
                if not user_id:
                    continue

                vet_name = f"{vet.get('vet_fname', '')} {vet.get('vet_lname', '')}".strip()
                horse_name = (req.get("horse_profile") or {}).get("horse_name", "Unknown Horse")

                related_id = f"medreq_{req['request_id']}"
                add_notification(
                    user_id,
                    f"Vet. {vet_name} requested access to {horse_name}'s medical record.",
                    "medrec_request",
                    related_id,
                    req.get("requested_at")
                )
        except Exception as e:
            print(f"Error in medical record notifications: {e}")

        # ---------------- COMMENT NOTIFICATIONS ----------------
        try:
            comments_res = sr_client.table("comment") \
                .select("id, comment_text, comment_date, user_id, announcement_id") \
                .execute()

            for comment in (comments_res.data or []):
                commenter_id = comment.get("user_id")
                ann_id = comment.get("announcement_id")
                if not commenter_id or not ann_id:
                    continue

                related_id = f"comment_{comment['id']}"
                if related_id in existing_keys:
                    continue

                # Correct PK column: announce_id
                announcement_res = sr_client.table("announcement") \
                    .select("user_id") \
                    .eq("announce_id", ann_id) \
                    .maybe_single() \
                    .execute()
                post_owner_id = announcement_res.data.get("user_id") if announcement_res.data else None

                if not post_owner_id or post_owner_id == commenter_id:
                    continue

                # Fetch commenter name
                commenter_name = None
                kutsero_res = sr_client.table("kutsero_profile").select("kutsero_fname,kutsero_lname") \
                    .eq("kutsero_id", commenter_id).maybe_single().execute()
                if kutsero_res.data:
                    commenter_name = f"{kutsero_res.data.get('kutsero_fname', '')} {kutsero_res.data.get('kutsero_lname', '')}".strip()
                else:
                    op_res = sr_client.table("horse_op_profile").select("op_fname,op_lname") \
                        .eq("op_id", commenter_id).maybe_single().execute()
                    if op_res.data:
                        commenter_name = f"{op_res.data.get('op_fname', '')} {op_res.data.get('op_lname', '')}".strip()

                if not commenter_name:
                    continue

                add_notification(
                    post_owner_id,
                    f"{commenter_name} commented: '{comment.get('comment_text', '')[:50]}...'",
                    "comment",
                    related_id,
                    comment.get("comment_date")
                )
        except Exception as e:
            print(f"Error in comment notifications: {e}")

        # ---------------- BULK INSERT (DEDUPED) ----------------
        if notifications_to_insert:
            try:
                sr_client.table("notification").insert(notifications_to_insert).execute()
                print(f"Inserted {len(notifications_to_insert)} new notifications")
            except Exception as e:
                print(f"Error inserting notifications: {e}")

        # ---------------- FETCH ALL VALID NOTIFICATIONS ----------------
        valid_types = ["medrec_request", "approved", "declined", "pending", "comment"]
        all_notifs_res = (
            sr_client.table("notification")
            .select("*")
            .in_("notification_type", valid_types)
            .order("notif_date", desc=True)
            .order("notif_time", desc=True)
            .limit(50)
            .execute()
        )

        notifications = [
            {
                "id": row.get("id"),  # This is the notification ID, not user_id
                "message": row.get("notif_message"),
                "date": f"{row.get('notif_date')}T{row.get('notif_time')}+08:00",
                "read": row.get("notif_read", False),
                "type": row.get("notification_type", "general"),
            }
            for row in (all_notifs_res.data or [])
        ]

        return Response(notifications, status=200)

    except Exception as e:
        print(f"Error in get_vetnotifications: {e}")
        return Response({"error": str(e)}, status=500)



# -------------------- MARK NOTIFICATION AS READ --------------------
@api_view(["POST"])
def mark_notification_read(request, notif_id):
    """
    Mark a specific notification as read.
    """
    try:
        result = sr_client.table("notification").select("*").eq("id", notif_id).execute()

        if not result.data:
            return Response({"error": "Notification not found"}, status=404)

        update_result = sr_client.table("notification").update({
            "notif_read": True
        }).eq("id", notif_id).execute()

        if update_result.data:
            return Response({
                "success": True,
                "message": "Notification marked as read",
                "notif_id": notif_id
            })
        else:
            return Response({"error": "Failed to update notification"}, status=500)

    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return Response({"error": "Internal server error"}, status=500)


# -------------------- MARK ALL NOTIFICATIONS AS READ --------------------
@api_view(["POST"])
def mark_all_notifications_read(request):
    """
    Mark all notifications as read.
    """
    try:
        # Update all unread notifications
        update_result = sr_client.table("notification").update({
            "notif_read": True
        }).eq("notif_read", False).execute()

        return Response({
            "success": True,
            "message": "All notifications marked as read",
            "updated_count": len(update_result.data) if update_result.data else 0
        })
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        return Response({"error": "Internal server error"}, status=500)



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
                "dvmf_fname": p.get("dvmf_fname"),
                "dvmf_lname": p.get("dvmf_lname"),
                "dvmf_email": p.get("dvmf_email"),
                "ctu_phonenum": p.get("ctu_phonenum"),
                "role": p.get("role") or "Dvmf",
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
def dvmf_change_password(request):
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
        dvmf_email = request.data.get("dvmf_email", "").strip().lower()

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if not dvmf_email:
            errors["dvmf_email"] = "Email is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Verify current password by logging in again with Supabase
        verify_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_SERVICE_ROLE_KEY},
            json={"email": dvmf_email, "password": current_password}
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
        profiles_res = sr_client.table("dvmf_user_profile").select("*").execute()

        # kuha sa users (id, role, status)
        users_res = sr_client.table("users").select("id, role, status").execute()
        users_map = {u["id"]: {"role": u["role"], "status": u["status"]} for u in users_res.data or []}

        profiles = []
        for p in profiles_res.data or []:
            user_data = users_map.get(p.get("dvmf_id"), {})
            profiles.append({
                "id": p.get("dvmf_id"),
                "dvmf_fname": p.get("dvmf_fname"),
                "dvmf_lname": p.get("dvmf_lname"),
                "dvmf_email": p.get("dvmf_email"),
                "dvmf_phonenum": p.get("dvmf_phonenum"),
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

    title = (request.data.get("announce_title") or "DVMF Announcement").strip()
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



# -------------------- display horses with owner full name --------------------

@api_view(['GET'])
def get_horses(request):
    """
    Fetch all horses with owner info, medical records (with lab images),
    treatments, and veterinarian name.
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
                parent_medrec_id,
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

            # Vet + Medical Records
            med_records = horse.get("horse_medical_record", [])
            for record in med_records:
                # Vet name
                vet_info = record.get("vet_profile", {})
                vet_name = " ".join(filter(None, [vet_info.get("vet_fname"), vet_info.get("vet_mname"), vet_info.get("vet_lname")]))
                record["vet_name"] = vet_name.strip()

                # Clean up medrec_lab_img since it's already a full URL
                lab_img_path = record.get("medrec_lab_img")

                if lab_img_path and isinstance(lab_img_path, str):
                    clean_url = lab_img_path.strip().strip('[]"\'')
                    record["medrec_lab_img_url"] = clean_url if clean_url.startswith("http") else None
                else:
                    record["medrec_lab_img_url"] = None

            horse_list.append(horse)

        return Response(horse_list, status=200)

    except Exception as e:
        logging.exception("Error fetching horses")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=500
        )


@api_view(["GET"])
def get_followup_records(request, parent_medrec_id):
    """
    Get all follow-up medical records for a given parent medical record ID
    including: vitals, diagnosis, prognosis, lab results, vet info and treatments.
    """
    try:
        print(f"🔍 Fetching follow-ups for parent_medrec_id={parent_medrec_id}")

        res = sr_client.table("horse_medical_record").select("""
            medrec_id,
            parent_medrec_id,
            medrec_date,
            medrec_followup_date,
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
                treatment_duration,
                treatment_outcome
            )
        """).eq("parent_medrec_id", parent_medrec_id)\
          .order("medrec_date", desc=True)\
          .execute()

        followups = []

        for rec in res.data or []:

            # Format Vet Name
            vet = rec.get("vet_profile") or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname")
            ])).strip() or "Unknown Veterinarian"

            # Clean lab images
            img_raw = rec.get("medrec_lab_img")
            if img_raw:
                clean_img = img_raw.strip("[]\"'")
                if not clean_img.startswith("http"):
                    filename = clean_img.split("/")[-1]
                    clean_img = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
            else:
                clean_img = None

            # Build Final Follow-Up Record Object
            followups.append({
                "medrec_id": rec.get("medrec_id"),
                "parent_medrec_id": rec.get("parent_medrec_id"),
                "medrec_date": rec.get("medrec_date"),
                "medrec_followup_date": rec.get("medrec_followup_date"),

                # Vitals
                "medrec_heart_rate": rec.get("medrec_heart_rate"),
                "medrec_resp_rate": rec.get("medrec_resp_rate"),
                "medrec_body_temp": rec.get("medrec_body_temp"),

                # Medical details
                "medrec_clinical_signs": rec.get("medrec_clinical_signs"),
                "medrec_diagnostic_protocol": rec.get("medrec_diagnostic_protocol"),
                "medrec_lab_results": rec.get("medrec_lab_results"),
                "medrec_lab_img": clean_img,
                "medrec_diagnosis": rec.get("medrec_diagnosis"),
                "medrec_prognosis": rec.get("medrec_prognosis"),
                "medrec_recommendation": rec.get("medrec_recommendation"),
                "medrec_horsestatus": rec.get("medrec_horsestatus"),

                # Treatments
                "horse_treatment": rec.get("horse_treatment", []),

                # Veterinarian
                "vet_name": vet_name
            })

        print(f"✅ Found {len(followups)} follow-ups")

        return Response(
            {"followups": followups, "count": len(followups)},
            status=200
        )

    except Exception as e:
        logging.exception("Error getting follow-up records")
        return Response(
            {"error": str(e)},
            status=500
        )








# -------------------- SOS REQUESTS ENDPOINT --------------------
# -------------------- VET ACTIVITY ENDPOINT --------------------

import time

def retry_query(query_func, retries=3, delay=1):
    """
    Executes a Supabase query with retries in case of failure.

    query_func: a function that returns the query object (with .execute())
    """
    for attempt in range(retries):
        try:
            return query_func().execute()
        except Exception as e:
            print(f"Supabase query failed (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                raise

@api_view(["GET"])
@login_required
def get_sos_requests(request):
    """
    Fetch all SOS requests with image URL and details.
    """
    try:
        # ✅ Create a Supabase client using the service role key
        sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        # ✅ Query all SOS requests
        response = sr_client.table("sos_requests").select("*").execute()

        if not response.data:
            return Response([], status=200)

        formatted_data = []
        for item in response.data:
            image_path = item.get("sos_image")

            # Clean the sos_image URL
            if image_path and isinstance(image_path, str):
                clean_url = image_path.strip().strip('[]"\'')
                sos_image_url = clean_url if clean_url.startswith("http") else None
            else:
                sos_image_url = None

            formatted_data.append({
                "id": item.get("id"),
                "type": item.get("emergency_type", "Emergency"),
                "contact": item.get("user_name") or "Unknown Contact",
                "phone": item.get("contact_number", "N/A"),
                "location": item.get("location_text", "No location provided"),
                "time": item.get("created_at"),
                "urgent": item.get("status", "").lower() == "pending",
                "status": item.get("status", "pending"),
                "description": item.get("description"),
                "horse_status": item.get("horse_status"),
                "additional_info": item.get("additional_info"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "sos_image_url": sos_image_url,
            })

        return Response(formatted_data, status=200)

    except Exception as e:
        print(f"[ERROR] get_sos_requests: {e}")
        return Response({"error": str(e)}, status=500)





# -------------------- Access Requests -------------------- #
@api_view(['GET'])
def get_access_requests(request):
    """Fetch all access requests with vet profile and horse details"""
    try:
        response = sr_client.table("medrec_access_request").select(
            """
            request_id,
            request_status,
            requested_at,
            approved_at,
            approved_by,
            note,
            vet_profile (
                vet_id,
                vet_fname,
                vet_mname,
                vet_lname,
                vet_email,
                vet_phone_num,
                vet_specialization,
                vet_org,
                vet_license_num
            ),
            horse_profile (
                horse_id,
                horse_name,
                horse_breed,
                horse_dob
            )
            """
        ).order("requested_at", desc=True).execute()

        formatted_data = []
        for req in response.data:
            vet = req.get("vet_profile")
            horse = req.get("horse_profile")

            formatted_data.append({
                "request_id": req.get("request_id"),
                "status": req.get("request_status"),
                "requested_at": req.get("requested_at"),
                "approved_at": req.get("approved_at"),
                "approved_by": req.get("approved_by"),
                "note": req.get("note") or "",

                # Vet Details
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

                # Horse Details
                "horse_name": horse.get("horse_name") if horse else None,
                "horse_breed": horse.get("horse_breed") if horse else None,
                "horse_dob": horse.get("horse_dob") if horse else None,
            })

        return Response(formatted_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





from django.utils import timezone  # ✅ Siguro naa lang ni usa ka import

# -------------------- APPROVE REQUEST -------------------- #
@api_view(['PATCH'])
def approve_access_request(request, request_id):
    """Approve an access request"""
    try:
        current_time = timezone.now()  # 📌 Kuhaa ang current time properly

        response = sr_client.table("medrec_access_request") \
            .update({
                "request_status": "approved",
                "approved_at": current_time.isoformat(),  # ✅ Proper timezone.now() usage
                "approved_by": "DVMF"
            }) \
            .eq("request_id", str(request_id)) \
            .execute()

        if not response.data:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(response.data[0], status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- DECLINE REQUEST -------------------- #
@api_view(['PATCH'])
def decline_access_request(request, request_id):
    """Decline an access request"""
    try:
        current_time = timezone.now()

        response = sr_client.table("medrec_access_request") \
            .update({
                "request_status": "declined",
                "approved_at": current_time.isoformat(),
                "approved_by": request.user.id if request.user.is_authenticated else None,
                "note": request.data.get("note", "")
            }) \
            .eq("request_id", str(request_id)) \
            .execute()

        if not response.data:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "message": "Access request declined",
            "data": response.data[0]
        }, status=status.HTTP_200_OK)

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
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        export_details = request.GET.get('export_details') == 'true'

        # Build base query for horse profiles
        query = (
            sr_client.table("horse_profile")
            .select("horse_id, horse_name, horse_status, created_at, horse_op_profile(op_id, users(id, status))")
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

        # Build query for medical records
        med_records_query = sr_client.table("horse_medical_record").select("*").execute()
        med_records = med_records_query.data or []

        # Create mapping of horse_id to medical records
        horse_med_records = {}
        for record in med_records:
            horse_id = record.get('medrec_horse_id')
            if horse_id:
                if horse_id not in horse_med_records:
                    horse_med_records[horse_id] = []
                horse_med_records[horse_id].append(record)

        # For each horse, find the most relevant medical record based on date filters
        horse_final_status = {}
        
        for horse_id in horse_med_records:
            records = horse_med_records[horse_id]
            
            # Sort records by date (newest first)
            records.sort(key=lambda x: x.get('medrec_date', ''), reverse=True)
            
            # Apply date filtering
            filtered_records = records
            if date_from:
                filtered_records = [r for r in filtered_records if r.get('medrec_date') and r['medrec_date'] >= date_from]
            if date_to:
                filtered_records = [r for r in filtered_records if r.get('medrec_date') and r['medrec_date'] <= date_to]
            
            # Use the most recent record that matches date filters
            if filtered_records:
                latest_record = filtered_records[0]
                horse_final_status[horse_id] = {
                    'status': latest_record.get('medrec_horsestatus'),
                    'diagnosis': latest_record.get('medrec_diagnosis'),
                    'record_date': latest_record.get('medrec_date')
                }
            elif not date_from and not date_to:
                # If no date filters, use the absolute latest record
                latest_record = records[0]
                horse_final_status[horse_id] = {
                    'status': latest_record.get('medrec_horsestatus'),
                    'diagnosis': latest_record.get('medrec_diagnosis'),
                    'record_date': latest_record.get('medrec_date')
                }

        # Enhanced status mapping
        status_mapping = {
            "healthy": ["healthy", "normal", "good", "excellent"],
            "sick": ["sick", "ill", "critical", "emergency"],
            "deceased": ["deceased", "dead", "passed away", "died"]
        }

        # Monthly counts - FIXED: Use medical record dates when available
        monthly_data = defaultdict(lambda: {"healthy": 0, "sick": 0, "deceased": 0, "total": 0})
        sick_horses_details = []

        for row in filtered_rows:
            horse_id = row.get("horse_id")
            horse_name = row.get("horse_name")
            
            # Determine status and date for grouping
            status_text = ""
            diagnosis = ""
            group_date = None
            
            if horse_id in horse_final_status:
                # Use medical record data
                med_data = horse_final_status[horse_id]
                status_text = (med_data.get('status') or "").strip().lower()
                diagnosis = med_data.get('diagnosis') or ""
                record_date = med_data.get('record_date')
                
                if record_date:
                    try:
                        group_date = datetime.fromisoformat(record_date.replace("Z", "+00:00"))
                    except:
                        group_date = None
            else:
                # Fall back to profile data (only if no date filters applied)
                if not date_from and not date_to:
                    status_text = (row.get("horse_status") or "").strip().lower()
                    created_at = row.get("created_at")
                    if created_at:
                        try:
                            group_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        except:
                            group_date = None

            # Skip if we have date filters but no medical record matches
            if (date_from or date_to) and horse_id not in horse_final_status:
                continue

            # Skip if no date available for grouping
            if not group_date:
                group_date = datetime.now()

            month_label = group_date.strftime("%b %Y")

            # Count categories
            status_found = False
            for category, keywords in status_mapping.items():
                if any(keyword in status_text for keyword in keywords):
                    monthly_data[month_label][category] += 1
                    status_found = True
                    
                    # Collect sick horse details for PDF export
                    if category == "sick" and export_details and horse_name:
                        sick_horses_details.append({
                            "horse_name": horse_name,
                            "diagnosis": diagnosis or "No diagnosis available",
                            "status": status_text
                        })
                    break

            if not status_found:
                # Default to healthy if no specific status found
                monthly_data[month_label]["healthy"] += 1

            monthly_data[month_label]["total"] += 1

        # Convert to sorted list by month
        result = []
        for month in sorted(monthly_data.keys(), key=lambda d: datetime.strptime(d, "%b %Y")):
            result.append({
                "month": month,
                "healthy": monthly_data[month]["healthy"],
                "sick": monthly_data[month]["sick"],
                "deceased": monthly_data[month]["deceased"],
                "total": monthly_data[month]["total"]
            })

        if export_details:
            return Response({
                "monthly_data": result,
                "sick_horses": sick_horses_details
            })

        return Response(result)

    except Exception as e:
        return Response(
            {"detail": "Internal server error", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




# -------------------- ADD COMMENTS --------------------#


@api_view(["POST"])
@login_required
def add_comment(request):
    try:
        # ---------------- Get token from cookie ----------------
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        # ---------------- Decode token WITHOUT verifying signature ----------------
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # ---------------- Get data from request ----------------
        announcement_id = request.data.get("announcement_id")
        comment_text = request.data.get("comment_text")
        parent_comment_id = request.data.get("parent_comment_id")  # optional

        if not announcement_id or not comment_text:
            return Response({"error": "Missing required fields."}, status=400)

        # ---------------- Prepare data for insert ----------------
        data = {
            "announcement_id": announcement_id,
            "comment_text": comment_text,
            "user_id": user_id,
            "parent_comment_id": parent_comment_id,
        }

        # ---------------- Insert comment ----------------
        try:
            response = sr_client.table("comment").insert(data).execute()
            if hasattr(response, "error") and response.error:
                logger.error("Database insert error: %s", response.error.message)
                return Response({"error": response.error.message}, status=500)

            return Response({
                "message": "Comment added successfully",
                "data": response.data
            }, status=201)

        except APIError as e:
            logger.error("Database insert error: %s", e)
            return Response({"error": "Failed to add comment, check table exists and schema"}, status=500)

    except Exception as e:
        logger.exception("Unexpected error in add_comment")
        return Response({"error": str(e)}, status=500)






# -------------------- FETCH COMMENTS --------------------#
@api_view(["GET"])
def get_comments(request):
    import uuid, traceback

    try:
        post_id = request.query_params.get("post_id")

        if not post_id:
            return Response({"error": "post_id query parameter is required"}, status=400)

        # Validate UUID
        try:
            uuid.UUID(post_id)
        except ValueError:
            return Response({"error": "Invalid post_id format"}, status=400)

        # Fetch comments
        result = (
            sr_client.table("comment")
            .select("id, comment_text, comment_date, user_id, parent_comment_id")
            .eq("announcement_id", post_id)
            .order("comment_date", desc=False)
            .execute()
        )

        comments_data = result.data or []
        print(" Comments fetched:", len(comments_data))

        # Collect all user IDs
        user_ids = {c["user_id"] for c in comments_data if c.get("user_id")}

        user_profiles = {}
        if user_ids:
            try:
                # Try kutsero_profile first
                profiles_result = (
                    sr_client.table("kutsero_profile")
                    .select("kutsero_id, kutsero_fname, kutsero_lname")
                    .in_("kutsero_id", list(user_ids))
                    .execute()
                )

                for profile in profiles_result.data:
                    user_profiles[profile["kutsero_id"]] = {
                        "name": f"{profile.get('kutsero_fname', '')} {profile.get('kutsero_lname', '')}".strip()
                    }

                # ✅ Try horse_op_profile (for horse operators)
                horse_result = (
                    sr_client.table("horse_op_profile")
                    .select("op_id, op_fname, op_lname")
                    .in_("op_id", list(user_ids))
                    .execute()
                )

                for profile in horse_result.data:
                    user_profiles[profile["op_id"]] = {
                        "name": f"{profile.get('op_fname', '')} {profile.get('op_lname', '')}".strip()
                    }

                # For missing users, fallback to role from users table
                missing_ids = user_ids - set(user_profiles.keys())
                if missing_ids:
                    users_result = (
                        sr_client.table("users")
                        .select("id, role")
                        .in_("id", list(missing_ids))
                        .execute()
                    )

                    for user in users_result.data:
                        user_profiles[user["id"]] = {"name": user.get("role", "User")}

            except Exception as e:
                print("⚠️ Error fetching user profiles:", e)

        # Build comment tree
        def build_comment_tree(parent_id=None):
            tree = []
            for comment in comments_data:
                if comment.get("parent_comment_id") == parent_id:
                    user_profile = user_profiles.get(comment.get("user_id"))
                    author_name = user_profile["name"] if user_profile else "Unknown User"

                    node = {
                        "id": comment["id"],
                        "text": comment["comment_text"],
                        "timestamp": comment["comment_date"],
                        "author": author_name,
                        "replies": build_comment_tree(comment["id"]),
                    }
                    tree.append(node)
            return tree

        comments_tree = build_comment_tree()

        return Response({"data": comments_tree}, status=200)

    except Exception as e:
        print("❌ get_comments ERROR:", traceback.format_exc())
        return Response({"error": "Internal server error", "details": str(e)}, status=500)






# -------------------- ADD REPLY_COMMENT -------------------- #
# -------------------- ADD REPLY_COMMENT -------------------- #
logger = logging.getLogger(__name__)

@api_view(["POST"])
@login_required
def add_reply(request):
    try:
        # ---------------- Get token from cookie ----------------
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        # ---------------- Decode token WITHOUT verifying signature ----------------
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # ---------------- Get data from request ----------------
        data = request.data
        announcement_id = data.get("announcement_id")
        parent_comment_id = data.get("parent_comment_id")  # optional
        comment_text = data.get("comment_text")

        # ---------------- Validate required fields ----------------
        if not announcement_id or not comment_text:
            return Response({"error": "Missing required fields"}, status=400)

        # ---------------- Optional: check if parent_comment_id exists ----------------
        if parent_comment_id:
            try:
                parent_resp = (
                    sr_client.table("comment")
                    .select("id")
                    .eq("id", parent_comment_id)
                    .execute()
                )
                if not parent_resp.data:
                    return Response({"error": "Parent comment not found"}, status=404)
            except Exception as e:
                logger.error("Error checking parent comment: %s", e)
                return Response({"error": "Database error checking parent comment"}, status=500)

        # ---------------- Insert reply ----------------
        try:
            resp = (
                sr_client.table("comment")
                .insert({
                    "announcement_id": announcement_id,
                    "parent_comment_id": parent_comment_id,
                    "comment_text": comment_text,
                    "user_id": user_id,
                    "created_at": "now()",
                })
                .execute()
            )

            if hasattr(resp, "error") and resp.error:
                logger.error("Database insert error: %s", resp.error.message)
                return Response({"error": resp.error.message}, status=500)

            return Response(
                {"message": "Reply added successfully", "data": resp.data},
                status=201,
            )

        except APIError as e:
            logger.error("Database insert error: %s", e)
            return Response({"error": "Failed to add reply, check table exists and schema"}, status=500)

    except Exception as e:
        logger.exception("Unexpected error in add_reply")
        return Response({"error": str(e)}, status=500)





# -------------------- EDIT COMMENT --------------------
@api_view(["PUT", "PATCH"])
def edit_comment(request, comment_id):
    try:
        new_text = request.data.get("comment_text")
        if not new_text:
            return Response({"error": "No content provided"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Update comment directly (no token, no user validation)
        result = sr_client.table("comment").update(
            {
                "comment_text": new_text,
                "updated_at": datetime.utcnow().isoformat()
            }
        ).eq("id", str(comment_id)).execute()

        if result.data:
            return Response(
                {"message": "Comment updated successfully", "data": result.data},
                status=status.HTTP_200_OK,
            )
        else:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logging.error("Error editing comment: %s", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- EDIT REPLY --------------------
@api_view(["PUT", "PATCH"])
def edit_reply(request, reply_id):
    try:
        new_text = request.data.get("comment_text")
        if not new_text:
            return Response({"error": "No content provided"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Update reply directly (no token)
        result = sr_client.table("comment").update(
            {
                "comment_text": new_text,
                "updated_at": datetime.utcnow().isoformat()
            }
        ).eq("id", str(reply_id)).execute()

        if result.data:
            return Response(
                {"message": "Reply updated successfully", "data": result.data},
                status=status.HTTP_200_OK,
            )
        else:
            return Response({"error": "Reply not found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logging.error("Error editing reply: %s", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)







@api_view(["GET"])
@login_required
def get_conversations(request):
    """
    Get all conversations for the current CTU user (only users who have exchanged messages)
    """
    try:
        ctu_id = get_current_dvmf_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Get unique conversation partners
        conversation_partners = set()
        
        # Get users who sent messages to current CTU user
        received_res = safe_execute(
            sr_client.table("message")
            .select("user_id")
            .eq("receiver_id", ctu_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])
                
        # Get users who received messages from current CTU user
        sent_res = safe_execute(
            sr_client.table("message")
            .select("receiver_id")
            .eq("user_id", ctu_id)
        )
        if sent_res.data:
            for msg in sent_res.data:
                conversation_partners.add(msg["receiver_id"])

        if not conversation_partners:
            return Response([], status=status.HTTP_200_OK)

        # Get user details
        users_res = safe_execute(
            sr_client.table("users")
            .select("id, role, status")
            .in_("id", list(conversation_partners))
            .eq("status", "approved")
        )
        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        conversations = []
        
        for user in users:
            user_id = user["id"]
            role = user["role"]
            
            # Get the latest message
            messages_res = safe_execute(
                sr_client.table("message")
                .select("*")
                .or_(
                    f"and(user_id.eq.{ctu_id},receiver_id.eq.{user_id}),"
                    f"and(user_id.eq.{user_id},receiver_id.eq.{ctu_id})"
                )
                .order("mes_date", desc=True)
                .limit(1)
            )
            
            latest_message = messages_res.data[0] if messages_res.data else None
            
            # Count unread messages
            unread_res = safe_execute(
                sr_client.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", ctu_id)
                .eq("is_read", False)
            )
            unread_count = len(unread_res.data) if unread_res.data else 0
            
            # Get user profile info
            profile_info = get_user_profile_info(user_id, role)
            
            # Format timestamp
            timestamp = ""
            if latest_message and latest_message.get("mes_date"):
                try:
                    msg_time = datetime.fromisoformat(str(latest_message["mes_date"]))
                    local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
                    timestamp = local_time
                except Exception:
                    timestamp = str(latest_message["mes_date"])

            # Handle last message content with "You:" prefix
            last_message_content = ""
            last_message_is_own = False
            
            if latest_message:
                last_message_is_own = latest_message["user_id"] == ctu_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"

            conversations.append({
                'id': user_id,
                'name': profile_info["name"],
                'role': role,
                'avatar': profile_info["avatar"],
                'online': False,
                'lastMessage': last_message_content,
                'lastMessageSender': latest_message["user_id"] if latest_message else None,
                'lastMessageIsOwn': last_message_is_own,
                'timestamp': timestamp,
                'unread': unread_count,
                'has_conversation': True
            })

        # Sort by latest message timestamp
        conversations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        return Response(conversations, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversations:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- GET CURRENT USER --------------------
@api_view(["GET"])
@csrf_exempt
def get_current_user(request):
    """
    Retrieves the current authenticated user based on the Supabase access_token
    stored in the HttpOnly cookie.
    Works with both DVMF and CTU Vet profiles.
    """
    try:
        # ---------------- Get token from cookie ----------------
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "No access token found"}, status=401)

        # ---------------- Decode token WITHOUT verifying signature ----------------
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # ---------------- Check DVMF profile ----------------
        dvmf_profile = (
            sr_client.table("dvmf_user_profile")
            .select("*")
            .eq("dvmf_id", user_id)
            .execute()
        )

        if dvmf_profile.data and len(dvmf_profile.data) > 0:
            dvmf = dvmf_profile.data[0]
            return Response(
                {
                    "id": dvmf.get("dvmf_id"),
                    "name": f"{dvmf.get('dvmf_fname', '')} {dvmf.get('dvmf_lname', '')}".strip(),
                    "email": dvmf.get("dvmf_email"),
                    "role": dvmf.get("dvmf_role", "user"),
                    "source": "dvmf_user_profile",
                },
                status=200,
            )

        # ---------------- If not found, check CTU Vet profile ----------------
        ctu_profile = (
            sr_client.table("ctu_vet_profile")
            .select("*")
            .eq("ctu_id", user_id)
            .execute()
        )

        if ctu_profile.data and len(ctu_profile.data) > 0:
            ctu = ctu_profile.data[0]
            return Response(
                {
                    "id": ctu.get("ctu_id"),
                    "name": f"{ctu.get('ctu_fname', '')} {ctu.get('ctu_lname', '')}".strip(),
                    "email": ctu.get("ctu_email"),
                    "role": ctu.get("ctu_role", "vet"),
                    "source": "ctu_vet_profile",
                },
                status=200,
            )

        return Response({"error": "User not found in any profile"}, status=404)

    except Exception as e:
        print("Error decoding token:", e)
        return Response({"error": "Invalid token"}, status=401)


# -------------------- Helper Function --------------------
import time

def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()
        except Exception as e:
            print(f"Supabase query failed (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                raise


def get_current_dvmf_id(request):
    """
    Extract the current dvmf_id (user identifier) from the access_token cookie.
    """
    access_token = request.COOKIES.get("access_token")
    if not access_token:
        return None

    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        return decoded.get("sub")  # 'sub' holds the DVMF user ID
    except Exception:
        return None


# -------------------- API View --------------------
@api_view(["GET"])
@login_required
def dvmf_user_profile(request):
    """Fetch the profile of the currently logged-in DVMF user"""
    try:
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = sr_client.table("dvmf_user_profile").select("*").eq("dvmf_id", dvmf_id).execute()
        data = res.data or []

        if len(data) == 0:
            return Response({"error": "Profile not found"}, status=404)

        profile = data[0]
        full_name = " ".join(filter(None, [
            profile.get("dvmf_fname"),
            profile.get("dvmf_lname"),
        ])).strip()

        profile["full_name"] = full_name

        return Response({"profile": profile}, status=200)

    except Exception:
        return Response({"error": "Internal server error"}, status=500)


@api_view(["PUT"])
@login_required
def mark_messages_as_read(request, conversation_id):
    """Mark messages as read for a conversation"""
    try:
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f" Marking messages as read - dvmf_id: {dvmf_id}, conversation_id: {conversation_id}")

        res = (
            sr_client.table("message")
            .update({"is_read": True})
            .eq("receiver_id", dvmf_id)
            .eq("user_id", conversation_id)
            .eq("is_read", False)
            .execute()
        )

        updated_count = len(res.data) if res.data else 0
        print(f" Marked {updated_count} messages as read")

        return Response(
            {"message": "Messages marked as read", "updated_count": updated_count},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        print("❌ Error marking messages as read:", str(e))
        traceback.print_exc()
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


LOCAL_OFFSET_HOURS = 8  # Manila is UTC+8


# -------------------- Send Message API --------------------
@api_view(["POST"])
@login_required
def send_message(request):
    """Send a message from the current DVMF user to another user"""
    try:
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        receiver_id = data.get("receiver_id")
        message_content = data.get("message")

        if not receiver_id or not message_content:
            return Response({"error": "Missing receiver_id or message"}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "mes_content": message_content,
            "is_read": False,
            "user_id": dvmf_id,
            "receiver_id": receiver_id
        }

        res = sr_client.table("message").insert(payload).execute()

        if not res.data:
            return Response({"error": "Failed to send message"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        msg = res.data[0]
        msg_time = datetime.fromisoformat(msg["mes_date"])
        msg["mes_date"] = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")

        return Response(
            {"message": "Message sent successfully", "data": msg},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        print("❌ Error sending message:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- Conversation APIs --------------------
@api_view(["GET"])
@login_required
def get_conversation(request, conversation_id):
    """Fetch all messages between the current DVMF user and a specific user."""
    try:
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        receiver_id = conversation_id

        data1 = safe_execute(
            sr_client.table("message")
            .select("*")
            .eq("user_id", dvmf_id)
            .eq("receiver_id", receiver_id)
        ).data or []

        data2 = safe_execute(
            sr_client.table("message")
            .select("*")
            .eq("user_id", receiver_id)
            .eq("receiver_id", dvmf_id)
        ).data or []

        all_messages = sorted(data1 + data2, key=lambda m: m["mes_date"])

        formatted_messages = []
        for msg in all_messages:
            try:
                msg_time = datetime.fromisoformat(str(msg["mes_date"]))
                local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
            except Exception:
                local_time = msg["mes_date"]

            formatted_messages.append({
                "id": msg["mes_id"],
                "content": msg["mes_content"],
                "timestamp": local_time,
                "isOwn": msg["user_id"] == dvmf_id,
                "is_read": msg["is_read"],
                "originalTimestamp": msg["mes_date"],
            })

        return Response(formatted_messages, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@login_required
def get_conversations(request):
    """
    Get all conversations for the currently logged-in DVMF user.
    Shows all users who have exchanged messages with the current DVMF account.
    """
    try:
        # ✅ Use DVMF ID instead of president_id
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ Track unique conversation partners
        conversation_partners = set()

        # ✅ Users who sent messages to current DVMF
        received_res = safe_execute(
            sr_client.table("message")
            .select("user_id")
            .eq("receiver_id", dvmf_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])

        # ✅ Users who received messages from current DVMF
        sent_res = safe_execute(
            sr_client.table("message")
            .select("receiver_id")
            .eq("user_id", dvmf_id)
        )
        if sent_res.data:
            for msg in sent_res.data:
                conversation_partners.add(msg["receiver_id"])

        # ✅ No conversation yet
        if not conversation_partners:
            return Response([], status=status.HTTP_200_OK)

        # ✅ Fetch user details for conversation partners
        users_res = safe_execute(
            sr_client.table("users")
            .select("id, role, status")
            .in_("id", list(conversation_partners))
            .eq("status", "approved")
        )
        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        conversations = []

        for user in users:
            user_id = user["id"]
            role = user["role"]

            # ✅ Get latest message between current DVMF user and other user
            messages_res = safe_execute(
                sr_client.table("message")
                .select("*")
                .or_(
                    f"and(user_id.eq.{dvmf_id},receiver_id.eq.{user_id}),"
                    f"and(user_id.eq.{user_id},receiver_id.eq.{dvmf_id})"
                )
                .order("mes_date", desc=True)
                .limit(1)
            )
            latest_message = messages_res.data[0] if messages_res.data else None

            # ✅ Count unread messages
            unread_res = safe_execute(
                sr_client.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", dvmf_id)
                .eq("is_read", False)
            )
            unread_count = len(unread_res.data) if unread_res.data else 0

            # ✅ Fetch user profile info
            profile_info = get_user_profile_info(user_id, role)

            # ✅ Format timestamp
            timestamp = ""
            latest_message_datetime = None
            if latest_message and latest_message.get("mes_date"):
                try:
                    msg_time = datetime.fromisoformat(str(latest_message["mes_date"]))
                    local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
                    timestamp = local_time
                    latest_message_datetime = msg_time
                except Exception:
                    timestamp = str(latest_message["mes_date"])
                    latest_message_datetime = datetime.now()

            # ✅ Handle last message content with "You:" prefix
            last_message_content = ""
            last_message_is_own = False

            if latest_message:
                last_message_is_own = latest_message["user_id"] == dvmf_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"
                latest_message_datetime = datetime.min

            # ✅ Build conversation data
            conversations.append({
                'id': user_id,
                'name': profile_info["name"],
                'role': role,
                'avatar': profile_info["avatar"],
                'online': False,
                'lastMessage': last_message_content,
                'lastMessageSender': latest_message["user_id"] if latest_message else None,
                'lastMessageIsOwn': last_message_is_own,
                'timestamp': timestamp,
                'unread': unread_count,
                'has_conversation': True,
                'sortTimestamp': latest_message_datetime if latest_message_datetime else datetime.min
            })

        # ✅ Sort by latest message datetime (most recent first)
        conversations.sort(key=lambda x: x.get('sortTimestamp', datetime.min), reverse=True)

        return Response(conversations, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- API VIEW: GET ALL USERS --------------------
@api_view(["GET"])
@login_required
def get_all_users(request):
    """Fetch all approved users (from all profile tables) except the current DVMF user."""
    try:
        # ✅ Step 1: Get the current logged-in DVMF user's ID
        dvmf_id = get_current_dvmf_id(request)
        if not dvmf_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f" Debug: Current dvmf_id from token: {dvmf_id}")

        # ✅ Step 2: Fetch all approved users except the current DVMF user
        users_res = safe_execute(
            sr_client.table("users")
            .select("id, role, status")
            .eq("status", "approved")
            .neq("id", dvmf_id)
        )

        users = users_res.data or []
        print(f" Debug: Found {len(users)} approved users (excluding current user)")

        if not users:
            return Response([], status=status.HTTP_200_OK)

        all_users = []
        role_groups = {}

        # ✅ Step 3: Group users by role
        for u in users:
            role_groups.setdefault(u["role"], []).append(u["id"])

        print(f" Debug: Role groups: {role_groups}")

        profiles_map = {}

        # 🩺 Veterinarian
        if "Veterinarian" in role_groups:
            ids = role_groups["Veterinarian"]
            res = safe_execute(
                sr_client.table("vet_profile")
                .select("vet_id, vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .in_("vet_id", ids)
            )
            print(f" Debug: Found {len(res.data or [])} Veterinarian profiles")
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                profiles_map[p["vet_id"]] = {
                    "name": f"{full_name} (Veterinarian)",
                    "avatar": p.get("vet_profile_photo")
                }

        # 🧑 Kutsero
        if "Kutsero" in role_groups:
            ids = role_groups["Kutsero"]
            res = safe_execute(
                sr_client.table("kutsero_profile")
                .select("kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_image")
                .in_("kutsero_id", ids)
            )
            print(f" Debug: Found {len(res.data or [])} Kutsero profiles")
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                profiles_map[p["kutsero_id"]] = {
                    "name": f"{full_name} (Kutsero)",
                    "avatar": p.get("kutsero_image")
                }

        # 🐴 Horse Operator
        if "Horse Operator" in role_groups:
            ids = role_groups["Horse Operator"]
            res = safe_execute(
                sr_client.table("horse_op_profile")
                .select("op_id, op_fname, op_mname, op_lname, op_image")
                .in_("op_id", ids)
            )
            print(f" Debug: Found {len(res.data or [])} Horse Operator profiles")
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                profiles_map[p["op_id"]] = {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
                }

        # 🧑 Kutsero President
        if "Kutsero President" in role_groups:
            ids = role_groups["Kutsero President"]
            res = safe_execute(
                sr_client.table("kutsero_pres_profile")
                .select("user_id, pres_fname, pres_lname")
                .in_("user_id", ids)
            )
            print(f"Debug: Found {len(res.data or [])} Kutsero President profiles")
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("pres_fname"), p.get("pres_lname")])).strip()
                profiles_map[p["user_id"]] = {
                    "name": f"{full_name} (Kutsero President)",
                    "avatar": None
                }

        # 🧑 DVMF + DVMF-Admin
        for role_key in ["Dvmf", "Dvmf-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    sr_client.table("dvmf_user_profile")
                    .select("dvmf_id, dvmf_fname, dvmf_lname")
                    .in_("dvmf_id", ids)
                )
                print(f"Debug: Found {len(res.data or [])} {role_key} profiles")
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                    profiles_map[p["dvmf_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # 🎓 CTU Vetmed + CTU-Admin (kept for compatibility)
        for role_key in ["Ctu-Vetmed", "Ctu-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    sr_client.table("ctu_vet_profile")
                    .select("ctu_id, ctu_fname, ctu_lname")
                    .in_("ctu_id", ids)
                )
                print(f"Debug: Found {len(res.data or [])} {role_key} profiles")
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                    profiles_map[p["ctu_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # ✅ Step 4: Combine user and profile info
        for u in users:
            uid = u["id"]
            info = profiles_map.get(uid, {"name": f"User {uid} ({u['role']})", "avatar": None})
            all_users.append({
                "id": uid,
                "name": info["name"],
                "role": u["role"],
                "avatar": info["avatar"],
                "online": False,
                "lastMessage": "Tap to chat",
                "timestamp": "",
                "unread": 0
            })

        print(f"Debug: Final user list: {len(all_users)} users")
        return Response(all_users, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching users:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_user_profile_info(user_id, role):
    """Helper function to get user profile info based on role"""
    try:
        # 🩺 Veterinarian
        if role == "Veterinarian":
            res = safe_execute(
                sr_client.table("vet_profile")
                .select("vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .eq("vet_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                return {
                    "name": f"{full_name} (Veterinarian)",
                    "avatar": p.get("vet_profile_photo")
                }

        # 🧑 Kutsero
        elif role == "Kutsero":
            res = safe_execute(
                sr_client.table("kutsero_profile")
                .select("kutsero_fname, kutsero_mname, kutsero_lname")
                .eq("kutsero_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                return {
                    "name": f"{full_name} (Kutsero)",
                    "avatar": None
                }

        # 🐴 Horse Operator
        elif role == "Horse Operator":
            res = safe_execute(
                sr_client.table("horse_op_profile")
                .select("op_fname, op_mname, op_lname, op_image")
                .eq("op_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                return {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
                }

        # 🧑 Kutsero President
        elif role == "Kutsero President":
            res = safe_execute(
                sr_client.table("kutsero_pres_profile")
                .select("pres_fname, pres_lname")
                .eq("user_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("pres_fname"), p.get("pres_lname")])).strip()
                return {
                    "name": f"{full_name} (Kutsero President)",
                    "avatar": None
                }

        # 🧑 DVMF
        elif role == "Dvmf":
            res = safe_execute(
                sr_client.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {
                    "name": f"{full_name} (DVMF)",
                    "avatar": None
                }

        # 🧑 DVMF-Admin
        elif role == "Dvmf-Admin":
            res = safe_execute(
                sr_client.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {
                    "name": f"{full_name} (DVMF Admin)",
                    "avatar": None
                }

        # 🎓 CTU Vetmed
        elif role == "Ctu-Vetmed":
            res = safe_execute(
                sr_client.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {
                    "name": f"{full_name} (CTU Vetmed)",
                    "avatar": None
                }

        # 🎓 CTU-Admin
        elif role == "Ctu-Admin":
            res = safe_execute(
                sr_client.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {
                    "name": f"{full_name} (CTU Admin)",
                    "avatar": None
                }

    except Exception as e:
        print(f"❌ Error getting profile info for {user_id} ({role}): {e}")

    # 🛠️ Fallback for unknown roles or errors
    return {
        "name": f"User ({role})",
        "avatar": None
    }


# -------------------- GET VETERINARIAN PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def vet_profile_by_id(request, user_id):
    """Fetch veterinarian profile by user ID for profile modal (DVMF auth version)"""
    try:
        current_dvmf_id = get_current_dvmf_id(request)
        if not current_dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Vet profile for user_id: {user_id} (DVMF ID: {current_dvmf_id})")
        res = sr_client.table("vet_profile").select("*").eq("vet_id", user_id).execute()
        print(f"[DEBUG] Supabase response: {res.data}")

        if not res.data:
            return Response({"error": "Veterinarian profile not found"}, status=404)

        profile = res.data[0]
        formatted_profile = {
            "vet_id": profile.get("vet_id"),
            "vet_fname": profile.get("vet_fname"),
            "vet_mname": profile.get("vet_mname"),
            "vet_lname": profile.get("vet_lname"),
            "vet_dob": profile.get("vet_dob"),
            "vet_sex": profile.get("vet_sex"),
            "vet_phone_num": profile.get("vet_phone_num"),
            "vet_street": profile.get("vet_street"),
            "vet_brgy": profile.get("vet_brgy"),
            "vet_city": profile.get("vet_city"),
            "vet_province": profile.get("vet_province"),
            "vet_zipcode": profile.get("vet_zipcode"),
            "vet_address_is_clinic": profile.get("vet_address_is_clinic"),
            "vet_clinic_street": profile.get("vet_clinic_street"),
            "vet_clinic_brgy": profile.get("vet_clinic_brgy"),
            "vet_clinic_city": profile.get("vet_clinic_city"),
            "vet_clinic_province": profile.get("vet_clinic_province"),
            "vet_clinic_zipcode": profile.get("vet_clinic_zipcode"),
            "vet_email": profile.get("vet_email"),
            "vet_exp_yr": profile.get("vet_exp_yr"),
            "vet_specialization": profile.get("vet_specialization"),
            "vet_org": profile.get("vet_org"),
            "vet_profile_photo": profile.get("vet_profile_photo"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=200)

    except Exception as e:
        print(f"❌ Error fetching veterinarian profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# -------------------- GET HORSE OPERATOR PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def horse_operator_profile_by_id(request, user_id):
    """Fetch horse operator profile by user ID for profile modal (DVMF auth version)"""
    try:
        current_dvmf_id = get_current_dvmf_id(request)
        if not current_dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Horse Operator profile for user_id: {user_id} (DVMF ID: {current_dvmf_id})")
        res = sr_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
        print(f"[DEBUG] Supabase response: {res.data}")

        if not res.data:
            return Response({"error": "Horse operator profile not found"}, status=404)

        profile = res.data[0]
        formatted_profile = {
            "op_id": profile.get("op_id"),
            "op_fname": profile.get("op_fname"),
            "op_mname": profile.get("op_mname"),
            "op_lname": profile.get("op_lname"),
            "op_dob": profile.get("op_dob"),
            "op_sex": profile.get("op_sex"),
            "op_phone_num": profile.get("op_phone_num"),
            "op_province": profile.get("op_province"),
            "op_city": profile.get("op_city"),
            "op_municipality": profile.get("op_municipality"),
            "op_brgy": profile.get("op_brgy"),
            "op_zipcode": profile.get("op_zipcode"),
            "op_house_add": profile.get("op_house_add"),
            "op_email": profile.get("op_email"),
            "op_image": profile.get("op_image"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=200)

    except Exception as e:
        print(f"❌ Error fetching horse operator profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# -------------------- GET KUTSERO PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def kutsero_profile_by_id(request, user_id):
    """Fetch kutsero profile by user ID for profile modal (DVMF auth version)"""
    try:
        current_dvmf_id = get_current_dvmf_id(request)
        if not current_dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Kutsero profile for user_id: {user_id} (DVMF ID: {current_dvmf_id})")
        res = sr_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
        print(f"[DEBUG] Supabase response: {res.data}")

        if not res.data:
            return Response({"error": "Kutsero profile not found"}, status=404)

        profile = res.data[0]
        formatted_profile = {
            "kutsero_id": profile.get("kutsero_id"),
            "kutsero_fname": profile.get("kutsero_fname"),
            "kutsero_mname": profile.get("kutsero_mname"),
            "kutsero_lname": profile.get("kutsero_lname"),
            "kutsero_dob": profile.get("kutsero_dob"),
            "kutsero_sex": profile.get("kutsero_sex"),
            "kutsero_phone_num": profile.get("kutsero_phone_num"),
            "kutsero_province": profile.get("kutsero_province"),
            "kutsero_city": profile.get("kutsero_city"),
            "kutsero_municipality": profile.get("kutsero_municipality"),
            "kutsero_brgy": profile.get("kutsero_brgy"),
            "kutsero_zipcode": profile.get("kutsero_zipcode"),
            "kutsero_email": profile.get("kutsero_email"),
            "kutsero_fb": profile.get("kutsero_fb"),
            "kutsero_username": profile.get("kutsero_username"),
            "kutsero_image": profile.get("kutsero_image"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=200)

    except Exception as e:
        print(f"❌ Error fetching kutsero profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# -------------------- GET CTU VETERINARIAN PROFILE --------------------
@api_view(["GET"])
@login_required
def ctu_vet_profile_by_id(request, user_id):
    """Fetch CTU veterinarian profile by user ID for profile modal (DVMF auth version)"""
    try:
        current_dvmf_id = get_current_dvmf_id(request)
        if not current_dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching CTU Vet profile for user_id: {user_id} (DVMF ID: {current_dvmf_id})")
        query_id = str(user_id) if isinstance(user_id, UUID) else user_id

        res = sr_client.table("ctu_vet_profile").select("*").eq("ctu_id", query_id).execute()
        print(f"[DEBUG] Supabase response: {res.data}")

        if not res.data:
            return Response({"error": "CTU Vet profile not found"}, status=404)

        profile = res.data[0]
        formatted_profile = {
            "ctu_id": profile.get("ctu_id"),
            "ctu_email": profile.get("ctu_email"),
            "ctu_fname": profile.get("ctu_fname"),
            "ctu_lname": profile.get("ctu_lname"),
            "ctu_role": profile.get("ctu_role"),
            "ctu_phonenum": profile.get("ctu_phonenum"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=200)

    except Exception as e:
        print(f"❌ Error fetching CTU Vet profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# -------------------- GET DVMF USER PROFILE --------------------
@api_view(["GET"])
@login_required
def dvmf_user_profile_by_id(request, user_id):
    """Fetch DVMF user profile by user ID for profile modal"""
    try:
        current_dvmf_id = get_current_dvmf_id(request)
        if not current_dvmf_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching DVMF profile for user_id: {user_id} (DVMF ID: {current_dvmf_id})")
        res = sr_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()

        if not res.data:
            return Response({"error": "DVMF profile not found"}, status=404)

        profile = res.data[0]
        formatted_profile = {
            "dvmf_id": profile.get("dvmf_id"),
            "dvmf_fname": profile.get("dvmf_fname"),
            "dvmf_lname": profile.get("dvmf_lname"),
            "dvmf_email": profile.get("dvmf_email"),
            "dvmf_phonenum": profile.get("dvmf_phonenum"),
            "dvmf_role": profile.get("dvmf_role"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=200)

    except Exception as e:
        print(f"❌ Error fetching DVMF profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

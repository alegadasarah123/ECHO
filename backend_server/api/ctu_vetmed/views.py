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
        # 1️⃣ Extract and clean fields
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        role = request.data.get("role", "").strip()

        # Validate role - Ctu-Admin is super admin, not creatable via signup
        valid_roles = ["Ctu-Vetmed", "Dvmf"]
        if not role:
            return Response({"error": "Role is required"}, status=400)
        if role not in valid_roles:
            return Response({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}, status=400)

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
            "role": role,          # "Ctu-Vetmed" or "Dvmf"
            "status": "approved"   # could also be "pending"
        }
        users_res = sr_client.table("users").upsert(user_record).execute()
        if getattr(users_res, "error", None):
            return Response({"error": "Failed to insert into users table", "details": users_res.error}, status=400)

        # 6️⃣ Insert into CTU Vet profile (for Ctu-Vetmed role)
        if role == "Ctu-Vetmed":
            profile_payload = {
                "ctu_id": user_id,
                "ctu_fname": first_name,
                "ctu_lname": last_name,
                "ctu_email": email,
                "ctu_phonenum": phone_number,
                "ctu_role": role  # This will override the default 'vet'
            }
            profile_res = sr_client.table("ctu_vet_profile").upsert(profile_payload).execute()
            if getattr(profile_res, "error", None):
                return Response({"error": "Failed to insert CTU Vet profile", "details": profile_res.error}, status=400)
        
        # 7️⃣ Insert into DVMF profile (for Dvmf role) - CORRECTED TABLE NAME
        elif role == "Dvmf":
            profile_payload = {
                "dvmf_id": user_id,
                "dvmf_fname": first_name,
                "dvmf_lname": last_name,
                "dvmf_email": email,
                "dvmf_phonenum": phone_number,
                "dvmf_role": role
            }
            # Note: Table name is dvmf_user_profile, not dvmf_profile
            profile_res = sr_client.table("dvmf_user_profile").upsert(profile_payload).execute()
            if getattr(profile_res, "error", None):
                return Response({"error": "Failed to insert DVMF profile", "details": profile_res.error}, status=400)

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


# -------------------- GET ALL PROFILES --------------------
@api_view(['GET'])
def get_all_profiles(request):
    """
    Get all user profiles (vet, kutsero, horse_operator)
    """
    try:
        # Fetch vet profiles
        vet_res = sr_client.table("vet_profile")\
            .select("*, users(*)")\
            .execute()
        
        # Fetch kutsero profiles - Note: table name is kutsero_profile
        kutsero_res = sr_client.table("kutsero_profile")\
            .select("*, users(*)")\
            .execute()
        
        # Fetch horse operator profiles - Note: table name is horse_op_profile (not horse_operator_profile)
        horse_op_res = sr_client.table("horse_op_profile")\
            .select("*, users(*)")\
            .execute()
        
        # Combine all profiles with type identifier
        all_profiles = []
        
        # Process vet profiles
        for vet in vet_res.data:
            vet['type'] = 'Veterinarian'
            vet['user_id'] = vet.get('vet_id')
            vet['name'] = f"{vet.get('vet_fname', '')} {vet.get('vet_lname', '')}"
            vet['email'] = vet.get('vet_email')
            vet['profile_photo'] = vet.get('vet_profile_photo')
            vet['city'] = vet.get('vet_city')
            vet['province'] = vet.get('vet_province')
            vet['status'] = vet.get('users', {}).get('status', 'pending')
            vet['decline_reason'] = vet.get('users', {}).get('decline_reason', '')
            all_profiles.append(vet)
        
        # Process kutsero profiles - Note field names are kutsero_ prefixed
        for kutsero in kutsero_res.data:
            kutsero['type'] = 'Kutsero'
            kutsero['user_id'] = kutsero.get('kutsero_id')
            kutsero['name'] = f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}"
            kutsero['email'] = kutsero.get('kutsero_email')
            kutsero['profile_photo'] = kutsero.get('kutsero_image')  # Note: field name is kutsero_image
            kutsero['city'] = kutsero.get('kutsero_city')
            kutsero['province'] = kutsero.get('kutsero_province')
            kutsero['status'] = kutsero.get('users', {}).get('status', 'pending')
            kutsero['decline_reason'] = kutsero.get('users', {}).get('decline_reason', '')
            all_profiles.append(kutsero)
        
        # Process horse operator profiles - Note field names are op_ prefixed
        for operator in horse_op_res.data:
            operator['type'] = 'Horse Operator'
            operator['user_id'] = operator.get('op_id')
            operator['name'] = f"{operator.get('op_fname', '')} {operator.get('op_lname', '')}"
            operator['email'] = operator.get('op_email')
            operator['profile_photo'] = operator.get('op_image')  # Note: field name is op_image
            operator['city'] = operator.get('op_city')
            operator['province'] = operator.get('op_province')
            operator['status'] = operator.get('users', {}).get('status', 'pending')
            operator['decline_reason'] = operator.get('users', {}).get('decline_reason', '')
            all_profiles.append(operator)
        
        return Response({
            "success": True,
            "data": all_profiles,
            "count": len(all_profiles)
        }, status=200)
        
    except Exception as e:
        logging.exception("Error fetching all profiles")
        return Response({"error": str(e)}, status=500)




# -------------------- GET ACCOUNT COUNTS --------------------
@api_view(['GET'])
def get_all_profile_counts(request):
    """
    Get counts for all user types
    """
    try:
        # Get all profiles
        vet_res = sr_client.table("vet_profile")\
            .select("*, users(*)")\
            .execute()
        
        kutsero_res = sr_client.table("kutsero_profile")\
            .select("*, users(*)")\
            .execute()
        
        horse_op_res = sr_client.table("horse_op_profile")\
            .select("*, users(*)")\
            .execute()
        
        # Initialize counters
        pending_count = 0
        approved_count = 0
        declined_count = 0
        
        # Count vet profiles
        for vet in vet_res.data:
            status = vet.get('users', {}).get('status', 'pending')
            if status == 'pending':
                pending_count += 1
            elif status == 'approved':
                approved_count += 1
            elif status == 'declined':
                declined_count += 1
        
        # Count kutsero profiles
        for kutsero in kutsero_res.data:
            status = kutsero.get('users', {}).get('status', 'pending')
            if status == 'pending':
                pending_count += 1
            elif status == 'approved':
                approved_count += 1
            elif status == 'declined':
                declined_count += 1
        
        # Count horse operator profiles
        for operator in horse_op_res.data:
            status = operator.get('users', {}).get('status', 'pending')
            if status == 'pending':
                pending_count += 1
            elif status == 'approved':
                approved_count += 1
            elif status == 'declined':
                declined_count += 1
        
        total_count = pending_count + approved_count + declined_count
        
        return Response({
            "success": True,
            "data": {
                "pending": pending_count,
                "approved": approved_count,
                "declined": declined_count,
                "all": total_count
            }
        }, status=200)
        
    except Exception as e:
        logging.exception("Error fetching profile counts")
        return Response({"error": str(e)}, status=500)


# -------------------- UPDATE STATUS --------------------
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
import logging

# -------------------- UPDATE USER STATUS --------------------
@api_view(['PATCH'])
def update_user_status(request, user_profile_id):
    """
    Update the status of any user (vet, kutsero, horse_operator) 
    and send a modern HTML email notification on approved or declined.
    """
    new_status = request.data.get("status")
    decline_reason = request.data.get("decline_reason")
    user_type = request.data.get("user_type", "vet")  # Get user type from request
    
    reason_text = decline_reason if decline_reason else "Not provided"
    allowed_statuses = ["pending", "approved", "declined"]
    
    if new_status not in allowed_statuses:
        return Response({"error": f"Invalid status. Allowed: {allowed_statuses}"}, status=400)

    # Define table mapping based on user type
    table_mapping = {
        "vet": {
            "table": "vet_profile",
            "id_field": "vet_id",
            "email_field": "vet_email",
            "fname_field": "vet_fname",
            "lname_field": "vet_lname"
        },
        "kutsero": {
            "table": "kutsero_profile",
            "id_field": "kutsero_id",
            "email_field": "kutsero_email",
            "fname_field": "kutsero_fname",
            "lname_field": "kutsero_lname"
        },
        "horse_operator": {
            "table": "horse_op_profile",  # Note: actual table name
            "id_field": "op_id",  # Note: field name is op_id
            "email_field": "op_email",  # Note: field name is op_email
            "fname_field": "op_fname",  # Note: field name is op_fname
            "lname_field": "op_lname"   # Note: field name is op_lname
        }
    }

    if user_type not in table_mapping:
        return Response({"error": f"Invalid user type. Allowed: {list(table_mapping.keys())}"}, status=400)

    table_info = table_mapping[user_type]
    
    # Get user profile based on type
    profile_res = sr_client.table(table_info["table"])\
        .select(f"{table_info['id_field']}, {table_info['email_field']}, {table_info['fname_field']}, {table_info['lname_field']}")\
        .eq(table_info["id_field"], str(user_profile_id)).execute()

    if not profile_res.data:
        return Response({"error": f"{user_type.replace('_', ' ').title()} profile not found"}, status=404)

    profile_data = profile_res.data[0]
    user_id = profile_data[table_info["id_field"]]
    user_email = profile_data.get(table_info["email_field"])
    user_name = f"{profile_data.get(table_info['fname_field'], '')} {profile_data.get(table_info['lname_field'], '')}".strip() or "User"

    # Update user status and save decline_reason in users table
    update_data = {"status": new_status}
    if new_status == "declined":
        update_data["decline_reason"] = reason_text

    update_res = sr_client.table("users").update(update_data).eq("id", user_id).execute()
    if not update_res.data:
        return Response({"error": "User not found in users table"}, status=404)

    # Send email when approved or declined
    if user_email and new_status in ["approved", "declined"]:
        user_type_display = user_type.replace("_", " ").title()
        
        if new_status == "approved":
            subject = f"Your {user_type_display} Account Has Been Approved"
            plain_message = f"Hello {user_name},\n\nYour {user_type_display} account has been approved. You can now log in and start using the system.\n\nBest regards,\nECHOSys Team"
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                    <h1 style="margin:0; font-size:24px;">Account Approved ✅</h1>
                  </div>
                  <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                    <p>Hello {user_name},</p>
                    <p>Good news! Your {user_type_display} account has been approved by the admin. You can now log in and start using the system.</p>
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
            subject = f"Your {user_type_display} Account Has Been Declined"
            plain_message = f"Hello {user_name},\n\nWe're sorry to inform you that your {user_type_display} account request was NOT APPROVED by the admin. The reason: {reason_text}. Please contact support if needed.\n\nBest regards,\nECHOSys Team"
            html_message = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                    <h1 style="margin:0; font-size:24px;">Account Declined ⚠️</h1>
                  </div>
                  <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                    <p>Hello {user_name},</p>
                    <p>We're sorry to inform you that your {user_type_display} account request has been NOT APPROVED by the admin. The reason: <strong>{reason_text}</strong>.</p>
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
                recipient_list=[user_email],
                fail_silently=False,
                html_message=html_message
            )
        except Exception as e:
            logging.exception(f"Failed to send {user_type} status email")
            return Response({
                "message": f"Status updated to {new_status}, but email failed to send",
                "error": str(e)
            }, status=200)

    return Response({
        "message": f"Status updated to {new_status}",
        "data": update_res.data[0],
        "user_type": user_type
    }, status=200)
    
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














# -------------------- GET USERS FOR CTU-ADMIN --------------------
@api_view(['GET'])
def get_users(request):
    try:
        current_user_id = request.GET.get("user_id")
        current_user_role = request.GET.get("role")

        # Debug logging
        print(f"Current user role received: '{current_user_role}'")
        
        all_users = []

        # Fetch CTU-Vetmed users from ctu_vet_profile table
        ctu_response = sr_client.table("ctu_vet_profile").select("*").execute()
        
        ctu_users = []
        if ctu_response.data:
            for u in ctu_response.data:
                user_data = {
                    "id": u.get("ctu_id"),  # Use ctu_id as ID
                    "ctu_id": u.get("ctu_id"),
                    "firstname": u.get("ctu_fname", ""),
                    "lastname": u.get("ctu_lname", ""),
                    "email": u.get("ctu_email", ""),
                    "phone": u.get("ctu_phonenum", ""),
                    "role": u.get("ctu_role", "Ctu-Vetmed"),
                    "status": "approved"  # CTU-Vetmed users are already approved
                }
                ctu_users.append(user_data)
        
        all_users.extend(ctu_users)

        # Only fetch DVMF users if the current user is Ctu-Admin (case-insensitive)
        if current_user_role and current_user_role.lower() == "ctu-admin":
            print("User is Ctu-Admin, fetching DVMF users...")
            # Fetch DVMF users from dvmf_user_profile table
            dvmf_response = sr_client.table("dvmf_user_profile").select("*").execute()
            
            dvmf_users = []
            if dvmf_response.data:
                for u in dvmf_response.data:
                    user_data = {
                        "id": u.get("dvmf_id"),  # Use dvmf_id as ID
                        "dvmf_id": u.get("dvmf_id"),
                        "firstname": u.get("dvmf_fname", ""),
                        "lastname": u.get("dvmf_lname", ""),
                        "email": u.get("dvmf_email", ""),
                        "phone": u.get("dvmf_phonenum", ""),
                        "role": "Dvmf",
                        "status": "approved"  # DVMF users are typically approved
                    }
                    dvmf_users.append(user_data)
            
            all_users.extend(dvmf_users)
            print(f"Added {len(dvmf_users)} DVMF users")
        else:
            print(f"User role '{current_user_role}' is not Ctu-Admin, skipping DVMF users")

        print(f"Total users to return: {len(all_users)}")
        return Response(all_users, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in get_users: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



# -------------------- GET VET NOTIFICATIONS --------------------
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import jwt
import pytz

# Manila Timezone
manila_tz = pytz.timezone('Asia/Manila')

def to_manila_time(dt):
    """Convert datetime to Manila timezone"""
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(manila_tz)

def get_current_user_id_internal(request):
    """Extract user ID from JWT token"""
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return None
        
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        return user_id
    except Exception as e:
        print(f"Error getting user ID from token: {e}")
        return None

# Wrapper for backward compatibility
def get_current_user_id(request):
    return get_current_user_id_internal(request)

# -------------------- GET CURRENT USER ID --------------------
@api_view(["GET"])
def get_current_user_id_endpoint(request):
    """
    Get only the user ID from JWT token.
    """
    try:
        user_id = get_current_user_id_internal(request)
        if not user_id:
            return Response({"error": "User not authenticated"}, status=401)
        
        return Response({
            "success": True,
            "user_id": user_id
        }, status=200)
    except Exception as e:
        print(f"Error getting user ID: {e}")
        return Response({"error": str(e)}, status=500)

# -------------------- GET VET NOTIFICATIONS --------------------
@api_view(["GET"])
def get_vetnotifications(request):
    try:
        current_user_id = get_current_user_id_internal(request)
        if not current_user_id:
            return Response({"error": "User not authenticated"}, status=401)
        
        print(f"\n{'='*60}")
        print(f"FETCHING NOTIFICATIONS for user: {current_user_id}")
        print(f"{'='*60}")
        
        notifications_to_insert = []

        # Get current user info
        user_res = sr_client.table("users") \
            .select("id, role") \
            .eq("id", current_user_id) \
            .execute()
        
        current_user_role = None
        if user_res.data:
            current_user_role = user_res.data[0].get("role")
            print(f"Current user role: {current_user_role}")

        # Helper to add notifications - EACH USER GETS THEIR OWN COPY
        def add_notification(user_id, message, notif_type, event_id, created_at=None):
            if not user_id:
                return False
            
            # Generate UNIQUE related_id PER USER
            import hashlib
            import json
            
            # Create fingerprint: event_id + message + user_id
            # This ensures EACH USER gets their OWN UNIQUE notification
            fingerprint_data = {
                "event_id": event_id,
                "message": message[:100],  # First 100 chars
                "user_id": user_id  # INCLUDING USER_ID makes it unique per user
            }
            fingerprint = hashlib.md5(json.dumps(fingerprint_data, sort_keys=True).encode()).hexdigest()
            
            # Create unique related_id WITH USER_ID in it
            related_id = f"notif_{user_id}_{fingerprint[:12]}"
            
            # Check if THIS SPECIFIC USER already has THIS EXACT notification
            try:
                existing_res = sr_client.table("notification") \
                    .select("notif_id") \
                    .eq("id", user_id) \
                    .eq("related_id", related_id) \
                    .execute()
                
                if existing_res.data and len(existing_res.data) > 0:
                    # THIS USER already has this EXACT notification
                    print(f"  User {user_id[:8]}... already has: {message[:30]}...")
                    return False
                    
            except Exception as e:
                print(f"  Error checking duplicate: {e}")
                # On error, proceed with different related_id
                related_id = f"notif_error_{user_id}_{event_id}"
            
            dt_ph = to_manila_time(created_at) if created_at else datetime.now(manila_tz)
            notifications_to_insert.append({
                "id": user_id,
                "notif_message": message,
                "notif_date": dt_ph.strftime("%Y-%m-%d"),
                "notif_time": dt_ph.strftime("%H:%M:%S"),
                "notif_read": False,  # Each user starts with unread
                "notification_type": notif_type,
                "related_id": related_id  # UNIQUE PER USER
            })
            print(f"  ✓ Adding for user {user_id[:8]}...: {notif_type} - {message[:50]}...")
            return True

        # Get ALL administrative users (CTU, DVMF, Admin)
        print(f"\n[1] Getting all administrative users...")
        try:
            # Get ALL CTU users
            ctu_users_res = sr_client.table("ctu_vet_profile") \
                .select("ctu_id") \
                .execute()
            ctu_user_ids = [user.get("ctu_id") for user in (ctu_users_res.data or []) if user.get("ctu_id")]
            print(f"  Found {len(ctu_user_ids)} CTU users")
            
            # Get ALL DVMF users
            dvmf_users_res = sr_client.table("dvmf_user_profile") \
                .select("dvmf_id") \
                .execute()
            dvmf_user_ids = [user.get("dvmf_id") for user in (dvmf_users_res.data or []) if user.get("dvmf_id")]
            print(f"  Found {len(dvmf_user_ids)} DVMF users")
            
            # Get ALL Admin users (Ctu-Admin)
            admin_users_res = sr_client.table("users") \
                .select("id") \
                .eq("role", "Ctu-Admin") \
                .execute()
            admin_user_ids = [user.get("id") for user in (admin_users_res.data or []) if user.get("id")]
            print(f"  Found {len(admin_user_ids)} Admin users")
            
            # Combine ALL administrative users
            all_admin_users = ctu_user_ids + dvmf_user_ids + admin_user_ids
            all_admin_users = list(set(all_admin_users))  # Remove duplicates
            print(f"  Total administrative users: {len(all_admin_users)}")
            
        except Exception as e:
            print(f"  Error getting admin users: {e}")
            all_admin_users = []

        # Helper to notify ALL administrative users - EACH GETS THEIR OWN COPY
        def notify_all_admins(message, notif_type, event_id, created_at=None):
            if not all_admin_users:
                return
            
            added_count = 0
            for admin_user_id in all_admin_users:
                if add_notification(admin_user_id, message, notif_type, event_id, created_at):
                    added_count += 1
            
            if added_count > 0:
                print(f"    ✅ Notified {added_count}/{len(all_admin_users)} admin users")
            else:
                print(f"    ⚠️ All admins already have this notification")

        # ---------------- VET REGISTRATION/APPROVAL/DECLINE ----------------
        print(f"\n[2] Checking VET REGISTRATION notifications...")
        try:
            vets_res = sr_client.table("vet_profile") \
                .select("vet_id, vet_fname, vet_lname, created_at, users(id, status, role)") \
                .execute()
            
            print(f"  Found {len(vets_res.data or [])} vet profiles")
            
            for vet in (vets_res.data or []):
                users = vet.get("users") or {}
                if users.get("role","").lower() != "veterinarian":
                    continue
                
                status = users.get("status","").lower()
                vet_name = f"{vet.get('vet_fname','')} {vet.get('vet_lname','')}".strip()
                vet_user_id = users.get("id")
                
                if status == "pending":
                    print(f"    Processing pending vet: Dr. {vet_name}")
                    
                    # Notify ALL administrative users - EACH GETS THEIR OWN COPY
                    event_id = f"vet_pending_{vet['vet_id']}"
                    notify_all_admins(
                        f"New veterinarian registration: Dr. {vet_name} needs approval.",
                        "vet_registration",
                        event_id,
                        vet.get("created_at")
                    )
                
                elif status in ["approved", "declined"]:
                    print(f"    Processing vet {status}: Dr. {vet_name}")
                    
                    # Notify ALL administrative users - EACH GETS THEIR OWN COPY
                    event_id = f"vet_{status}_{vet['vet_id']}_admin"
                    notify_all_admins(
                        f"Veterinarian Dr. {vet_name} has been {status}.",
                        "vet_status_update",
                        event_id,
                        vet.get("created_at")
                    )
                    
                    # Also notify the VET themselves - THEY GET THEIR OWN COPY
                    if vet_user_id:
                        event_id = f"vet_{status}_{vet['vet_id']}_self"
                        add_notification(
                            vet_user_id,
                            f"Your veterinarian registration has been {status}.",
                            status,
                            event_id,
                            vet.get("created_at")
                        )
                        
        except Exception as e:
            print(f"  Error: {e}")

        # ---------------- MEDICAL RECORD ACCESS REQUESTS ----------------
        print(f"\n[3] Checking MEDICAL RECORD REQUEST notifications...")
        try:
            medreq_res = sr_client.table("medrec_access_request") \
                .select("request_id, vet_profile(vet_fname, vet_lname, users(id)), horse_profile(horse_name, horse_op_profile(op_fname, op_lname, op_id)), requested_at, request_status") \
                .execute()
            
            print(f"  Found {len(medreq_res.data or [])} medical record access requests")
            
            for req in (medreq_res.data or []):
                request_status = req.get("request_status","").lower()
                vet = req.get("vet_profile") or {}
                vet_name = f"{vet.get('vet_fname','')} {vet.get('vet_lname','')}".strip()
                
                horse_profile = req.get("horse_profile") or {}
                horse_name = horse_profile.get("horse_name","Unknown Horse")
                
                # Get horse owner info
                horse_op_profile = horse_profile.get("horse_op_profile") or {}
                horse_owner_name = f"{horse_op_profile.get('op_fname','')} {horse_op_profile.get('op_lname','')}".strip()
                horse_owner_id = horse_op_profile.get("op_id")
                
                if request_status == "pending":
                    print(f"    Processing pending medical request: Dr. {vet_name} for {horse_name}")
                    
                    # Notify ALL administrative users - EACH GETS THEIR OWN COPY
                    event_id = f"medreq_pending_{req['request_id']}"
                    notify_all_admins(
                        f"Medical record access requested by Dr. {vet_name} for {horse_name} (Owner: {horse_owner_name}).",
                        "medrec_request",
                        event_id,
                        req.get("requested_at")
                    )
                    
                elif request_status in ["approved", "declined"]:
                    print(f"    Processing medical request {request_status}: Dr. {vet_name} for {horse_name}")
                    
                    # Notify ALL administrative users - EACH GETS THEIR OWN COPY
                    event_id = f"medreq_{request_status}_{req['request_id']}_admin"
                    notify_all_admins(
                        f"Medical record request by Dr. {vet_name} for {horse_name} has been {request_status}.",
                        "medrec_status_update",
                        event_id,
                        req.get("requested_at")
                    )
                        
        except Exception as e:
            print(f"  Error: {e}")

        # ---------------- COMMENT NOTIFICATIONS ----------------
        print(f"\n[4] Checking COMMENT notifications...")
        try:
            comments_res = sr_client.table("comment") \
                .select("id, comment_text, comment_date, user_id, announcement_id") \
                .execute()
            
            print(f"  Found {len(comments_res.data or [])} total comments")
            
            for comment in (comments_res.data or []):
                commenter_id = comment.get("user_id")
                ann_id = comment.get("announcement_id")
                
                if not commenter_id or not ann_id:
                    continue
                
                # Fetch announcement owner and details
                try:
                    announcement_res = sr_client.table("announcement").select("*") \
                        .eq("announce_id", ann_id).execute()
                    
                    if not announcement_res.data:
                        continue
                    
                    announcement = announcement_res.data[0]
                    post_owner_id = announcement.get("user_id")
                    post_title = announcement.get("announce_title", "Untitled Post")
                    
                    if not post_owner_id or post_owner_id == commenter_id:
                        continue
                    
                except Exception as e:
                    continue

                # Get commenter name
                commenter_name = "Someone"
                try:
                    kutsero_res = sr_client.table("kutsero_profile") \
                        .select("kutsero_fname,kutsero_lname") \
                        .eq("kutsero_id", commenter_id).execute()
                    
                    if kutsero_res.data:
                        kutsero_data = kutsero_res.data[0]
                        commenter_name = f"{kutsero_data.get('kutsero_fname','')} {kutsero_data.get('kutsero_lname','')}".strip()
                    else:
                        op_res = sr_client.table("horse_op_profile") \
                            .select("op_fname,op_lname") \
                            .eq("op_id", commenter_id).execute()
                        
                        if op_res.data:
                            op_data = op_res.data[0]
                            commenter_name = f"{op_data.get('op_fname','')} {op_data.get('op_lname','')}".strip()
                        else:
                            # Check if vet
                            vet_res = sr_client.table("vet_profile") \
                                .select("vet_fname,vet_lname") \
                                .eq("vet_id", commenter_id).execute()
                            
                            if vet_res.data:
                                vet_data = vet_res.data[0]
                                commenter_name = f"Dr. {vet_data.get('vet_fname','')} {vet_data.get('vet_lname','')}".strip()
                except:
                    pass
                
                comment_text = comment.get('comment_text','')[:50]
                if len(comment.get('comment_text','')) > 50:
                    comment_text += "..."
                
                # Notify ALL administrative users about comment - EACH GETS THEIR OWN COPY
                event_id = f"comment_{comment['id']}_admin"
                notify_all_admins(
                    f"{commenter_name} commented '{comment_text}' on post: '{post_title}'",
                    "comment",
                    event_id,
                    comment.get("comment_date")
                )
                
                # Also notify post owner - THEY GET THEIR OWN COPY
                event_id = f"comment_{comment['id']}_owner"
                add_notification(
                    post_owner_id,
                    f"{commenter_name} commented: '{comment_text}' on your post '{post_title}'",
                    "comment",
                    event_id,
                    comment.get("comment_date")
                )
        except Exception as e:
            print(f"  Error: {e}")

        # ---------------- BULK INSERT ----------------
        print(f"\n[5] Inserting new notifications...")
        if notifications_to_insert:
            try:
                print(f"  Inserting {len(notifications_to_insert)} new notifications")
                
                # Insert in batches
                batch_size = 50
                inserted_count = 0
                for i in range(0, len(notifications_to_insert), batch_size):
                    batch = notifications_to_insert[i:i + batch_size]
                    result = sr_client.table("notification").insert(batch).execute()
                    inserted_count += len(batch)
                    print(f"    Inserted batch {i//batch_size + 1}: {len(batch)} notifications")
                
                print(f"  ✓ Successfully inserted {inserted_count} notifications")
            except Exception as e:
                print(f"  ✗ Error inserting: {e}")
        else:
            print(f"  No new notifications to insert")

        # ---------------- FETCH NOTIFICATIONS FOR CURRENT USER ----------------
        print(f"\n[6] Fetching notifications for CURRENT USER ({current_user_id})...")
        
        all_notifs_res = sr_client.table("notification").select("*") \
                            .eq("id", current_user_id) \
                            .order("notif_date", desc=True) \
                            .order("notif_time", desc=True) \
                            .execute()
        
        print(f"  Query result: {len(all_notifs_res.data or [])} notifications found")
        
        notifications = []
        for row in (all_notifs_res.data or []):
            try:
                date_str = row.get("notif_date", "")
                time_str = row.get("notif_time", "")
                
                # Handle time format
                if time_str and isinstance(time_str, str):
                    if len(time_str.split(':')) == 3:
                        time_part = time_str
                    else:
                        time_part = time_str + ":00"
                else:
                    time_part = "00:00:00"
                
                notifications.append({
                    "notif_id": row.get("notif_id"),
                    "user_id": row.get("id"),
                    "message": row.get("notif_message", "No message"),
                    "date": f"{date_str}T{time_part}+08:00",
                    "read": row.get("notif_read", False),
                    "type": row.get("notification_type","general")
                })
            except Exception as e:
                print(f"    Error processing notification: {e}")
                continue

        print(f"\n[7] FINAL RESULT for user {current_user_id}")
        print(f"  Total notifications: {len(notifications)}")
        
        # Show unread count
        unread_count = sum(1 for n in notifications if not n.get("read", True))
        print(f"  Unread notifications: {unread_count}")
        
        # Show notification types
        type_counts = {}
        for notif in notifications:
            notif_type = notif.get("type", "unknown")
            type_counts[notif_type] = type_counts.get(notif_type, 0) + 1
        
        for notif_type, count in type_counts.items():
            print(f"    {notif_type}: {count}")
        
        print(f"{'='*60}\n")
        
        return Response(notifications, status=200)

    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
# -------------------- MARK NOTIFICATION AS READ --------------------
@api_view(["POST"])
def mark_notification_read(request, notif_id):
    """
    Mark a specific notification as read for current user only.
    """
    try:
        current_user_id = get_current_user_id_internal(request)
        if not current_user_id:
            return Response({"error": "User not authenticated"}, status=401)
        
        # Check if notification exists and belongs to current user
        result = sr_client.table("notification") \
            .select("*") \
            .eq("notif_id", notif_id) \
            .eq("id", current_user_id) \
            .execute()

        if not result.data:
            return Response({"error": "Notification not found or access denied"}, status=404)

        # Update only if notification belongs to current user
        update_result = sr_client.table("notification").update({
            "notif_read": True
        }).eq("notif_id", notif_id).eq("id", current_user_id).execute()  # CHANGED: "user_id" to "id"

        if update_result.data:
            return Response({
                "success": True,
                "message": "Notification marked as read",
                "notif_id": notif_id,
                "user_id": current_user_id
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
    Mark all notifications as read for current user only.
    """
    try:
        current_user_id = get_current_user_id_internal(request)
        if not current_user_id:
            return Response({"error": "User not authenticated"}, status=401)
        
        # Update all unread notifications for current user only
        update_result = sr_client.table("notification").update({
            "notif_read": True
        }).eq("notif_read", False).eq("id", current_user_id).execute()  # CHANGED: "user_id" to "id"

        return Response({
            "success": True,
            "message": "All notifications marked as read",
            "user_id": current_user_id,
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
# -------------------- FETCH USERS (UPDATED) --------------------
@api_view(['GET'])
def fetch_users(request):
    try:
        # 1. Fetch CTU Vet Profiles
        ctu_profiles_res = sr_client.table("ctu_vet_profile").select("*").execute()
        
        # 2. Fetch DVMF Profiles
        dvmf_profiles_res = sr_client.table("dvmf_user_profile").select("*").execute()

        # 3. Get user statuses from central 'users' table
        users_res = sr_client.table("users").select("id, role, status").execute()
        users_map = {u["id"]: {"role": u["role"], "status": u["status"]} for u in users_res.data or []}

        profiles = []
        
        # 4. Process CTU Vet Profiles
        for p in ctu_profiles_res.data or []:
            user_data = users_map.get(p.get("ctu_id"), {})
            profiles.append({
                "id": p.get("ctu_id"),
                "ctu_fname": p.get("ctu_fname"),
                "ctu_lname": p.get("ctu_lname"),
                "ctu_email": p.get("ctu_email"),
                "ctu_phonenum": p.get("ctu_phonenum"),
                "role": user_data.get("role", "N/A"),
                "status": user_data.get("status", "pending"),
                "profile_type": "Ctu-Vetmed"
            })

        # 5. Process DVMF Profiles
        for p in dvmf_profiles_res.data or []:
            user_data = users_map.get(p.get("dvmf_id"), {})
            profiles.append({
                "id": p.get("dvmf_id"),
                "ctu_fname": p.get("dvmf_fname"),
                "ctu_lname": p.get("dvmf_lname"),
                "ctu_email": p.get("dvmf_email"),
                "ctu_phonenum": p.get("dvmf_phonenum"),
                "role": user_data.get("role", "N/A"),
                "status": user_data.get("status", "pending"),
                "profile_type": "Dvmf"
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




# -------------------- GET SOS REQUESTS --------------------
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
                "approved_by": "CTU-VET"
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
    





# -------------------- HORSE STATISTICS --------------------#

@api_view(["GET"])
def get_horse_statistics(request):
    try:
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        export_details = request.GET.get('export_details') == 'true'

        # Convert date strings to datetime objects
        date_from_dt = None
        date_to_dt = None
        
        if date_from:
            try:
                date_from_dt = datetime.strptime(date_from, "%Y-%m-%d").date()
            except:
                pass
        
        if date_to:
            try:
                date_to_dt = datetime.strptime(date_to, "%Y-%m-%d").date()
            except:
                pass

        print(f"[DEBUG] Date filters - From: {date_from_dt}, To: {date_to_dt}")

        # Get all status data from both tables
        try:
            # Get profile statuses
            profile_query = (
                sr_client.table("horse_profile")
                .select("horse_id, horse_name, horse_status, created_at, horse_op_profile(op_id, users(id, status))")
                .execute()
            )
            profile_rows = profile_query.data or []
        except Exception as db_error:
            print(f"[DEBUG] Database error: {db_error}")
            if export_details:
                return Response({"monthly_data": [], "sick_horses": []})
            return Response([])

        try:
            # Get medical record statuses
            med_query = (
                sr_client.table("horse_medical_record")
                .select("medrec_id, medrec_horse_id, medrec_horsestatus, medrec_date, medrec_diagnosis, horse_profile(horse_name, horse_op_profile(op_id, users(id, status)))")
                .execute()
            )
            med_rows = med_query.data or []
        except Exception as db_error:
            print(f"[DEBUG] Database error: {db_error}")
            med_rows = []

        # Filter out deactivated users and prepare status events
        status_events = []
        
        # Process profile statuses
        for profile in profile_rows:
            op_profile = profile.get("horse_op_profile")
            if not op_profile:
                continue
                
            user = op_profile.get("users")
            if not user or user.get("status", "").lower() == "deactivated":
                continue
            
            horse_status = (profile.get("horse_status") or "").strip().lower()
            if horse_status:
                created_at = profile.get("created_at")
                if created_at:
                    try:
                        event_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
                        # Apply date filter
                        if date_from_dt and event_date < date_from_dt:
                            continue
                        if date_to_dt and event_date > date_to_dt:
                            continue
                            
                        status_events.append({
                            "horse_id": profile.get("horse_id"),
                            "horse_name": profile.get("horse_name"),
                            "status": horse_status,
                            "date": event_date,
                            "source": "profile",
                            "diagnosis": ""
                        })
                    except Exception as e:
                        print(f"[DEBUG] Error parsing profile date: {e}")
                        continue

        # Process medical record statuses
        for med_record in med_rows:
            horse_profile = med_record.get("horse_profile")
            if not horse_profile:
                continue
                
            op_profile = horse_profile.get("horse_op_profile")
            if not op_profile:
                continue
                
            user = op_profile.get("users")
            if not user or user.get("status", "").lower() == "deactivated":
                continue
            
            med_status = (med_record.get("medrec_horsestatus") or "").strip().lower()
            if med_status:
                med_date = med_record.get("medrec_date")
                if med_date:
                    try:
                        if isinstance(med_date, str):
                            if 'T' in med_date:
                                event_date = datetime.fromisoformat(med_date.replace("Z", "+00:00")).date()
                            else:
                                event_date = datetime.strptime(med_date, "%Y-%m-%d").date()
                        else:
                            event_date = med_date
                            
                        # Apply date filter
                        if date_from_dt and event_date < date_from_dt:
                            continue
                        if date_to_dt and event_date > date_to_dt:
                            continue
                            
                        status_events.append({
                            "horse_id": med_record.get("medrec_horse_id"),
                            "horse_name": horse_profile.get("horse_name"),
                            "status": med_status,
                            "date": event_date,
                            "source": "medical",
                            "diagnosis": med_record.get("medrec_diagnosis") or ""
                        })
                    except Exception as e:
                        print(f"[DEBUG] Error parsing medical date: {e}")
                        continue

        print(f"[DEBUG] Total status events found: {len(status_events)}")

        # FIXED: Group by month and count ALL events (no deduplication)
        monthly_counts = {}
        
        for event in status_events:
            month_key = event["date"].strftime("%b %Y")
            
            if month_key not in monthly_counts:
                monthly_counts[month_key] = {
                    "healthy": 0,
                    "sick": 0, 
                    "deceased": 0,
                    "total": 0
                }
            
            # Categorize status - COUNT EVERY EVENT
            status = event["status"]
            if any(word in status for word in ["healthy", "normal", "good", "excellent"]):
                monthly_counts[month_key]["healthy"] += 1
            elif any(word in status for word in ["sick", "ill", "critical", "emergency"]):
                monthly_counts[month_key]["sick"] += 1
            elif any(word in status for word in ["deceased", "dead", "passed away", "died"]):
                monthly_counts[month_key]["deceased"] += 1
            
            monthly_counts[month_key]["total"] += 1

        # Convert to sorted list
        result = []
        for month_key, counts in monthly_counts.items():
            result.append({
                "month": month_key,
                "healthy": counts["healthy"],
                "sick": counts["sick"],
                "deceased": counts["deceased"],
                "total": counts["total"]
            })
        
        # Sort by month
        result.sort(key=lambda x: datetime.strptime(x["month"], "%b %Y"))
        
        # If no data, create empty entries for recent months
        if not result and not date_from_dt and not date_to_dt:
            current_date = datetime.now()
            for i in range(3):
                month_date = current_date.replace(day=1)
                for _ in range(i):
                    if month_date.month == 1:
                        month_date = month_date.replace(year=month_date.year-1, month=12)
                    else:
                        month_date = month_date.replace(month=month_date.month-1)
                
                month_label = month_date.strftime("%b %Y")
                result.append({
                    "month": month_label,
                    "healthy": 0,
                    "sick": 0,
                    "deceased": 0,
                    "total": 0
                })
            result.sort(key=lambda x: datetime.strptime(x["month"], "%b %Y"))

        print(f"[DEBUG] Final monthly data: {result}")

        # Prepare sick horses for export - INCLUDE ALL SICK EVENTS
        sick_horses_details = []
        if export_details:
            # Include ALL sick events (not just latest per horse)
            for event in status_events:
                status = event["status"]
                if any(word in status for word in ["sick", "ill", "critical", "emergency"]):
                    sick_horses_details.append({
                        "horse_name": event["horse_name"],
                        "diagnosis": event["diagnosis"] or "No diagnosis available",
                        "status": event["status"],
                        "month": event["date"].strftime("%b %Y")
                    })

            return Response({
                "monthly_data": result,
                "sick_horses": sick_horses_details
            })

        return Response(result)

    except Exception as e:
        print(f"[ERROR] in get_horse_statistics: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        if export_details:
            return Response({"monthly_data": [], "sick_horses": []})
        return Response([])








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
        print("✅ Comments fetched:", len(comments_data))

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



# -------------------- GET CURRENT USER --------------------
@api_view(["GET"])
@csrf_exempt
def get_current_user(request):
    """
    Retrieves the current authenticated user based on the Supabase access_token
    stored in the HttpOnly cookie.
    Works with both CTU Vet and DVMF profiles.
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

        # ---------------- Check CTU Vet profile ----------------
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

        # ---------------- If not found, check DVMF profile ----------------
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

        # ---------------- If not found anywhere ----------------
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
def get_current_ctu_id(request):
    """
    Extract the current ctu_id (vet identifier) from the access_token cookie.
    """
    access_token = request.COOKIES.get("access_token")
    if not access_token:
        return None

    try:
        # Decode token without verifying the signature — just to extract payload
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        return decoded.get("sub")  # 'sub' typically holds the CTU user ID
    except Exception:
        return None


# -------------------- API View --------------------
@api_view(["GET"])
@login_required
def ctu_vet_profile(request):
    """Fetch the profile of the currently logged-in CTU veterinarian"""
    try:
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        # ✅ Query the correct table using ctu_id
        res = sr_client.table("ctu_vet_profile").select("*").eq("ctu_id", ctu_id).execute()
        data = res.data or []

        if len(data) == 0:
            return Response({"error": "Profile not found"}, status=404)

        profile = data[0]

        # ✅ Build full name safely
        full_name = " ".join(filter(None, [
            profile.get("ctu_fname"),
            profile.get("ctu_lname"),
        ])).strip()

        profile["full_name"] = full_name

        return Response({"profile": profile}, status=200)

    except Exception:
        # ✅ Clean and safe fallback
        return Response({"error": "Internal server error"}, status=500)
    
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


@api_view(["PUT"])
@login_required
def mark_messages_as_read(request, conversation_id):
    """Mark messages as read for a conversation"""
    try:
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ Remove prints in production, but kept for debugging clarity
        print(f"Marking messages as read - ctu_id: {ctu_id}, conversation_id: {conversation_id}")

        # ✅ Use sr_client instead of supabase
        res = (
            sr_client.table("message")
            .update({"is_read": True})
            .eq("receiver_id", ctu_id)
            .eq("user_id", conversation_id)
            .eq("is_read", False)
            .execute()
        )

        updated_count = len(res.data) if res.data else 0
        print(f"Marked {updated_count} messages as read")

        return Response(
            {
                "message": "Messages marked as read",
                "updated_count": updated_count
            },
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
    """Send a message from the current CTU veterinarian to another user"""
    try:
        # ✅ Get current CTU ID from access token
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        receiver_id = data.get("receiver_id")
        message_content = data.get("message")

        if not receiver_id or not message_content:
            return Response({"error": "Missing receiver_id or message"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Use UTC timestamp; Postgres timestamptz will handle timezone correctly
        payload = {
            "mes_content": message_content,
            "is_read": False,
            "user_id": ctu_id,  # ✅ sender is the current CTU vet
            "receiver_id": receiver_id
        }

        # ✅ Use the correct Supabase client
        res = sr_client.table("message").insert(payload).execute()

        if not res.data:
            return Response({"error": "Failed to send message"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ✅ Format timestamp for frontend (convert UTC → Manila time)
        msg = res.data[0]
        msg_time = datetime.fromisoformat(msg["mes_date"])
        msg["mes_date"] = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")

        return Response(
            {"message": "Message sent successfully", "data": msg},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        # 🚫 No console output in production; clean safe fallback
        print("❌ Error sending message:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(["GET"])
@login_required
def get_conversation(request, conversation_id):
    """Fetch all messages between the current CTU user and a specific user safely, showing only local time (AM/PM)."""
    try:
        # ✅ Use CTU ID instead of vet_id
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        receiver_id = conversation_id

        # ✅ Fetch messages both directions (using sr_client)
        data1 = safe_execute(
            sr_client.table("message")
            .select("*")
            .eq("user_id", ctu_id)
            .eq("receiver_id", receiver_id)
        ).data or []

        data2 = safe_execute(
            sr_client.table("message")
            .select("*")
            .eq("user_id", receiver_id)
            .eq("receiver_id", ctu_id)
        ).data or []

        # ✅ Combine and sort by message date
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
                "isOwn": msg["user_id"] == ctu_id,
                "is_read": msg["is_read"],  # ✅ Include read status
                "originalTimestamp": msg["mes_date"],  # ✅ Include original UTC timestamp
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
    Get all conversations for the currently logged-in CTU veterinarian.
    Shows all users who have exchanged messages with the current user.
    """
    try:
        # ✅ Use CTU ID instead of president_id
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ Track unique conversation partners
        conversation_partners = set()

        # ✅ Users who sent messages to current CTU vet
        received_res = safe_execute(
            sr_client.table("message")
            .select("user_id")
            .eq("receiver_id", ctu_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])

        # ✅ Users who received messages from current CTU vet
        sent_res = safe_execute(
            sr_client.table("message")
            .select("receiver_id")
            .eq("user_id", ctu_id)
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

            # ✅ Get latest message between current CTU vet and user
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

            # ✅ Count unread messages
            unread_res = safe_execute(
                sr_client.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", ctu_id)
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
                last_message_is_own = latest_message["user_id"] == ctu_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"
                latest_message_datetime = datetime.min

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
        print("❌ Error fetching conversations:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(["GET"])
@login_required
def get_all_users(request):
    """Fetch all approved users (from all profile tables) except the current CTU Vetmed"""
    try:
        ctu_id = get_current_ctu_id(request)
        if not ctu_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f"Debug: Current ctu_id from token: {ctu_id}")

        # ✅ Step 1: Get all approved users except current user
        users_res = safe_execute(
            sr_client.table("users")
            .select("id, role, status")
            .eq("status", "approved")
            .neq("id", ctu_id)
        )

        users = users_res.data or []
        print(f"Debug: Found {len(users)} approved users (excluding current user)")

        if not users:
            return Response([], status=status.HTTP_200_OK)

        all_users = []
        role_groups = {}

        # ✅ Step 2: Group users by role
        for u in users:
            role_groups.setdefault(u["role"], []).append(u["id"])

        print(f"Debug: Role groups: {role_groups}")

        profiles_map = {}

        # 🩺 Veterinarian
        if "Veterinarian" in role_groups:
            ids = role_groups["Veterinarian"]
            res = safe_execute(
                sr_client.table("vet_profile")
                .select("vet_id, vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .in_("vet_id", ids)
            )
            print(f"Debug: Found {len(res.data or [])} Veterinarian profiles")
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
            print(f"Debug: Found {len(res.data or [])} Kutsero profiles")
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
            print(f"Debug: Found {len(res.data or [])} Horse Operator profiles")
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                profiles_map[p["op_id"]] = {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
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

        # 🎓 CTU Vetmed + CTU-Admin
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

        # ✅ Step 4: Merge user info
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

        print(f" Debug: Final user list: {len(all_users)} users")
        return Response(all_users, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error fetching users:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------- GET VETERINARIAN PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def vet_profile_by_id(request, user_id):
    """Fetch veterinarian profile by user ID for profile modal (debug version)"""
    try:
        current_ctu_id = get_current_ctu_id(request)
        if not current_ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Vet profile for user_id: {user_id}")
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
    """Fetch horse operator profile by user ID for profile modal (debug version)"""
    try:
        current_ctu_id = get_current_ctu_id(request)
        if not current_ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Horse Operator profile for user_id: {user_id}")
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
    """Fetch kutsero profile by user ID for profile modal (debug version)"""
    try:
        current_ctu_id = get_current_ctu_id(request)
        if not current_ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching Kutsero profile for user_id: {user_id}")
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
    """Fetch CTU veterinarian profile by user ID for profile modal"""
    try:
        current_ctu_id = get_current_ctu_id(request)
        if not current_ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"[DEBUG] Fetching CTU Vet profile for user_id: {user_id} (type: {type(user_id)})")
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
# -------------------- GET DVMF PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def dvmf_user_profile_by_id(request, user_id):
    """Fetch DVMF user profile by user ID for profile modal"""
    try:
        current_ctu_id = get_current_ctu_id(request)
        if not current_ctu_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Use the UUID string directly
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

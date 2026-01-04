
from django.http import JsonResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import datetime
import base64
import random
from datetime import datetime


supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY) 
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

# --------------------------------------------------------------- LOGIN WEB -------------------------------------------------------------------------------------------
# --------------------------------------------------------------- LOGIN WEB -------------------------------------------------------------------------------------------
@api_view(['POST'])
def login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # ---------------- 1️⃣ Authenticate with Supabase Auth ----------------
    login_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)
    if auth_response.status_code != 200:
        try:
            error_details = auth_response.json()
        except ValueError:
            error_details = {"message": auth_response.text}
        return Response({
            "error": "Invalid login credentials",
            "details": error_details
        }, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()
    access_token = auth_data.get("access_token")
    user_id = auth_data.get("user", {}).get("id")
    if not access_token or not user_id:
        return Response({"error": "Login failed: missing token or user id"}, status=status.HTTP_400_BAD_REQUEST)

    # ---------------- 2️⃣ Fetch user data from public.users ----------------
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    user_query = service_client.table("users").select("role, status, decline_reason").eq("id", user_id).execute()
    
    if not user_query.data:
        return Response({"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)
    
    role_info = user_query.data[0]
    user_role = role_info.get("role", "general").strip()
    user_status = role_info.get("status", "pending").strip().lower()
    decline_reason = role_info.get("decline_reason")

    # ---------------- 3️⃣ Block all declined/deactivated/suspended users ----------------
    blocked_statuses = ["declined", "deactivated", "suspended"]
    if user_status in blocked_statuses:
        error_msg = f"Your account is {user_status}."
        if user_status == "declined" and decline_reason:
            error_msg += f" Reason: {decline_reason}"
        return Response({"error": error_msg}, status=status.HTTP_403_FORBIDDEN)

    # ---------------- 4️⃣ Special case: pending veterinarians ----------------
    if user_role.lower() == "veterinarian" and user_status != "approved":
        return Response({
           "error": "Your account is pending approval. Please wait for administrator approval. Check your email for updates."
        }, status=status.HTTP_403_FORBIDDEN)

    print(f"[LOGIN] User ID: {user_id}, Role: {user_role}, Status: {user_status}")

    # ---------------- 5️⃣ Set HttpOnly cookie ----------------
    response = Response({
        "message": "Login successful",
        "role": user_role,
        "status": user_status,
    }, status=status.HTTP_200_OK)

    # Cookie expires in 1 day
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=86400
    )

    return response



@api_view(['GET'])
def check_email(request):
    email = request.GET.get('email', '').strip().lower()
    
    if not email:
        return Response({"exists": False}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)   
        users_list = service_client.auth.admin.list_users()
        user_exists = any(user.email.lower() == email for user in users_list)
        return Response({"exists": user_exists}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error checking email: {e}")
        return Response({"exists": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#-----------------------------------------------------------------SIGNUP VET WEB---------------------------------------------------------------------------------------
@api_view(['POST'])
def signup_vet(request):
    """
    Register a Veterinarian account with binary file uploads
    """
    import random
    import datetime
    import json
    import logging

    try:
        # ---------------- Get and Validate Inputs ----------------
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()

        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        username = request.data.get("username") or (
            f"{first_name.lower()}.{last_name.lower()}" if first_name and last_name else email.split('@')[0]
        )

        # ---------------- Step 1: Create Supabase Auth User ----------------
        user_response = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })

        if hasattr(user_response, "user") and hasattr(user_response.user, "id"):
            user_id = str(user_response.user.id)
        else:
            return Response({"error": "Failed to retrieve user ID from Supabase"}, status=status.HTTP_400_BAD_REQUEST)

        print(f"[DEBUG] Auth user created with ID: {user_id}")

        # ---------------- Step 2: Insert into public.users ----------------
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        user_payload = {
            "id": user_id,
            "role": "Veterinarian",
            "status": "pending",
            "created_at": datetime.datetime.utcnow().isoformat()
        }

        user_insert = requests.post(f"{SUPABASE_URL}/rest/v1/users", json=user_payload, headers=headers)
        if user_insert.status_code not in [200, 201]:
            print(f"[DEBUG] Failed inserting into public.users: {user_insert.text}")
            supabase_admin.auth.admin.delete_user(user_id)
            return Response({
                "error": "Failed to insert into users table",
                "details": user_insert.text
            }, status=status.HTTP_400_BAD_REQUEST)

        print(f"[DEBUG] public.users insert successful: {user_insert.json()}")

        # ---------------- Step 3: Handle File Uploads (BINARY) ----------------
        profile_photo_file = request.FILES.get('profile_photo')
        document_file = request.FILES.get('document')

        vet_profile_photo_url = None
        vet_documents_urls = []

        # ✅ Upload Profile Photo → 'vet_profile' bucket (BINARY)
        if profile_photo_file:
            try:
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = profile_photo_file.name.split('.')[-1] if '.' in profile_photo_file.name else 'jpg'
                file_name = f"{user_id}_profile_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
                # Read file content
                file_content = profile_photo_file.read()
                
                # Upload to Supabase bucket: vet_profile
                upload_res = sr_client.storage.from_("vet_profile").upload(
                    file_name,
                    file_content,
                    {"content-type": profile_photo_file.content_type}
                )

                public_url = sr_client.storage.from_("vet_profile").get_public_url(file_name)
                vet_profile_photo_url = public_url
                print(f"[DEBUG] Profile photo uploaded: {public_url}")
            except Exception as e:
                logging.exception(f"Profile photo upload failed: {e}")

        # ✅ Upload Document → 'vet_documents' bucket (BINARY)
        if document_file:
            try:
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = document_file.name.split('.')[-1] if '.' in document_file.name else 'pdf'
                file_name = f"{user_id}_doc_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
                # Read file content
                file_content = document_file.read()
                
                upload_res = sr_client.storage.from_("vet_documents").upload(
                    file_name,
                    file_content,
                    {"content-type": document_file.content_type}
                )

                public_url = sr_client.storage.from_("vet_documents").get_public_url(file_name)
                if public_url:
                    vet_documents_urls.append(public_url)
                print(f"[DEBUG] Document uploaded: {public_url}")
            except Exception as e:
                logging.exception(f"Document upload failed: {e}")

        # ---------------- Step 4: Handle Address Logic ----------------
        vet_address_is_clinic = request.data.get("vetAddressIsClinic", "true").lower() == "true"
        
        # If vet_address_is_clinic is True, use permanent address for clinic address
        if vet_address_is_clinic:
            clinic_province = request.data.get("province", "")
            clinic_city = request.data.get("city", "")
            clinic_barangay = request.data.get("barangay", "")
            clinic_street = request.data.get("street", "")
            clinic_zipcode = request.data.get("zipCode", "")
        else:
            clinic_province = request.data.get("clinicProvince", "")
            clinic_city = request.data.get("clinicCity", "")
            clinic_barangay = request.data.get("clinicBarangay", "")
            clinic_street = request.data.get("clinicStreet", "")
            clinic_zipcode = request.data.get("clinicZipCode", "")

        # ---------------- Step 5: Insert into vet_profile ----------------
        profile_payload = {
            "vet_id": user_id,
            "vet_fname": first_name or "",
            "vet_mname": request.data.get("middleName", "") or "",
            "vet_lname": last_name or "",
            "vet_dob": request.data.get("dob") or "0000-01-01",
            "vet_sex": request.data.get("sex") or "N/A",
            "vet_phone_num": request.data.get("phoneNumber") or "",
            "vet_street": request.data.get("street") or "",  # Can be null
            "vet_brgy": request.data.get("barangay") or "",
            "vet_city": request.data.get("city") or "",
            "vet_province": request.data.get("province") or "",
            "vet_zipcode": request.data.get("zipCode") or "",
            "vet_address_is_clinic": vet_address_is_clinic,
            "vet_clinic_street": clinic_street or "",  # Can be null
            "vet_clinic_brgy": clinic_barangay or "",  # Can be null
            "vet_clinic_city": clinic_city or "",  # Can be null
            "vet_clinic_province": clinic_province or "",  # Can be null
            "vet_clinic_zipcode": clinic_zipcode or "",  # Can be null
            "vet_email": email,
            "vet_license_num": request.data.get("licenseNumber") or "",
            "vet_exp_yr": int(request.data.get("yearsOfExperience") or 0),
            "vet_specialization": request.data.get("specialization") or "",
            "vet_org": request.data.get("affiliatedOrganization") or "",
            "vet_profile_photo": vet_profile_photo_url,
            "vet_documents": json.dumps(vet_documents_urls),
            "created_at": datetime.datetime.utcnow().isoformat()
        }

        profile_insert = requests.post(f"{SUPABASE_URL}/rest/v1/vet_profile", json=profile_payload, headers=headers)
        if profile_insert.status_code not in [200, 201]:
            print(f"[DEBUG] Failed inserting into vet_profile: {profile_insert.text}")
            # rollback previous inserts
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=headers)
            supabase_admin.auth.admin.delete_user(user_id)
            return Response({
                "error": "Failed to insert into vet_profile",
                "details": profile_insert.text
            }, status=status.HTTP_400_BAD_REQUEST)

        print(f"[DEBUG] vet_profile insert successful: {profile_insert.json()}")

        # ---------------- Step 6: Success ----------------
        return Response({
            "message": "Vet registration completed successfully. You will be notified via email once your account is approved.",
            "auth_user": {"id": user_id, "email": email},
            "user_record": user_insert.json(),
            "profile": profile_insert.json()
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"[ERROR] Exception in signup_vet: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
#-----------------------------------------------------------------LOGIN MOBILE---------------------------------------------------------------------------------------

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import requests
import base64
import random
import os

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

@api_view(['POST'])
def signup_mobile(request):
    """
    Mobile signup endpoint for Kutsero and Horse Operator registration
    """
    try:
        print(f"[DEBUG] ====== NEW SIGNUP REQUEST ======")
        data = request.data
        
        # Debug membership document
        membership_document_base64 = data.get("membershipDocument")
        membership_document_name = data.get("membershipDocumentName")
        membership_document_type = data.get("membershipDocumentType")
        
        print(f"[DEBUG] Membership document present: {bool(membership_document_base64)}")
        print(f"[DEBUG] Membership document name: {membership_document_name}")
        print(f"[DEBUG] Membership document type: {membership_document_type}")
        
        # Validate required fields
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")
        is_member = data.get("isMember")
        
        print(f"[DEBUG] Email: {email}")
        print(f"[DEBUG] Role: {role}")
        print(f"[DEBUG] Is Member: {is_member}")
        
        if not email or not password or not role:
            return Response(
                {"error": "Email, password, and role are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if membership document is required
        if is_member in ["yes", "no"] and not membership_document_base64:
            print("[DEBUG] Membership document is required but not provided")
            # For now, allow to proceed but warn
            print("[WARNING] Membership document not provided but membership info is set")
        
        # Generate username
        first_name = data.get("firstName", "").strip()
        last_name = data.get("lastName", "").strip()
        if first_name and last_name:
            username = f"{first_name.lower()}.{last_name.lower()}"
        else:
            username = email.split('@')[0]
        
        print(f"[DEBUG] Generated username: {username}")
        
        # Handle profile picture upload
        profile_picture_url = None
        profile_picture_base64 = data.get("profilePicture")
        
        if profile_picture_base64 and isinstance(profile_picture_base64, str) and profile_picture_base64.strip():
            try:
                print("[DEBUG] Processing profile picture upload")
                if ";base64," in profile_picture_base64:
                    format_part, imgstr = profile_picture_base64.split(";base64,")
                    ext = format_part.split("/")[-1]
                    
                    timestamp = int(datetime.now().timestamp())
                    file_name = f"profile_{email.split('@')[0]}_{timestamp}.{ext}"
                    bucket_name = "kutsero_op_profile"
                    
                    file_bytes = base64.b64decode(imgstr)
                    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_name}"
                    upload_headers = {
                        "apikey": SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                        "Content-Type": f"image/{ext}",
                    }
                    
                    upload_response = requests.post(upload_url, data=file_bytes, headers=upload_headers)
                    if upload_response.status_code in [200, 201]:
                        profile_picture_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
                        print(f"[DEBUG] Profile picture uploaded: {profile_picture_url}")
            except Exception as e:
                print(f"[ERROR] Profile picture upload failed: {e}")
                profile_picture_url = None
        
        # Handle membership document as IMAGE
        membership_document_url = None
        if membership_document_base64 and isinstance(membership_document_base64, str) and membership_document_base64.strip():
            try:
                print("[DEBUG] Processing membership document image upload")
                if ";base64," in membership_document_base64:
                    format_part, imgstr = membership_document_base64.split(";base64,")
                    ext = format_part.split("/")[-1]
                    
                    timestamp = int(datetime.now().timestamp())
                    file_name = f"membership_{email.split('@')[0]}_{timestamp}.{ext}"
                    
                    # Upload to documents bucket
                    bucket_name = "kutsero_documents"
                    
                    file_bytes = base64.b64decode(imgstr)
                    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_name}"
                    upload_headers = {
                        "apikey": SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                        "Content-Type": f"image/{ext}",
                    }
                    
                    upload_response = requests.post(upload_url, data=file_bytes, headers=upload_headers)
                    if upload_response.status_code in [200, 201]:
                        membership_document_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
                        print(f"[DEBUG] Membership document uploaded: {membership_document_url}")
                    else:
                        print(f"[ERROR] Membership document upload failed: {upload_response.text}")
            except Exception as e:
                print(f"[ERROR] Membership document upload failed: {e}")
                import traceback
                traceback.print_exc()
                membership_document_url = None
        
        # Create user in Supabase Auth
        print(f"[DEBUG] Creating Supabase Auth user for: {email}")
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }
        payload_auth = {
            "email": email, 
            "password": password,
            "email_confirm": True
        }
        
        auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
        auth_json = auth_response.json()
        
        if auth_response.status_code not in [200, 201]:
            print(f"[ERROR] Failed to create user: {auth_json}")
            return Response(
                {"error": "Failed to create user", "details": auth_json}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
        print(f"[DEBUG] Created user with ID: {user_id}")
        
        # Insert into users table
        membership_status = "pending"
        if is_member == "yes":
            membership_status = "pending_verification"
        elif is_member == "no":
            membership_status = "applied"
        
        user_payload = {
            "id": user_id,
            "role": role.capitalize(),
            "status": "pending",
            "membership_status": membership_status,
        }
        
        insert_user_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        user_insert_response = requests.post(insert_user_url, json=user_payload, headers=insert_headers)
        if user_insert_response.status_code not in [200, 201]:
            print(f"[ERROR] Failed to insert user: {user_insert_response.text}")
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
            return Response(
                {"error": "Failed to insert user"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare profile data
        current_time = datetime.utcnow().isoformat()
        
        if role.lower() == "kutsero":
            profile_payload = {
                "kutsero_id": user_id,
                "kutsero_username": username,
                "kutsero_email": email,
                "kutsero_fname": data.get("firstName", ""),
                "kutsero_mname": data.get("middleName", ""),
                "kutsero_lname": data.get("lastName", ""),
                "kutsero_dob": data.get("dob", ""),
                "kutsero_sex": data.get("sex", ""),
                "kutsero_phone_num": data.get("phoneNumber", ""),
                "kutsero_province": data.get("province", ""),
                "kutsero_city": data.get("city", ""),
                "kutsero_municipality": data.get("municipality", ""),
                "kutsero_brgy": data.get("barangay", ""),
                "kutsero_zipcode": data.get("zipCode", ""),
                "kutsero_image": profile_picture_url,
                "created_at": current_time,
                # Membership fields - store as TEXT/IMAGE URL
                "is_member": is_member == "yes",
                "membership_verified": False,
                "membership_document_url": membership_document_url,  # This is now an image URL
                "years_experience": data.get("yearsExperience"),
                "membership_status": membership_status,
            }
            
            insert_profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
            
        else:  # horse_operator
            profile_payload = {
                "op_id": user_id,
                "op_email": email,
                "op_fname": data.get("firstName", ""),
                "op_mname": data.get("middleName", ""),
                "op_lname": data.get("lastName", ""),
                "op_dob": data.get("dob", ""),
                "op_sex": data.get("sex", ""),
                "op_phone_num": data.get("phoneNumber", ""),
                "op_province": data.get("province", ""),
                "op_city": data.get("city", ""),
                "op_municipality": data.get("municipality", ""),
                "op_brgy": data.get("barangay", ""),
                "op_zipcode": data.get("zipCode", ""),
                "op_image": profile_picture_url,
                "created_at": current_time,
            }
            
            insert_profile_url = f"{SUPABASE_URL}/rest/v1/horse_op_profile"
        
        # Insert profile
        profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
        if profile_insert_response.status_code not in [200, 201]:
            print(f"[ERROR] Failed to insert profile: {profile_insert_response.text}")
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_headers)
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
            return Response(
                {"error": "Failed to insert profile"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Success response
        response_data = {
            "message": f"{role.capitalize()} registration completed successfully.",
            "user_id": user_id,
            "email": email,
            "role": role,
            "profile_picture": profile_picture_url,
            "membership_document": membership_document_url,  # This is the image URL
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"[EXCEPTION] Error in signup_mobile: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": "Internal server error", "details": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['POST'])
def login_mobile(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1️⃣ Authenticate with Supabase Auth
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)
    if auth_response.status_code != 200:
        try:
            error_details = auth_response.json()
        except ValueError:
            error_details = {"message": auth_response.text}
        return Response({
            "error": "Invalid login credentials",
            "details": error_details
        }, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()
    access_token = auth_data.get("access_token")
    refresh_token = auth_data.get("refresh_token")
    user = auth_data.get("user", {})
    user_id = user.get("id")

    if not access_token or not user_id:
        return Response({"error": "Login failed: missing token or user id"}, status=status.HTTP_400_BAD_REQUEST)

    # 2️⃣ Fetch role and status from public.users using service role key
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    user_query = service_client.table("users").select("role, status").eq("id", user_id).execute()
    
    if not user_query.data:
        return Response({"error": "User record not found in database"}, status=status.HTTP_404_NOT_FOUND)
    
    user_info = user_query.data[0]
    user_role = user_info.get("role", "").strip()
    user_status = user_info.get("status", "pending").strip()

    print(f"[MOBILE LOGIN] User ID: {user_id}, Role: {user_role}, Status: {user_status}")

    # 3️⃣ Verify this is a mobile user (Kutsero or Horse Operator only)
    if user_role not in ["Kutsero", "Horse Operator"]:
        return Response({
            "error": "This login is only for mobile users (Kutsero or Horse Operator)"
        }, status=status.HTTP_403_FORBIDDEN)

    # 4️⃣ Check if user is approved
    if user_status != "approved":
        return Response({
            "error": f"Account is {user_status}. Please wait for admin approval.",
            "user_status": user_status
        }, status=status.HTTP_403_FORBIDDEN)

    # 5️⃣ Fetch profile based on role
    profile = None
    try:
        if user_role == "Kutsero":
            profile_data = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
            profile = profile_data.data[0] if profile_data.data else None
            
        elif user_role == "Horse Operator":
            profile_data = service_client.table("horse_operator_profile").select("*").eq("operator_id", user_id).execute()
            profile = profile_data.data[0] if profile_data.data else None
            
    except Exception as e:
        print(f"Error fetching profile: {e}")

    # 6️⃣ Return successful response - MUST include user_role and user_status keys
    response_data = {
        "message": "Login successful",
        "user": user,
        "profile": profile,
        "role": user_role,                    # Exact value from database
        "user_role": user_role,               # Frontend expects this key
        "status": user_status,                # Exact value from database  
        "user_status": user_status,           # Frontend expects this key
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": auth_data.get('expires_in'),
        "token_type": auth_data.get('token_type', 'Bearer')
    }
    
    print(f"Mobile login successful for user {email} with role {user_role}")
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
def update_user_status(request):
    """Admin endpoint to update user status from 'pending' to 'approved' or other status"""
    user_id = request.data.get("user_id")
    new_status = request.data.get("status")  # e.g., "approved", "rejected", "suspended", etc.
    
    if not user_id or not new_status:
        return Response({"error": "user_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate status values (optional)
    valid_statuses = ["pending", "approved", "rejected", "suspended", "inactive"]
    if new_status not in valid_statuses:
        return Response({
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user status
    try:
        update_url = f"{SUPABASE_URL}/rest/v1/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        payload = {"status": new_status}
        
        response = requests.patch(f"{update_url}?id=eq.{user_id}", json=payload, headers=headers)
        response_json = response.json()
        
        if response.status_code in [200, 201]:
            return Response({
                "message": f"User status updated from pending to {new_status}",
                "data": response_json
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Failed to update user status",
                "details": response_json
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
       return Response({
    "error": "Failed to update user status",
    "details": str(e)
}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)








#-----------------------------------------------------------------FORGOT PASSWORD WEB---------------------------------------------------------------------------------------


@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required."},
                        status=status.HTTP_400_BAD_REQUEST)

    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    resp = requests.get(url, headers=headers)

    if not resp.ok:
        return Response({"error": "Failed to query Supabase."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = resp.json()
    users = data.get("users", [])

    # 👇 Check kung naa ba'y match sa email
    user = next((u for u in users if u.get("email") == email), None)

    if not user:
        return Response({"exists": False, "error": "Email not registered."},
                        status=status.HTTP_404_NOT_FOUND)

    return Response({"exists": True}, status=status.HTTP_200_OK)





@api_view(["POST"])
def reset_password(request):
    email = request.data.get("email")
    new_password = request.data.get("newPassword")

    if not email or not new_password:
        return Response({"error": "Email and new password are required."},
                        status=status.HTTP_400_BAD_REQUEST)

    # 1. Get all users from Supabase
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    resp = requests.get(url, headers=headers)
    if not resp.ok:
        return Response({"error": "Failed to query Supabase."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = resp.json()
    users = data.get("users", [])

    # 2. Find user by email
    user = next((u for u in users if u.get("email") == email), None)
    if not user:
        return Response({"error": "Email not registered."},
                        status=status.HTTP_404_NOT_FOUND)

    user_id = user.get("id")

    # 3. Update password
    update_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    payload = {"password": new_password}

    update_resp = requests.put(update_url, headers=headers, json=payload)

    if not update_resp.ok:
        return Response({"error": "Failed to reset password."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"success": True, "message": "Password reset successful."},
                    status=status.HTTP_200_OK)


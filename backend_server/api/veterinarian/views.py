from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from functools import wraps
from rest_framework import status
import jwt 
import uuid
import requests

# -------------------- SUPABASE CLIENT --------------------
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY

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
        return func(request, *args, **kwargs)
    return wrapper

# --------------- PROFILE -------------------------
def get_current_vet_id(request):
    """Extract current vet_id from access_token cookie"""
    access_token = request.COOKIES.get("access_token")
    if not access_token:
        return None
    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


@api_view(["GET"])
@login_required
def vet_profile(request):
    """Fetch the profile of the currently logged-in veterinarian"""
    try:
        # Extract vet_id from JWT
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Query vet_profile directly by vet_id
        res = supabase.table("vet_profile").select("*").eq("vet_id", vet_id).execute()

        if not res.data or len(res.data) == 0:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = res.data[0]

        # Add full_name
        full_name = " ".join(filter(None, [
            profile.get("vet_fname"),
            profile.get("vet_mname"),
            profile.get("vet_lname")
        ]))
        profile["full_name"] = full_name.strip()

        return Response({"profile": profile}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(["PUT"])
@login_required
def update_vet_profile(request):
    """Update the profile data for the logged-in vet"""
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    update_data = request.data

    # Only allow updating certain fields
    allowed_fields = [
        "vet_fname", "vet_mname", "vet_lname", "vet_phone_num", "vet_email",
        "vet_province", "vet_city", "vet_brgy", "vet_zipcode",
        "vet_specialization", "vet_org", "vet_license_num", "vet_exp_yr"
    ]
    data_to_update = {k: v for k, v in update_data.items() if k in allowed_fields}

    if not data_to_update:
        return Response({"error": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)

    result = supabase.table("vet_profile").update(data_to_update).eq("vet_id", current_vet_id).execute()

    if not result.data:
        return Response({"error": "Failed to update profile"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"message": "Profile updated successfully", "profile": result.data[0]}, status=status.HTTP_200_OK)

# -------------------- GET ALL RELEVANT APPOINTMENTS --------------------
@api_view(["GET"])
@login_required
def get_all_appointments(request):
    """
    Fetch all appointments for the logged-in veterinarian with statuses:
    pending, declined, or cancelled, including horse and operator info.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch appointments with statuses pending, declined, or cancelled
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num
                )
            )
            """
        ).eq("vet_id", vet_id).in_("app_status", ["approved","pending", "declined", "cancelled"]).execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        formatted_appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname")
            ]))
            operator_phone = operator.get("op_phone_num", "")

            formatted_appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": str(app.get("app_date")),
                "app_time": app.get("app_time"),
                "app_note": app.get("app_note"),
                "app_status": app.get("app_status"),
                "decline_reason": app.get("decline_reason", ""),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator_phone,
            })

        return Response({"appointments": formatted_appointments}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
        
# -------------------- GET APPROVED APPOINTMENTS --------------------
@api_view(["GET"])
@login_required
def get_approved_appointments(request):
    """
    Returns all approved appointments for the logged-in veterinarian,
    including past and upcoming appointments.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch approved appointments with horse + operator details
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num
                )
            )
            """
        ).eq("vet_id", vet_id).eq("app_status", "approved").execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname"),
            ]))

            appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": str(app.get("app_date")),
                "app_time": app.get("app_time"),
                "app_note": app.get("app_note"),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name.strip(),
                "operator_phone": operator.get("op_phone_num", ""),
            })

        return Response({"appointments": appointments}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- APPROVE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def approve_appointment(request, app_id):
    """
    Approve a pending appointment by updating its status to 'approved'.
    Only the vet assigned to the appointment can approve it.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to approve this appointment"}, status=403)

        # Only allow approval if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot approve an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status to approved
        update_res = supabase.table("appointment").update({"app_status": "approved"}).eq("app_id", app_id).execute()
        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment approved successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# -------------------- DECLINE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def decline_appointment(request, app_id):
    """
    Decline a pending appointment by updating its status to 'declined'.
    Only the vet assigned to the appointment can decline it.
    Expects JSON body: { "reason": "Vet reason or choice" }
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    reason = request.data.get("reason", "").strip()
    if not reason:
        return Response({"error": "Decline reason is required"}, status=400)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to decline this appointment"}, status=403)

        # Only allow declining if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot decline an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status and decline reason
        update_res = supabase.table("appointment").update({
            "app_status": "declined",
            "decline_reason": reason
        }).eq("app_id", app_id).execute()

        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment declined successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# -------------------- GET MEDICAL RECORDS FOR A HORSE --------------------
@api_view(["GET"])
@login_required
def get_horse_medical_records(request, horse_id):
    """
    Fetch all medical records for a specific horse
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch medical records for the horse
        res = supabase.table("horse_medrecord").select(
            """
            *,
            vet_profile:vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("horse_id", horse_id).order("medrec_date", desc=True).execute()

        if not res.data:
            return Response({"medicalRecords": []}, status=200)

        # Format the response
        formatted_records = []
        for record in res.data:
            vet = record.get("vet_profile", {}) or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname")
            ])).strip()
            
            formatted_records.append({
                "id": record.get("medrec_id"),
                "date": record.get("medrec_date"),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_bodytemp"),
                "concern": record.get("medrec_concern"),
                "clinicalSigns": record.get("medrec_clinical_sign"),
                "labResult": record.get("medrec_lab_results"),
                "labImage": record.get("medrec_lab_img"),
                "diagnosis": record.get("medrec_diagnosis"),
                "treatment": record.get("medrec_treatment"),
                "remarks": record.get("medrec_remark"),
                "veterinarian": vet_name or "Unknown Veterinarian"
            })

        return Response({"medicalRecords": formatted_records}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# -------------------- ADD MEDICAL RECORD --------------------
@api_view(["POST"])
@login_required
def add_medical_record(request):
    """
    Add a new medical record for a horse
    Expects JSON:
    {
      "horse_id": "uuid-string",
      "date": "2023-12-01",
      "heartRate": "40 bpm",
      "respRate": "16 breaths/min",
      "temperature": "100.5°F",
      "concern": "Lameness in front leg",
      "clinicalSigns": "Swelling in left foreleg",
      "labResult": "Normal blood work",
      "labImage": "url-to-image",
      "diagnosis": "Tendon strain",
      "treatment": "Rest and anti-inflammatory",
      "remarks": "Follow up in 2 weeks"
    }
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    data = request.data
    horse_id = data.get("horse_id")
    
    if not horse_id:
        return Response({"error": "Horse ID is required"}, status=400)

    # Validate required fields based on your database schema
    required_fields = [
        "date", "heartRate", "respRate", "temperature", 
        "concern", "clinicalSigns", "diagnosis", "treatment", "remarks"
    ]
    
    for field in required_fields:
        if not data.get(field):
            return Response({"error": f"{field} is required"}, status=400)

    try:
        # Insert the new medical record
        record_data = {
            "medrec_id": str(uuid.uuid4()),
            "medrec_date": data.get("date"),
            "medrec_heart_rate": data.get("heartRate"),
            "medrec_resp_rate": data.get("respRate"),
            "medrec_bodytemp": data.get("temperature"),
            "medrec_concern": data.get("concern"),
            "medrec_clinical_sign": data.get("clinicalSigns"),
            "medrec_lab_results": data.get("labResult", ""),
            "medrec_lab_img": data.get("labImage", ""),
            "medrec_diagnosis": data.get("diagnosis"),
            "medrec_treatment": data.get("treatment"),
            "medrec_remark": data.get("remarks"),
            "horse_id": horse_id,
            "vet_id": vet_id
        }

        res = supabase.table("horse_medrecord").insert(record_data).execute()

        if not res.data:
            return Response({"error": "Failed to add medical record"}, status=500)

        return Response({"message": "Medical record added successfully", "record": res.data[0]}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# -------------------- UPDATE GET_APPOINTMENT_DETAILS TO INCLUDE MEDICAL RECORDS --------------------
@api_view(["GET"])
@login_required
def get_appointment_details(request, app_id):
    """
    Fetch a single appointment by ID including horse info,
    owner info, and related medical records.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch appointment + horse + owner
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_id,
                horse_name,
                horse_breed,
                horse_dob,
                horse_age,
                horse_sex,
                horse_weight,
                horse_height,
                horse_color,
                horse_image,
                horse_op_profile:op_id(
                    op_id,
                    op_fname,
                    op_mname,
                    op_lname,
                    op_dob,
                    op_sex,
                    op_phone_num,
                    op_email,
                    op_province,
                    op_city,
                    op_municipality,
                    op_brgy,
                    op_zipcode,
                    op_house_add
                )
            )
            """
        ).eq("app_id", app_id).eq("vet_id", vet_id).execute()

        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]
        horse = appointment.get("horse_profile", {}) or {}
        owner = horse.get("horse_op_profile", {}) or {}
        horse_id = horse.get("horse_id")

        # Format horse info
        horse_info = {
            "id": horse_id,
            "name": horse.get("horse_name"),
            "breed": horse.get("horse_breed"),
            "dob": horse.get("horse_dob"),
            "age": horse.get("horse_age"),
            "sex": horse.get("horse_sex"),
            "weight": horse.get("horse_weight"),
            "height": horse.get("horse_height"),
            "color": horse.get("horse_color"),
            "image": horse.get("horse_image"),
        }

        # Format owner info
        owner_info = {
            "id": owner.get("op_id"),
            "firstName": owner.get("op_fname"),
            "middleName": owner.get("op_mname"),
            "lastName": owner.get("op_lname"),
            "dob": owner.get("op_dob"),
            "sex": owner.get("op_sex"),
            "phone": owner.get("op_phone_num"),
            "email": owner.get("op_email"),
            "address": f"{owner.get('op_house_add', '')}, {owner.get('op_brgy', '')}, "
                    f"{owner.get('op_municipality', '')}, {owner.get('op_city', '')}, "
                    f"{owner.get('op_province', '')}, {owner.get('op_zipcode', '')}"
        }

        # Fetch medical records for this horse
        med_records_res = supabase.table("horse_medrecord").select(
            """
            *,
            vet_profile:vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("horse_id", horse_id).order("medrec_date", desc=True).execute()

        medical_records = []
        if med_records_res.data:
            for record in med_records_res.data:
                vet = record.get("vet_profile", {}) or {}
                vet_name = " ".join(filter(None, [
                    vet.get("vet_fname"),
                    vet.get("vet_mname"),
                    vet.get("vet_lname")
                ])).strip()
                
                medical_records.append({
                    "id": record.get("medrec_id"),
                    "date": record.get("medrec_date"),
                    "heartRate": record.get("medrec_heart_rate"),
                    "respRate": record.get("medrec_resp_rate"),
                    "temperature": record.get("medrec_bodytemp"),
                    "concern": record.get("medrec_concern"),
                    "clinicalSigns": record.get("medrec_clinical_sign"),
                    "labResult": record.get("medrec_lab_results"),
                    "labImage": record.get("medrec_lab_img"),
                    "diagnosis": record.get("medrec_diagnosis"),
                    "treatment": record.get("medrec_treatment"),
                    "remarks": record.get("medrec_remark"),
                    "veterinarian": vet_name or "Unknown Veterinarian"
                })

        # 🚀 Return everything properly
        return Response(
            {
                "appointment": appointment,
                "horseInfo": horse_info,
                "ownerInfo": owner_info,
                "medicalRecords": medical_records
            },
            status=200,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)
        
# -------------------- SCHEDULE AVAILABILITY --------------------
@api_view(["POST"])
@login_required
def add_schedule(request):
    """
    Save vet availability schedule (multiple dates, multiple slots per date).
    Expects JSON:
    {
      "schedules": [
        {"date": "2025-09-20", "startTime": "9:00 AM", "endTime": "11:00 AM"},
        {"date": "2025-09-20", "startTime": "2:00 PM", "endTime": "5:00 PM"},
        {"date": "2025-09-21", "startTime": "9:00 AM", "endTime": "5:00 PM"}
      ]
    }
    """
    import uuid
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedules = request.data.get("schedules", [])
    if not schedules:
        return Response({"error": "No schedules provided"}, status=400)

    try:
        entries = []
        for sched in schedules:
            date = sched.get("date")
            start_time = sched.get("startTime")
            end_time = sched.get("endTime")
            if not date or not start_time or not end_time:
                continue  # skip invalid entries

            sched_time = f"{start_time} - {end_time}"

            # Insert into vet_schedule
            res = supabase.table("vet_schedule").insert({
                "sched_id": str(uuid.uuid4()),
                "vet_id": vet_id,
                "sched_date": date,
                "sched_time": sched_time,
                "is_available": True
            }).execute()

            if res.data:
                entries.append(res.data[0])

        if not entries:
            return Response({"error": "No valid schedules to add"}, status=400)

        return Response({"message": "Schedules added", "schedules": entries}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- GET VET SCHEDULES --------------------
@api_view(["GET"])
@login_required
def get_schedules(request):
    """
    Get all schedules for the logged-in vet.
    Returns a list of schedules with date and time, sorted by date.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch all schedules for this vet, ordered by sched_date
        res = supabase.table("vet_schedule")\
            .select("sched_date, sched_time, is_available")\
            .eq("vet_id", vet_id)\
            .order("sched_date")\
            .execute()

        schedules = res.data or []

        formatted_schedules = [
            {
                "date": s["sched_date"],
                "time": s["sched_time"],
                "is_available": s.get("is_available", True)
            }
            for s in schedules
        ]

        return Response({"schedules": formatted_schedules}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- GET VET SCHEDULES --------------------
@api_view(["GET"])
@login_required
def get_all_schedules(request):
    """
    Get all schedules for the logged-in vet.
    Returns a list of schedules with date, time, availability,
    and optional placeholders for service/horse_name/app_status.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch all schedules for this vet, ordered by sched_date
        res = supabase.table("vet_schedule")\
            .select("sched_id, sched_date, sched_time, is_available")\
            .eq("vet_id", vet_id)\
            .order("sched_date")\
            .execute()

        schedules = res.data or []

        # Map backend fields to frontend expected fields
        schedule_slots = [
            {
                "id": s.get("sched_id"),
                "date": s.get("sched_date"),
                "time": s.get("sched_time"),
                "available": s.get("is_available", True),
                "pending": False,        # Placeholder
                "service": None,         # Placeholder
                "horse_name": None,      # Placeholder
                "app_status": None       # Placeholder
            }
            for s in schedules
        ]

        return Response({"schedule_slots": schedule_slots}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

#-----------------CHANGE PASSWORD-------------------------
@api_view(["POST"])
@login_required
def change_password(request):
    """
    Change the password for the logged-in Kutsero President
    """
    try:
        # Get JWT token from cookies
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # Get current and new passwords from request
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Fetch the user's email from Supabase Admin API
        user_info = supabase.auth.admin.get_user_by_id(user_id)
        if not user_info.user or not user_info.user.email:
            return Response({"error": "Unable to fetch user email."}, status=500)

        vet_email = user_info.user.email

        # ✅ Verify current password using Supabase REST endpoint with SERVICE_ROLE_KEY
        resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            },
            json={"email": vet_email, "password": current_password}
        )
        verify_data = resp.json()
        if resp.status_code != 200 or "access_token" not in verify_data:
            return Response({"errors": {"current_password": "Incorrect current password"}}, status=400)

        # ✅ Update password using Admin API
        supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})

        return Response({"message": "Password updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from functools import wraps
from rest_framework import status
import jwt

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

# -------------------- GET ALL APPOINTMENTS --------------------
@api_view(["GET"])
@login_required
def get_all_appointments(request):
    """
    Fetch all appointments for the currently logged-in vet,
    including pending, declined, and cancelled.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Query all appointments for this vet (no status filter)
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
        ).eq("vet_id", vet_id).execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        # Format response
        formatted_appointments = []
        for app in res.data:
            horse = app.get("horse_profile", {})
            horse_name = horse.get("horse_name", "")
            horse_breed = horse.get("horse_breed", "")
            horse_age = horse.get("horse_age", "")
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [operator.get("op_fname"), operator.get("op_mname"), operator.get("op_lname")]))
            operator_phone = operator.get("op_phone_num", "")

            formatted_appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": app.get("app_date"),
                "app_time": app.get("app_time"),
                "app_note": app.get("app_note"),
                "app_status": app.get("app_status"),
                "decline_reason": app.get("decline_reason", ""),
                "horse_name": horse_name,
                "horse_breed": horse_breed,
                "horse_age": horse_age,
                "operator_name": operator_name,
                "operator_phone": operator_phone,
            })

        return Response({"appointments": formatted_appointments}, status=200)

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
    
# -------------------- MARK APPOINTMENT AS DELETED --------------------
@api_view(["PUT"])
@login_required
def delete_appointment(request, app_id):
    """
    Mark an appointment as deleted by updating its status to 'deleted'.
    Only the vet assigned to the appointment can perform this action.
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
            return Response({"error": "Not authorized to delete this appointment"}, status=403)

        # Only allow marking as deleted if status is declined or cancelled (optional)
        if appointment.get("app_status") not in ["declined", "cancelled"]:
            return Response({"error": f"Cannot delete an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status to deleted
        update_res = supabase.table("appointment").update({
            "app_status": "deleted"
        }).eq("app_id", app_id).execute()

        if not update_res.data:
            return Response({"error": "Failed to mark appointment as deleted"}, status=500)

        return Response({"message": "Appointment marked as deleted", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

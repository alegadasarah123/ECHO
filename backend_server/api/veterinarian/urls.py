from django.urls import path
from . import views

urlpatterns = [
    path("vet_profile/", views.vet_profile, name="vet_profile"),
    path("update_vet_profile/", views.update_vet_profile, name="update_vet_profile"),
    path("get_all_appointments/", views.get_all_appointments, name="get_all_appointments"),
    path("get_approved_appointments/", views.get_approved_appointments, name="get_approved_appointments"),
    path('approve_appointment/<uuid:app_id>/', views.approve_appointment, name='approve-appointment'),
    path('decline_appointment/<uuid:app_id>/', views.decline_appointment, name='decline-appointment'),
    path('get_horse_medical_records/<uuid:horse_id>/', views.get_horse_medical_records, name='get_horse_medical_records'),
    path('add_medical_record/', views.add_medical_record, name='add_medical_record'),
    path('get_appointment_details/<uuid:app_id>/', views.get_appointment_details, name='get_appointment_details'),
    path("get_all_schedules/", views.get_all_schedules, name="get_all_schedules"),
    path("add_schedule/", views.add_schedule, name="add_schedule"),
    path("get_schedules/", views.get_schedules, name="get_schedules"),
    path("change_password/", views.change_password, name="change_password")
]

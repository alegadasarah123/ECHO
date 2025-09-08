from django.urls import path
from . import views

urlpatterns = [
    path("vet_profile/", views.vet_profile, name="vet_profile"),
    path("update_vet_profile/", views.update_vet_profile, name="update_vet_profile"),
    path("get_all_appointments/", views.get_all_appointments, name="get_all_appointments"),
    path('approve_appointment/<uuid:app_id>/', views.approve_appointment, name='approve-appointment'),
    path('decline_appointment/<uuid:app_id>/', views.decline_appointment, name='decline-appointment'),
    path("delete_appointment/<uuid:app_id>/", views.delete_appointment, name="delete_appointment"),
]

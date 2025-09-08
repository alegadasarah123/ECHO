from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('get-vet-profiles/', views.get_vet_profiles, name='get-vet-profiles'),
    path('update-vet-status/<uuid:vet_profile_id>/', views.update_vet_status, name='update-vet-status'),
    path('recent-activity/', views.get_recent_activity, name='recent-activity'),
    path('status-counts/', views.get_status_counts, name='status-counts'),
    path('get_ctu_vet_profiles/', views.get_ctu_vet_profiles, name='get_ctu_vet_profiles'),
    path('save_ctu_vet_profile/', views.save_ctu_vet_profile, name='save_ctu_vet_profile'),
    # api/ctu_vetmed/urls.py
   path("ctu_change_password/", views.ctu_change_password, name="ctu_change_password"),


    path('get-users/', views.get_users, name='get-users'),
    path('get_vetnotifications/', views.get_vetnotifications, name='get_vetnotifications'),
    path('get_directory_profiles/', views.get_directory_profiles, name='get_directory_profiles'),
    path('display_ctu_profiles/', views.display_ctu_profiles, name='display_ctu_profiles'),
    path('get-account-counts/', views.get_account_counts, name='get_account_counts'),
    path('delete-vet-profile/<int:vet_id>/', views.delete_vet_profile, name='delete-vet-profile'),
    path('update_ctu_vet_profile/', views.update_ctu_vet_profile, name='update_ctu_vet_profile'),
    path('ctu-profiles/<uuid:profile_id>/', views.update_ctu_profile, name='update_ctu_profile'),
]

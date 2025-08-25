from django.urls import path
from . import views

urlpatterns = [
    path('api/signup/', views.signup, name='signup'),  # already has /api/
    path('api/get-vet-profiles/', views.get_vet_profiles, name='get-vet-profiles'),
  # urls.py
    path('api/update-vet-status/<uuid:vet_profile_id>/', views.update_vet_status, name='update-vet-status'),
    path('api/recent-activity/', views.get_recent_activity, name='recent-activity'),
    path('api/status-counts/', views.get_status_counts, name='status-counts'),
    path('api/get-ctu-vet-profiles/', views.get_ctu_vet_profiles, name='get-ctu-vet-profiles'),
    path('api/get-users/', views.get_users, name='get-users'),
    
]

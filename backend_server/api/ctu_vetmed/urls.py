from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('get-vet-profiles/', views.get_vet_profiles, name='get-vet-profiles'),
    path('update-vet-status/<uuid:vet_profile_id>/', views.update_vet_status, name='update-vet-status'),
    path('recent-activity/', views.get_recent_activity, name='recent-activity'),
    path('status-counts/', views.get_status_counts, name='status-counts'),
    path('get-ctu-vet-profiles/', views.get_ctu_vet_profiles, name='get-ctu-vet-profiles'),
    path('get-users/', views.get_users, name='get-users'),
]

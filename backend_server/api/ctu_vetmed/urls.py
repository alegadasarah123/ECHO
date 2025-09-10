from django.urls import path
from . import views

urlpatterns = [

     # -------------------- TEST --------------------
    path("test-cookie/", views.test_cookie, name="test_cookie"),
    path('signup/', views.signup, name='signup'),
   
    path('get-vet-profiles/', views.get_vet_profiles, name='get-vet-profiles'),
    path("update-vet-status/<str:vet_profile_id>/", views.update_vet_status, name="update-vet-status"),

    path('users/', views.fetch_users, name='fetch-users'), 
     path('users/deactivate/<str:user_id>/', views.deactivate_user, name='deactivate_user'),
    path('users/reactivate/<str:user_id>/', views.reactivate_user, name='reactivate_user'),
    path('users/delete/<str:user_id>/', views.delete_user, name='delete_user'),


    path('recent-activity/', views.get_recent_activity, name='recent-activity'),
    path('status-counts/', views.get_status_counts, name='status-counts'),
    path('get_ctu_vet_profiles/', views.get_ctu_vet_profiles, name='get_ctu_vet_profiles'),
    path('save_ctu_vet_profile/', views.save_ctu_vet_profile, name='save_ctu_vet_profile'),
    # api/ctu_vetmed/urls.py
     path("ctu_change_password/", views.ctu_change_password, name="ctu_change_password"),
# Delete directory user (same style as other paths)
    path('directory/<str:user_id>/', views.delete_directory_user, name='delete_directory_user'),


    path('get-users/', views.get_users, name='get-users'),
    path('get_vetnotifications/', views.get_vetnotifications, name='get_vetnotifications'),
        # urls.py
    path('get_directory_profiles/', views.get_directory_profiles, name='get_directory_profiles'),

    path('display_ctu_profiles/', views.display_ctu_profiles, name='display_ctu_profiles'),
    path('get-account-counts/', views.get_account_counts, name='get_account_counts'),
    # Use str:vet_id for UUID strings
    path('delete-vet-profile/<str:vet_id>/', views.delete_vet_profile, name='delete-vet-profile'),
    path('update_ctu_vet_profile/', views.update_ctu_vet_profile, name='update_ctu_vet_profile'),
    path('ctu-profiles/<uuid:profile_id>/', views.update_ctu_profile, name='update_ctu_profile'),

     # Messages
    path("messages/<int:user_id>/<int:receiver_id>/", views.get_messages, name="get_messages"),
    path("messages/send/", views.send_message, name="send_message"),

    # Vets search
    path("vets/search/", views.search_vets, name="search_vets"),

    # 🔹 Create announcement post
    path("create-post/", views.create_post, name="create_post"),
    # 🔹 Test endpoint: check if cookie is being sent
    path("test-cookie/", views.test_cookie, name="test_cookie"),
    path("announcements/", views.get_announcements, name="get_announcements"),
     path("search_vet/", views.search_vet, name="search_vet"),


]

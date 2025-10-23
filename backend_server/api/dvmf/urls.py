from django.urls import path
from . import views

urlpatterns = [

     # -------------------- TEST --------------------
    path("test-cookie/", views.test_cookie, name="test_cookie"),
    path('signup/', views.signup, name='signup'),
   
     path("get-vet-profiles/", views.get_vet_profiles, name="get_vet_profiles"),
    path("update-vet-status/<str:vet_profile_id>/", views.update_vet_status, name="update-vet-status"),

    path('users/', views.fetch_users, name='fetch-users'), 
     path('users/deactivate/<str:user_id>/', views.deactivate_user, name='deactivate_user'),
    path('users/reactivate/<str:user_id>/', views.reactivate_user, name='reactivate_user'),
   


    path('get_recent_activity/', views.get_recent_activity, name='get_recent_activity'),
    path("get_status_counts/", views.get_status_counts, name="get_status_counts"),
    path('get_dvmf_user_profiles/', views.get_dvmf_user_profiles, name='get_dvmf_user_profiles'),
    path('save_dvmf_user_profile/', views.save_dvmf_user_profile, name='save_dvmf_user_profile'),
    # api/ctu_vetmed/urls.py
     path("dvmf_change_password/", views.dvmf_change_password, name="dvmf_change_password"),



    path('get-users/', views.get_users, name='get-users'),
    path("get_vetnotifications/", views.get_vetnotifications, name="get_vetnotifications"),
        # urls.py
    path('get_directory_profiles/', views.get_directory_profiles, name='get_directory_profiles'),

    path('display_ctu_profiles/', views.display_ctu_profiles, name='display_ctu_profiles'),
   path('get-account-counts/', views.get_account_counts, name='get_account_counts'),
    # Use str:vet_id for UUID strings

    path('update_dvmf_user_profile/', views.update_dvmf_user_profile, name='update_dvmf_user_profile'),
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


    path("get_horses/", views.get_horses, name="get_horses"),
     
    path("get_sos_requests/", views.get_sos_requests, name="get_sos_requests"),

     path('medrec_access_requests/', views.get_access_requests, name='get_access_requests'),
      # 🔹 New endpoints for approve / decline
    path("access-requests/<uuid:request_id>/approve/", views.approve_access_request, name="approve_access_request"),
    path(
        "access-requests/<uuid:request_id>/decline/",
        views.decline_access_request,
        name="decline-access-request",
    ),
    
    path("mark_notification_read/<str:notif_id>/", views.mark_notification_read, name="mark_notification_read"),
    path("mark_all_notifications_read/", views.mark_all_notifications_read, name="mark_all_notifications_read"),
     path("edit_post/<uuid:post_id>/", views.edit_post, name="edit_post"),
    path("get_horse_statistics/", views.get_horse_statistics, name="get_horse_statistics"),
    path("add_comment/", views.add_comment, name="add_comment"),  # POST
    path("get_comments/", views.get_comments, name="get_comments"),
    path("add_reply/", views.add_reply, name="add_reply"),  # POST
    path("edit_reply/<uuid:reply_id>/", views.edit_reply, name="edit_reply"),
    path("edit_comment/<uuid:comment_id>/", views.edit_comment, name="edit_comment"),
    path("get_current_user/", views.get_current_user, name="get_current_user"),



    # -------------------- Messaging --------------------
     path("dvmf_user_profile/", views.dvmf_user_profile, name="dvmf_user_profile"),
    path('mark_messages_as_read/<uuid:conversation_id>/', views.mark_messages_as_read, name='mark_messages_as_read'),
    path("send_message/", views.send_message, name="send_message"),
    path("get_conversation/<uuid:conversation_id>/", views.get_conversation, name="get_conversation"),
    path("get_conversations/", views.get_conversations, name="get_conversations"),
    path("get_all_users/", views.get_all_users, name="get_all_users"),


     path('vet_profile_by_id/<uuid:user_id>/', views.vet_profile_by_id, name='vet_profile_by_id'),
     path('horse_operator_profile_by_id/<uuid:user_id>/', views.horse_operator_profile_by_id, name='horse_operator_profile_by_id'),

     path('kutsero_profile_by_id/<uuid:user_id>/', views.kutsero_profile_by_id, name='kutsero_profile_by_id'),
    path('ctu_vet_profile_by_id/<uuid:user_id>/', views.ctu_vet_profile_by_id, name='ctu_vet_profile_by_id'),
    path('dvmf_user_profile_by_id/<uuid:user_id>/', views.dvmf_user_profile_by_id, name='dvmf_user_profile_by_id'),

    
    


    

    
      

     


]

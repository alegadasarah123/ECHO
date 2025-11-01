from django.urls import path
from . import views

urlpatterns = [
    path("get_users/", views.get_users, name="get_users"),
    path("get_user_approvals/", views.get_user_approvals, name="get_user_approvals"),
    path("approve_user/<str:user_id>/", views.approve_user, name="approve_user"),
    path("decline_user/<str:user_id>/", views.decline_user, name="decline_user"),
    path("get_approved_counts/", views.get_approved_counts, name="get_approved_counts"),
    path("approve_all_users/", views.approve_all_users, name="approve_all_users"),
    path("get_approved_users/", views.get_approved_users, name="get_approved_users"),
    path("get_notifications/", views.get_notifications, name="get_notifications"),
    path("mark_notification_read/<str:notif_id>/", views.mark_notification_read, name="mark_notification_read"),
    path("mark_all_notifications_read/", views.mark_all_notifications_read, name="mark_all_notifications_read"),
    path("deactivate_user/<str:user_id>/", views.deactivate_user, name="deactivate_user"),
    path("reactivate_user/<str:user_id>/", views.reactivate_user, name="reactivate_user"),
    path("get_president_profile/", views.get_president_profile, name="get_president_profile"),
    path("save_president_profile/", views.save_president_profile, name="save_president_profile"),
    path("test_cookie/", views.test_cookie, name="test_cookie"),
    path("update_president_profile/", views.update_president_profile, name="update_president_profile"),
    path("change_password/", views.change_password, name="change_password"),
    path("send_message/", views.send_message, name="send_message"),
    path("get_conversations/", views.get_conversations, name="get_conversations"),
    path("get_conversation/<str:conversation_id>/", views.get_conversation, name="get_conversation"),
    path("mark_messages_as_read/<str:conversation_id>/", views.mark_messages_as_read, name="mark_messages_as_read"),
    path("get_all_users/", views.get_all_users, name="get_all_users"),
    path("kutsero_profile_by_id/<str:user_id>/", views.kutsero_profile_by_id, name="kutsero_profile_by_id"),
    path("horse_operator_profile/<str:user_id>/", views.horse_operator_profile, name="horse_operator_profile"),
    path("dvmf_profile_by_id/<str:user_id>/", views.dvmf_profile_by_id, name="dvmf_profile_by_id"),
    path("ctu_profile_by_id/<str:user_id>/", views.ctu_profile_by_id, name="ctu_profile_by_id")
]

from django.urls import path
from . import views

urlpatterns = [
    path("get_users/", views.get_users, name="get_users"),
    path("get_user_approvals/", views.get_user_approvals, name="get_user_approvals"),
    path("approve_user/<str:user_id>/", views.approve_user, name="approve_user"),
    path("decline_user/<str:user_id>/", views.decline_user, name="decline_user"),
    path("delete_declined_users/", views.delete_declined_users, name="delete_declined_users"),
    path("get_approved_counts/", views.get_approved_counts, name="get_approved_counts"),
    path("approve_all_users/", views.approve_all_users, name="approve_all_users"),
    path("get_approved_users/", views.get_approved_users, name="get_approved_users"),
    path("get_notifications/", views.get_notifications, name="get_notifications"),
    path("deactivate_user/<str:user_id>/", views.deactivate_user, name="deactivate_user"),
    path("delete_user/<str:user_id>/", views.delete_user, name="delete_user"),
    path("reactivate_user/<str:user_id>/", views.reactivate_user, name="reactivate_user"),
    path("get_president_profile/", views.get_president_profile, name="get_president_profile"),
    path("update_president_profile/", views.update_president_profile, name="update_president_profile"),
]

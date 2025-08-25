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
]

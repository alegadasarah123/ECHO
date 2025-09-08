from django.urls import path
from . import views

urlpatterns = [
    path("available_horses/", views.available_horses, name="available_horses"),
    path("assign_horse/", views.assign_horse, name="assign_horse"),
    path("end_assignment/<str:assignment_id>/", views.end_assignment, name="end_assignment"),
    path("current_assignment/", views.current_assignment, name="current_assignment"),
    path("test/", views.test_connection, name="test_connection"),

]

from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='kutsero-login'),
    path('signup/', views.signup, name='kutsero-signup'),
]
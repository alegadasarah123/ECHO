from django.urls import path
from .import views  # Import views from your api app

urlpatterns = [
    path('data/', views.get_data, name='get_data'),  # GET Kutsero profiles
    path('insert-profile/', views.insert_kutsero_profile, name='insert_kutsero_profile'),  # POST profile
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),  # POST login
]
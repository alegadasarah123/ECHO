from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('vet-profile/', views.insert_vet_profile, name='insert_vet_profile'),
    path('get-data/', views.get_data, name='get_data'),
    path('login/', views.login, name='login')
]

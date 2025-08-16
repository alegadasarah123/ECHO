from django.urls import path  # include needed only if using include()
from api import views  # adjust 'api' to your actual app name

urlpatterns = [
    # If you want to include all app URLs:
    # path('api/', include('api.urls')),

    # Direct paths to views:
    path('signup/', views.signup, name='signup'),
    path('login/', views.user_login, name='login'),
    path("get-vet-profiles/", views.get_vet_profiles, name="get_vet_profiles"),

]

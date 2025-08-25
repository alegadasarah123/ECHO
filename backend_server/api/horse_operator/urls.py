from django.urls import path
from . import views    # <- don’t forget this

urlpatterns = [
    path('add_horse/', views.add_horse, name='add_horse'),
    path('get_horses/', views.get_horses, name='get_horses'),
]

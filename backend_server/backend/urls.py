from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/kutsero/', include('api.kutsero.urls')),  # Important
    path('admin/', admin.site.urls),
    path('api/kutsero/', include('api.kutsero.urls')),  
    path('', include('api.urls')),
    path('api/horse_operator/', include('api.horse_operator.urls')),  # Include horse operator URLs
]

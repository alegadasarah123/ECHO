from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/kutsero/', include('api.kutsero.urls')),  
    path('', include('api.urls')),
    path("api/kutsero_president/", include("api.kutsero_president.urls")),

]

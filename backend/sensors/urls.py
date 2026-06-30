from django.urls import path
from . import views

urlpatterns = [
    path('sensors/data/', views.receive_sensor_data, name='sensor-data'),
    path('sensors/latest/', views.latest_readings, name='sensor-latest'),
    path('sensors/history/', views.reading_history, name='sensor-history'),
]
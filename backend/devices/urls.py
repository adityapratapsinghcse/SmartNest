from django.urls import path
from . import views

urlpatterns = [
    path('devices/', views.device_list, name='device-list'),
    path('commands/send/', views.send_command, name='command-send'),
    path('commands/pending/', views.pending_commands, name='command-pending'),
    path('commands/ack/', views.ack_command, name='command-ack'),
    path('access/verify/', views.verify_access, name='access-verify'),
    path('access/log/', views.access_log_list, name='access-log'),
    path('energy/daily/', views.energy_daily, name='energy-daily'),
    path('register-token/', views.register_fcm_token, name='register-fcm-token'),
]
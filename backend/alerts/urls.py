from django.urls import path
from . import views

urlpatterns = [
    path('alerts/', views.alert_list, name='alert-list'),
    path('alerts/read/', views.mark_alert_read, name='alert-read'),
]
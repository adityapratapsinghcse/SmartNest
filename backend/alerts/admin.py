from django.contrib import admin
from .models import Alert, DeviceToken


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['type', 'severity', 'is_read', 'timestamp']
    list_filter = ['type', 'severity', 'is_read']


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ['platform', 'token', 'created_at', 'last_active']
    list_filter = ['platform']
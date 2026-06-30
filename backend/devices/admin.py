from django.contrib import admin
from .models import Device, Command, AccessLog, EnergyLog


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'location', 'is_online', 'last_seen']
    list_filter = ['type', 'is_online']


@admin.register(Command)
class CommandAdmin(admin.ModelAdmin):
    list_display = ['device', 'action', 'status', 'created_at', 'executed_at']
    list_filter = ['status']


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ['method', 'rfid_uid', 'granted', 'timestamp']
    list_filter = ['method', 'granted']


@admin.register(EnergyLog)
class EnergyLogAdmin(admin.ModelAdmin):
    list_display = ['device', 'date', 'on_duration_mins', 'estimated_kwh']
    list_filter = ['date']
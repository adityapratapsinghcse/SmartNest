from django.contrib import admin
from .models import SensorReading


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['device', 'sensor_type', 'value', 'unit', 'timestamp']
    list_filter = ['sensor_type', 'device']
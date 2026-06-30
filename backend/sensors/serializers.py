from rest_framework import serializers
from .models import SensorReading


class SensorReadingSerializer(serializers.ModelSerializer):
    """Used when the ESP32 POSTs new readings — device is passed as an id."""
    class Meta:
        model = SensorReading
        fields = ['id', 'device', 'sensor_type', 'value', 'unit', 'timestamp']
        read_only_fields = ['timestamp']


class SensorReadingDetailSerializer(serializers.ModelSerializer):
    """Used when the frontend reads data back — includes the device name for display."""
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = SensorReading
        fields = ['id', 'device', 'device_name', 'sensor_type', 'value', 'unit', 'timestamp']
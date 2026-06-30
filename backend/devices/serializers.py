from rest_framework import serializers
from .models import Device, Command, AccessLog, EnergyLog


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'name', 'type', 'location', 'is_online', 'last_seen']
        read_only_fields = ['last_seen']


class CommandSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = Command
        fields = [
            'id', 'device', 'device_name', 'action', 'payload',
            'status', 'created_at', 'executed_at',
        ]
        read_only_fields = ['status', 'created_at', 'executed_at']


class CommandAckSerializer(serializers.Serializer):
    """Not tied to a model — used only by the ESP32 to confirm it ran a command."""
    command_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['executed', 'failed'])


class AccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessLog
        fields = ['id', 'rfid_uid', 'method', 'granted', 'timestamp']
        read_only_fields = ['timestamp']


class EnergyLogSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = EnergyLog
        fields = ['id', 'device', 'device_name', 'on_duration_mins', 'estimated_kwh', 'date']
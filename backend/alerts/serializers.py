from rest_framework import serializers
from .models import Alert, DeviceToken


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['id', 'type', 'severity', 'message', 'is_read', 'timestamp']
        read_only_fields = ['timestamp']


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'platform', 'created_at', 'last_active']
        read_only_fields = ['created_at', 'last_active']
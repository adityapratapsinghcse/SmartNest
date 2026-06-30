from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import SensorReading
from .serializers import SensorReadingDetailSerializer


@receiver(post_save, sender=SensorReading)
def broadcast_sensor_reading(sender, instance, created, **kwargs):
    if not created:
        return
    channel_layer = get_channel_layer()
    data = SensorReadingDetailSerializer(instance).data
    async_to_sync(channel_layer.group_send)(
        'sensors',
        {'type': 'sensor.message', 'data': data},
    )
from django.db import models
from devices.models import Device


class SensorReading(models.Model):
    SENSOR_TYPES = [
        ('temperature', 'Temperature (DHT11)'),
        ('humidity', 'Humidity (DHT11)'),
        ('distance', 'Distance (HC-SR04)'),
        ('motion', 'Motion (PIR)'),
        ('gas_mq2', 'Gas/Smoke (MQ-2)'),
        ('gas_mq7', 'Carbon Monoxide (MQ-7)'),
        ('flame', 'Flame Sensor'),
        ('light', 'Light Level (LDR)'),
        ('door_state', 'Door/Window (Reed Switch)'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='readings')
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPES)
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['sensor_type', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.sensor_type}: {self.value}{self.unit} @ {self.timestamp:%H:%M:%S}"
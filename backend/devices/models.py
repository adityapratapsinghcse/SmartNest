from django.db import models


class Device(models.Model):
    DEVICE_TYPES = [
        ('esp32_main', 'ESP32 Main Board'),
        ('door_lock', 'Door Lock (Servo)'),
        ('fan', 'Fan (Relay)'),
        ('light', 'Light (Relay)'),
        ('ventilation', 'Ventilation Fan (Relay)'),
        ('buzzer', 'Buzzer'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=30, choices=DEVICE_TYPES, default='other')
    location = models.CharField(max_length=100, blank=True)
    is_online = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class Command(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('executed', 'Executed'),
        ('failed', 'Failed'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='commands')
    action = models.CharField(max_length=50, help_text="e.g. 'unlock_door', 'fan_on', 'light_off'")
    payload = models.JSONField(default=dict, blank=True, help_text="Extra parameters for the action")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} -> {self.device.name} [{self.status}]"


class AccessLog(models.Model):
    METHOD_CHOICES = [
        ('rfid', 'RFID Card'),
        ('keypad', 'Keypad PIN'),
    ]

    rfid_uid = models.CharField(max_length=50, blank=True, help_text="Card UID, blank if keypad entry")
    method = models.CharField(max_length=10, choices=METHOD_CHOICES)
    granted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        status = "GRANTED" if self.granted else "DENIED"
        return f"{self.method} {status} at {self.timestamp:%Y-%m-%d %H:%M}"


class EnergyLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='energy_logs')
    on_duration_mins = models.FloatField(default=0)
    estimated_kwh = models.FloatField(default=0)
    date = models.DateField()

    class Meta:
        ordering = ['-date']
        unique_together = ['device', 'date']

    def __str__(self):
        return f"{self.device.name} - {self.date} ({self.estimated_kwh} kWh)"
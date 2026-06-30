from django.db import models


class Alert(models.Model):
    ALERT_TYPES = [
        ('gas_leak', 'Gas Leak'),
        ('fire', 'Fire'),
        ('co_detected', 'Carbon Monoxide Detected'),
        ('intrusion', 'Intrusion / Unauthorized Access'),
        ('water_leak', 'Water Leak'),
        ('door_open', 'Door/Window Opened'),
        ('anomaly', 'ML Anomaly Detected'),
        ('system', 'System Status'),
    ]

    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='low')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.type}: {self.message[:50]}"


class DeviceToken(models.Model):
    """
    Firebase Cloud Messaging tokens for phones running the mobile app.
    Used in Phase 4 to push notifications even when the app is closed.
    """
    PLATFORM_CHOICES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web'),
    ]

    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES, default='android')
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.platform} token ({self.token[:12]}...)"
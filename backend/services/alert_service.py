from django.utils import timezone
from datetime import timedelta
from alerts.models import Alert


class AlertService:
    @staticmethod
    def create_alert(alert_type, severity, message):
        return Alert.objects.create(type=alert_type, severity=severity, message=message)

    @staticmethod
    def create_alert_if_not_recent(alert_type, severity, message, within_minutes=5):
        """
        Prevents alert spam: if an alert of the same type was created
        within `within_minutes`, skip creating a new one and return None.
        Otherwise create and return the new Alert.
        """
        cutoff = timezone.now() - timedelta(minutes=within_minutes)
        recent_exists = Alert.objects.filter(
            type=alert_type,
            timestamp__gte=cutoff,
        ).exists()

        if recent_exists:
            return None

        return Alert.objects.create(
            type=alert_type,
            severity=severity,
            message=message,
        )
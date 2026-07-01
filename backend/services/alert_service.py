from django.utils import timezone
from datetime import timedelta
from alerts.models import Alert
from alerts.fcm import send_push_to_all_devices


class AlertService:
    @staticmethod
    def create_alert(alert_type, severity, message):
        return Alert.objects.create(type=alert_type, severity=severity, message=message)

    @staticmethod
    def create_alert_if_not_recent(alert_type, severity, message, within_minutes=5):
        cutoff = timezone.now() - timedelta(minutes=within_minutes)
        recent_exists = Alert.objects.filter(
            type=alert_type,
            timestamp__gte=cutoff,
        ).exists()

        if recent_exists:
            return None

        alert = Alert.objects.create(
            type=alert_type,
            severity=severity,
            message=message,
        )

        # Fire phone push — never let this crash the request
        try:
            send_push_to_all_devices(
                title=f"SmartNest — {severity.upper()} Alert",
                body=message,
                data={"alert_id": alert.id, "type": alert_type, "severity": severity},
            )
        except Exception as e:
            print(f"[FCM] Push dispatch failed: {e}")

        return alert
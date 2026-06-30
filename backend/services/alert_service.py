from alerts.models import Alert


class AlertService:
    @staticmethod
    def create_alert(alert_type, severity, message):
        return Alert.objects.create(type=alert_type, severity=severity, message=message)
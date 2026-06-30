from celery import shared_task
from django.utils import timezone


@shared_task
def ping():
    return "pong from Celery"


@shared_task
def heartbeat():
    """
    Runs every minute via Celery Beat. For now it just logs a timestamp —
    this is the same task slot that Step 2.8.6 will extend into real
    device-offline detection (checking Device.last_seen against
    SMARTNEST_CONFIG['DEVICE_OFFLINE_AFTER_SECONDS']).
    """
    now = timezone.now()
    print(f"[heartbeat] SmartNest backend alive at {now.isoformat()}")
    return f"heartbeat at {now.isoformat()}"
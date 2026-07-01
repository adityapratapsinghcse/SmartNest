import json
import requests
from django.conf import settings
from devices.models import Device


FCM_SEND_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"


def _get_access_token():
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request

    if not settings.FCM_PROJECT_ID:
        return None

    try:
        creds = service_account.Credentials.from_service_account_file(
            settings.FCM_SERVICE_ACCOUNT_PATH,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"],
        )
        creds.refresh(Request())
        return creds.token
    except Exception as e:
        print(f"[FCM] Failed to get access token: {e}")
        return None


def send_push_to_all_devices(title, body, data=None):
    """
    Sends a push notification to every device with a registered fcm_token.
    Fails silently (logs only) so a notification failure never breaks
    the sensor-data request that triggered it.
    """
    tokens = list(
        Device.objects.exclude(fcm_token__isnull=True)
        .exclude(fcm_token="")
        .values_list("fcm_token", flat=True)
    )
    if not tokens:
        print("[FCM] No registered device tokens — skipping push.")
        return

    access_token = _get_access_token()
    if not access_token:
        print("[FCM] No access token — skipping push.")
        return

    url = FCM_SEND_URL.format(project_id=settings.FCM_PROJECT_ID)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    for token in tokens:
        message = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
                "data": {k: str(v) for k, v in (data or {}).items()},
                "android": {"priority": "high"},
                "apns": {"headers": {"apns-priority": "10"}},
            }
        }
        try:
            resp = requests.post(url, headers=headers, data=json.dumps(message), timeout=8)
            if resp.status_code != 200:
                print(f"[FCM] Push failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"[FCM] Push request error: {e}")
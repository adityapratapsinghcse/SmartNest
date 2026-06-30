from django.urls import re_path
from devices.consumers import SensorConsumer, AlertConsumer

websocket_urlpatterns = [
    re_path(r'ws/sensors/$', SensorConsumer.as_asgi()),
    re_path(r'ws/alerts/$', AlertConsumer.as_asgi()),
]
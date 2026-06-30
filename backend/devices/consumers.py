import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SensorConsumer(AsyncWebsocketConsumer):
    """Handles ws/sensors/ — every connected client joins the 'sensors' group."""
    group_name = 'sensors'

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def sensor_message(self, event):
        """Called automatically when something group_sends with type='sensor.message'."""
        await self.send(text_data=json.dumps(event['data']))


class AlertConsumer(AsyncWebsocketConsumer):
    """Handles ws/alerts/ — every connected client joins the 'alerts' group."""
    group_name = 'alerts'

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def alert_message(self, event):
        await self.send(text_data=json.dumps(event['data']))
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Device, Command, AccessLog, EnergyLog
from .serializers import (
    DeviceSerializer, CommandSerializer, CommandAckSerializer,
    AccessLogSerializer, EnergyLogSerializer,
)

# Replace these with your real card UIDs / PIN once you've scanned them in Wokwi.
# Later this can move to the database (a proper "credentials" table) instead of code —
# fine for now since you only have 2 cards.
VALID_RFID_UIDS = ['A1B2C3D4', 'E5F6A7B8']
VALID_PINS = ['1234']


@api_view(['GET'])
def device_list(request):
    """GET /api/devices/ — list all registered devices."""
    devices = Device.objects.all()
    return Response(DeviceSerializer(devices, many=True).data)


@api_view(['POST'])
def send_command(request):
    """
    POST /api/commands/send/
    Frontend queues a command for a device.
    Body: { "device": 1, "action": "fan_on", "payload": {} }
    """
    serializer = CommandSerializer(data=request.data)
    if serializer.is_valid():
        command = serializer.save(status='pending')
        return Response(CommandSerializer(command).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def pending_commands(request):
    """GET /api/commands/pending/?device=1 — ESP32 polls this every few seconds."""
    device_id = request.query_params.get('device')
    commands = Command.objects.filter(status='pending')
    if device_id:
        commands = commands.filter(device_id=device_id)
    return Response(CommandSerializer(commands, many=True).data)


@api_view(['POST'])
def ack_command(request):
    """
    POST /api/commands/ack/
    ESP32 confirms it ran a command.
    Body: { "command_id": 1, "status": "executed" }
    """
    from django.utils import timezone
    serializer = CommandAckSerializer(data=request.data)
    if serializer.is_valid():
        try:
            command = Command.objects.get(id=serializer.validated_data['command_id'])
        except Command.DoesNotExist:
            return Response({'error': 'Command not found'}, status=status.HTTP_404_NOT_FOUND)
        command.status = serializer.validated_data['status']
        command.executed_at = timezone.now()
        command.save()
        return Response(CommandSerializer(command).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def verify_access(request):
    """
    POST /api/access/verify/
    Body: { "method": "rfid", "rfid_uid": "A1B2C3D4" }  OR
          { "method": "keypad", "pin": "1234" }
    The backend decides granted/denied — ESP32 should only unlock the
    servo if this response's "granted" field is true.
    """
    method = request.data.get('method')
    rfid_uid = request.data.get('rfid_uid', '')
    pin = request.data.get('pin', '')

    if method == 'rfid':
        granted = rfid_uid in VALID_RFID_UIDS
    elif method == 'keypad':
        granted = pin in VALID_PINS
    else:
        return Response({'error': 'method must be "rfid" or "keypad"'}, status=status.HTTP_400_BAD_REQUEST)

    log = AccessLog.objects.create(rfid_uid=rfid_uid, method=method, granted=granted)
    return Response(AccessLogSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def energy_daily(request):
    """GET /api/energy/daily/?device=1 — energy logs, most recent first."""
    device_id = request.query_params.get('device')
    logs = EnergyLog.objects.all()
    if device_id:
        logs = logs.filter(device_id=device_id)
    return Response(EnergyLogSerializer(logs, many=True).data)
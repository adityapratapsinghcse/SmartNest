from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from devices.models import Device
from .models import SensorReading
from .serializers import SensorReadingSerializer, SensorReadingDetailSerializer
from services.sensor_service import SensorService
from services.alert_service import AlertService


@api_view(['POST'])
def receive_sensor_data(request):
    """
    POST /api/sensors/data/
    ESP32 posts one reading at a time.
    After saving, runs threshold check and creates an Alert if needed.
    """
    serializer = SensorReadingSerializer(data=request.data)
    if serializer.is_valid():
        reading = SensorService.process_reading(serializer.validated_data)

        # Threshold check — creates Alert (and triggers WebSocket + FCM) if exceeded.
        # Falls back gracefully if check_thresholds returns None (normal reading).
        breach = SensorService.check_thresholds(reading)
        if breach:
            sensor = breach['exceeded']
            value  = breach['value']

            severity_map = {
                'temperature': 'high',
                'gas_mq2':     'critical',
                'gas_mq7':     'critical',
            }
            type_map = {
                'temperature': 'anomaly',
                'gas_mq2':     'gas_leak',
                'gas_mq7':     'co_detected',
            }
            message_map = {
                'temperature': f'High temperature detected: {value:.1f}°C (threshold 35°C)',
                'gas_mq2':     f'Gas/smoke detected by MQ-2: {value:.0f} ppm (threshold 700)',
                'gas_mq7':     f'CO detected by MQ-7: {value:.0f} ppm (threshold 450)',
            }

            AlertService.create_alert_if_not_recent(
                alert_type=type_map.get(sensor, 'system'),
                severity=severity_map.get(sensor, 'medium'),
                message=message_map.get(sensor, f'{sensor} threshold exceeded: {value}'),
                within_minutes=5,
            )

        return Response(SensorReadingSerializer(reading).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def latest_readings(request):
    """GET /api/sensors/latest/?device=1 — most recent reading per sensor_type."""
    device_id = request.query_params.get('device')
    readings_qs = SensorReading.objects.all()
    if device_id:
        readings_qs = readings_qs.filter(device_id=device_id)

    latest_by_type = {}
    for reading in readings_qs.order_by('sensor_type', '-timestamp'):
        if reading.sensor_type not in latest_by_type:
            latest_by_type[reading.sensor_type] = reading

    return Response(SensorReadingDetailSerializer(list(latest_by_type.values()), many=True).data)


@api_view(['GET'])
def reading_history(request):
    """GET /api/sensors/history/?sensor_type=temperature&device=1&limit=50"""
    sensor_type = request.query_params.get('sensor_type')
    device_id   = request.query_params.get('device')
    limit       = int(request.query_params.get('limit', 50))

    if not sensor_type:
        return Response(
            {'error': 'sensor_type query param is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    readings_qs = SensorReading.objects.filter(sensor_type=sensor_type)
    if device_id:
        readings_qs = readings_qs.filter(device_id=device_id)

    readings = list(readings_qs.order_by('-timestamp')[:limit])
    readings.reverse()
    return Response(SensorReadingDetailSerializer(readings, many=True).data)
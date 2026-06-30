from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from devices.models import Device
from .models import SensorReading
from .serializers import SensorReadingSerializer, SensorReadingDetailSerializer
from services.sensor_service import SensorService


@api_view(['POST'])
def receive_sensor_data(request):
    """
    POST /api/sensors/data/
    ESP32 calls this every time it has a fresh reading.
    Body: { "device": 1, "sensor_type": "temperature", "value": 28.5, "unit": "C" }
    """
    serializer = SensorReadingSerializer(data=request.data)
    if serializer.is_valid():
        reading = SensorService.process_reading(serializer.validated_data)
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
    """GET /api/sensors/history/?sensor_type=temperature&device=1&limit=50 — for charts."""
    sensor_type = request.query_params.get('sensor_type')
    device_id = request.query_params.get('device')
    limit = int(request.query_params.get('limit', 50))

    if not sensor_type:
        return Response({'error': 'sensor_type query param is required'}, status=status.HTTP_400_BAD_REQUEST)

    readings_qs = SensorReading.objects.filter(sensor_type=sensor_type)
    if device_id:
        readings_qs = readings_qs.filter(device_id=device_id)

    readings = list(readings_qs.order_by('-timestamp')[:limit])
    readings.reverse()  # oldest first, so charts draw left-to-right correctly

    return Response(SensorReadingDetailSerializer(readings, many=True).data)
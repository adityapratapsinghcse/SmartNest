from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Alert
from .serializers import AlertSerializer


@api_view(['GET'])
def alert_list(request):
    """GET /api/alerts/?unread_only=true"""
    alerts = Alert.objects.all()
    if request.query_params.get('unread_only') == 'true':
        alerts = alerts.filter(is_read=False)
    return Response(AlertSerializer(alerts, many=True).data)


@api_view(['POST'])
def mark_alert_read(request):
    """POST /api/alerts/read/ — Body: { "alert_id": 1 }"""
    alert_id = request.data.get('alert_id')
    if not alert_id:
        return Response({'error': 'alert_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        alert = Alert.objects.get(id=alert_id)
    except Alert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
    alert.is_read = True
    alert.save()
    return Response(AlertSerializer(alert).data)
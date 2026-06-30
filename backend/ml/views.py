import os
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

MODEL_FILES = {
    'anomaly_detector': 'ml/saved_models/anomaly.pkl',
    'gas_classifier': 'ml/saved_models/gas.pkl',
}


@api_view(['GET'])
def predict_anomaly(request):
    """GET /api/ml/predict/anomaly/ — placeholder until Phase 6 trains the real model."""
    return Response({
        'model_name': 'anomaly_detector',
        'status': 'not_trained_yet',
        'message': 'Anomaly detector trains after 7 days of sensor data (Phase 6).',
    })


@api_view(['GET'])
def predict_gas(request):
    """GET /api/ml/predict/gas/ — placeholder until Phase 6."""
    return Response({
        'model_name': 'gas_classifier',
        'status': 'not_trained_yet',
        'message': 'Gas classifier trains after manual sample collection (Phase 6).',
    })


@api_view(['GET'])
def ml_status(request):
    """GET /api/ml/status/ — reports which model files currently exist on disk."""
    report = {}
    for name, path in MODEL_FILES.items():
        full_path = os.path.join(settings.BASE_DIR, path)
        report[name] = {'trained': os.path.exists(full_path)}
    return Response(report)
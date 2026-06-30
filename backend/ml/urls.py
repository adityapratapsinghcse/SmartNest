from django.urls import path
from . import views

urlpatterns = [
    path('ml/predict/anomaly/', views.predict_anomaly, name='ml-predict-anomaly'),
    path('ml/predict/gas/', views.predict_gas, name='ml-predict-gas'),
    path('ml/status/', views.ml_status, name='ml-status'),
]
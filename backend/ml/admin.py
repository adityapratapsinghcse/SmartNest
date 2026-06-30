from django.contrib import admin
from .models import MLPrediction


@admin.register(MLPrediction)
class MLPredictionAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'prediction', 'confidence', 'timestamp']
    list_filter = ['model_name']
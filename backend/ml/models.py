from django.db import models


class MLPrediction(models.Model):
    MODEL_NAMES = [
        ('anomaly_detector', 'Anomaly Detector (Isolation Forest)'),
        ('gas_classifier', 'Gas Severity Classifier (Random Forest)'),
        ('earthquake_classifier', 'Earthquake vs Vibration (SVM)'),
        ('occupancy_predictor', 'Occupancy Predictor (Logistic Regression)'),
        ('energy_forecaster', 'Energy Forecaster (Linear Regression)'),
    ]

    model_name = models.CharField(max_length=30, choices=MODEL_NAMES)
    input_data = models.JSONField(help_text="Feature values fed into the model for this prediction")
    prediction = models.CharField(max_length=100, help_text="e.g. 'anomaly', 'gas_leak', 'will_stay'")
    confidence = models.FloatField(null=True, blank=True, help_text="0-1 score, blank for regression outputs")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.model_name}: {self.prediction} ({self.timestamp:%H:%M:%S})"
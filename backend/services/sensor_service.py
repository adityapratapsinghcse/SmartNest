from django.conf import settings
from devices.models import Device
from sensors.models import SensorReading


class SensorService:
    """
    Single entry point for anything that happens when a sensor reading
    comes in — saving, marking the device online, and (from Phase 6/7
    onward) ML inference and threshold-based alerting will all be added
    here, not in the view or the signal.
    """

    @staticmethod
    def process_reading(serializer_data):
        """
        serializer_data: validated data from SensorReadingSerializer
        Returns the saved SensorReading instance.
        """
        reading = SensorReading.objects.create(**serializer_data)
        Device.objects.filter(id=reading.device_id).update(is_online=True)
        return reading

    @staticmethod
    def check_thresholds(reading: SensorReading):
        """
        Placeholder for Phase 7. Right now just returns None.
        Later: compare reading.value against SMARTNEST_CONFIG thresholds
        and call AlertService.create_alert(...) when exceeded, as a
        fallback for the first week before ML models exist.
        """
        config = settings.SMARTNEST_CONFIG
        if reading.sensor_type == "temperature" and reading.value > config["TEMP_THRESHOLD"]:
            return {"exceeded": "temperature", "value": reading.value}
        if reading.sensor_type == "gas_mq2" and reading.value > config["MQ2_THRESHOLD"]:
            return {"exceeded": "gas_mq2", "value": reading.value}
        if reading.sensor_type == "gas_mq7" and reading.value > config["MQ7_THRESHOLD"]:
            return {"exceeded": "gas_mq7", "value": reading.value}
        return None
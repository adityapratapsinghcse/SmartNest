from django.utils import timezone
from devices.models import Command


class CommandService:
    @staticmethod
    def queue_command(device, action, payload=None):
        return Command.objects.create(
            device=device, action=action, payload=payload or {}, status="pending"
        )

    @staticmethod
    def acknowledge(command_id, new_status):
        command = Command.objects.get(id=command_id)
        command.status = new_status
        command.executed_at = timezone.now()
        command.save()
        return command
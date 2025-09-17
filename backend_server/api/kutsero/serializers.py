from rest_framework import serializers
from datetime import datetime
from .models import CalendarEvent

class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ['title_event', 'date', 'time']

    def validate_time(self, value):
        if isinstance(value, str):
            for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p"):
                try:
                    return datetime.strptime(value, fmt).time()
                except ValueError:
                    continue
            raise serializers.ValidationError(
                "Time has wrong format. Use HH:MM, HH:MM:SS, or hh:mm AM/PM."
            )
        return value

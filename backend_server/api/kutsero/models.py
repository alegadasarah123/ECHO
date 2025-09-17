from django.db import models

class CalendarEvent(models.Model):
    title_event = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'calendar_events'
        ordering = ['date', 'time']
    
    def __str__(self):
        return f"{self.title_event} - {self.date} {self.time}"
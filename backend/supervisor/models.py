# backend/supervisor/models.py

from django.db import models

class File(models.Model):
    name = models.CharField(max_length=255)
    content = models.TextField()

    class Meta:
        app_label = 'supervisor'

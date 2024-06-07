# backend/init_admin.py

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'supervisor.settings')
django.setup()

from django.contrib.auth.models import User

username = 'admin'
password = 'test1234'
email = 'admin@example.com'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print("Superuser created successfully")
else:
    print("Superuser already exists")

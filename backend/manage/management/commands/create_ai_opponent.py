from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create AI opponent user'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username='ai_opponent').exists():
            User.objects.create_user(
                username='ai_opponent',
                email='ai_opponent@example.com',
                password='securepassword123',
                is_staff=False,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS('Successfully created ai_opponent user'))
        else:
            self.stdout.write(self.style.WARNING('ai_opponent user already exists'))

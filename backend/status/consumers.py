from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone
from db.models import User  # Import your custom User model
import json

class UserActivityConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_user()
        if self.user is None:
            await self.close()
        else:
            await self.accept()
            await self.update_user_activity()

    async def disconnect(self, close_code):
        if self.user:
            await self.update_user_status('offline')

    async def receive(self, text_data):
        if self.user:
            await self.update_user_activity()
        await self.send(text_data=json.dumps({'type': 'activity_recorded'}))

    @database_sync_to_async
    def get_user(self):
        try:
            token = self.scope['query_string'].decode().split('=')[1]
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    @permission_classes([IsAuthenticated])
    def update_user_activity(self):
        self.user.last_active = timezone.now()
        self.user.status = 'online'
        self.user.save(update_fields=['last_active', 'status'])

    @database_sync_to_async
    @permission_classes([IsAuthenticated])
    def update_user_status(self, status):
        self.user.status = status
        self.user.save(update_fields=['status'])
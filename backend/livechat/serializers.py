from rest_framework import serializers
from .models import ChatRoom, Message
from db.models import User
from django.conf import settings
import logging

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'status'] 

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.avatar:
            request = self.context.get('request')
            if request:
                host = request.get_host()
                port = request.META.get('SERVER_PORT')
                
                if port and port not in ('80', '443'):
                    host = f"{host}:{port}"
                
                avatar_url = f"http://{host}{settings.MEDIA_URL}{instance.avatar}"
                logging.info(avatar_url)
                representation['avatar'] = avatar_url
        return representation

class ChatRoomSerializer(serializers.ModelSerializer):
    user1 = UserSerializer(read_only=True)
    user2 = UserSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'user1', 'user2', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'room', 'user', 'content', 'timestamp']
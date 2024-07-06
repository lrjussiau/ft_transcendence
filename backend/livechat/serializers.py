from rest_framework import serializers
from .models import ChatRoom, Message
from authentication.serializers import UserProfileSerializer


class ChatRoomSerializer(serializers.ModelSerializer):
    user1 = UserProfileSerializer(read_only=True)
    user2 = UserProfileSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'user1', 'user2', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'room', 'user', 'content', 'timestamp']
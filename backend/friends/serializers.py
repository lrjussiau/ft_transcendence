from rest_framework import serializers
from db.models import Friend, User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'default_avatar', 'status']

class FriendRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    friend = UserSerializer(read_only=True)

    class Meta:
        model = Friend
        fields = ['id', 'user', 'friend', 'status', 'created_at']

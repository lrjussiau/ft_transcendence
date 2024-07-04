from rest_framework import serializers
from db.models import User
from django.contrib.auth.hashers import make_password
import logging
from django.conf import settings

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'avatar', 'status', 'is_2fa_enabled']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data.get('password'))
        return super(UserSerializer, self).create(validated_data)

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'avatar', 'default_avatar', 'created_at', 'updated_at', 'status', 'is_active', 'is_staff', 'is_2fa_enabled']

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
                representation['avatar'] = avatar_url
        return representation
    
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'is_2fa_enabled': self.user.is_2fa_enabled,
        }
        return data
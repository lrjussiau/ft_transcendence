import requests
from rest_framework import serializers
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['email', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        api_url = 'http://backend_container:8000/api/db/user/'  # Utilise le nom de service Docker
        response = requests.post(api_url, json=validated_data)
        if response.status_code == 201:
            return validated_data
        else:
            raise serializers.ValidationError(response.json())

    def validate_email(self, value):
        api_url = f'http://backend_container:8000/api/db/user/?email={value}'  # Utilise le nom de service Docker
        response = requests.get(api_url)
        if response.status_code == 200 and response.json():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_username(self, value):
        api_url = f'http://backend_container:8000/api/db/user/?username={value}'  # Utilise le nom de service Docker
        response = requests.get(api_url)
        if response.status_code == 200 and response.json():
            raise serializers.ValidationError("Username already exists.")
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        if email and password:
            api_url = 'http://backend_container:8000/api/db/authenticate/'  # Utilise le nom de service Docker
            response = requests.post(api_url, json={'email': email, 'password': password})
            if response.status_code == 200:
                data['user'] = response.json()
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Must include 'email' and 'password'")
        return data

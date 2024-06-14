# authentication/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework import status, generics
from .models import CustomUser
from .serializers import CustomUserSerializer  # Ensure this import path is correct
import requests

def authent(username, password):
    base_url = 'http://localhost:8000/api/db/User/'
    params = {
        'fields': 'username',
        'filter__password_hash': password
    }
    response = requests.get(base_url, params=params)
    data = response.json()
    print(f"Here is the data received {data}")
    if data:
        if data[0]['username'] == username:
            print("We got:",data[0]['username'])
            return True
        return False

class AuthView(APIView):

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if authent(username=username, password=password):
            return Response({"message": "Authentication successed welcome"})
            #token, created = Token.objects.get_or_create(user=user)
            #return Response({'token': token.key})
        return Response({"message": "Authentication failed"}, status=status.HTTP_401_UNAUTHORIZED)

class UserListCreate(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

class UserCreate(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user_data = request.data
        print("User registered:", user_data)
        return response
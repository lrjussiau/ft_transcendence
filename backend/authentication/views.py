# authentication/views.py
from rest_framework import generics
from .models import CustomUser
from .serializers import CustomUserSerializer

class UserListCreate(generics.ListCreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

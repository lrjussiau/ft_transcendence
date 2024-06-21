# backend/supervisor/views.py
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from .models import File
from .serializers import FileSerializer

class RootView(APIView):
    def get(self, request):
        return Response({"message": "Welcome to the Pong Game API"})

class FileListCreate(generics.ListCreateAPIView):
    queryset = File.objects.all()
    serializer_class = FileSerializer


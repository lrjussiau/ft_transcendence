from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, UserAvatarSerializer,  UserProfileSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from db.models import User
from django.shortcuts import render, redirect
from .forms import AvatarUploadForm
from django.http import JsonResponse
import logging
from urllib.parse import urlparse
from django.conf import settings
import os
from .utils import generate_and_send_2fa_code, verify_2fa_code

logger = logging.getLogger(__name__)

class UserAvatarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        user = User.objects.filter(username=username).first()
        if user:
            serializer = UserAvatarSerializer(user)
            return Response(serializer.data)
        else:
            return Response({"detail": "User not found."}, status=404)
        
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = serializer.user
        if user.status == "online":
            return Response({"error": "Already Connected"}, status=status.HTTP_401_UNAUTHORIZED)
        if user.is_2fa_enabled:
            generate_and_send_2fa_code(user)
            return Response({
                'require_2fa': True,
                'username': user.username
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        username = request.data.get('username')
        
        if User.objects.filter(email=email).exists():
            return Response({"error": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({"error": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            default_avatar_path = 'avatars/default_avatar.png'
            if os.path.exists(os.path.join(settings.MEDIA_ROOT, default_avatar_path)):
                user.avatar = default_avatar_path
                user.default_avatar = True
                user.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    if 'avatar' not in request.FILES:
        return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.avatar = request.FILES['avatar']
    user.default_avatar = False
    user.save()

    return Response({'success': 'Avatar uploaded successfully'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_avatars(request):
    avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    if os.path.exists(avatars_dir):
        files = os.listdir(avatars_dir)
        file_urls = [f'{settings.MEDIA_URL}avatars/{f}' for f in files]
        return JsonResponse({'files': file_urls})
    return JsonResponse({'files': []})

class ChangeAvatarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        avatar_url = request.data.get('avatar')
        if not avatar_url:
            return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.avatar = avatar_url
        user.default_avatar = False
        user.save()
        return Response({'success': 'Avatar updated successfully'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_username(request):
    new_username = request.data.get('new_username')
    if not new_username:
        return Response({"error": "New username is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if User.objects.filter(username=new_username).exclude(id=user.id).exists():
        return Response({"error": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)

    user.username = new_username
    user.save()
    return Response({"success": "Username updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    new_email = request.data.get('new_email')
    if not new_email:
        return Response({"error": "New email is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if User.objects.filter(email=new_email).exclude(id=user.id).exists():
        return Response({"error": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)

    user.email = new_email
    user.save()
    return Response({"success": "Email updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_status(request):
    
    logger.debug("Change status request")
    new_status = request.data.get('new_status')
    if not new_status:
        logger.error("New status is required.")
        return Response({"error": "New status is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    user.status = new_status
    user.save()
    logger.debug(f"Status updated successfully to {new_status}")
    return Response({"success": "Status updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({"error": "Both current and new passwords are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not check_password(current_password, user.password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    user.password = make_password(new_password)
    user.save()
    return Response({"success": "Password updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_2fa(request):
    user = request.user
    user.is_2fa_enabled = not user.is_2fa_enabled
    user.save()
    return Response({
        "success": f"2FA has been {'enabled' if user.is_2fa_enabled else 'disabled'}.",
        "is_2fa_enabled": user.is_2fa_enabled
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
def verify_2fa(request):
    username = request.data.get('username')
    code = request.data.get('code')
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    if verify_2fa_code(user, code):
        serializer = CustomTokenObtainPairSerializer()
        refresh = serializer.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_2fa_enabled': user.is_2fa_enabled,
            }
        }
        return Response(data)
    return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    password = request.data.get('password')

    if not authenticate(username=user.username, password=password):
        return Response({"error": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user.delete()
        return Response({"success": "Account deleted successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

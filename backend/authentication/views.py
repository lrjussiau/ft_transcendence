from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.hashers import check_password, make_password
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from .serializers import CustomTokenObtainPairSerializer, UserSerializer
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


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    
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
            
            # Set the default avatar without creating a new file
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
        user = request.user
        logging.debug('User profile request for user: %s', user.username)
        return Response({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar_url': user.avatar.url if user.avatar else None,
            'default_avatar': user.default_avatar,
            'created_at': user.created_at,
            'updated_at': user.updated_at,
            'status': user.status,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    if request.method == 'POST':
        logging.debug('Avatar upload attempt for user: %s', request.user.username)
        form = AvatarUploadForm(request.POST, request.FILES)
        if form.is_valid():
            user = request.user
            user.avatar = form.cleaned_data['avatar']
            user.save()
            logging.debug('Avatar upload successful for user: %s', request.user.username)
            return redirect('user_profile')  # Redirect to a profile page or any other page
        else:
            logging.debug('Avatar upload form invalid: %s', form.errors)
    else:
        form = AvatarUploadForm()
    return render(request, 'upload_avatar.html', {'form': form})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_avatars(request):
    avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    if os.path.exists(avatars_dir):
        files = os.listdir(avatars_dir)
        host = request.get_host()
        port = request.META.get('SERVER_PORT')
        file_urls = [f'http://{host}:{port}{settings.MEDIA_URL}avatars/{f}' for f in files]
        return JsonResponse({'files': file_urls})
    return JsonResponse({'files': []})

class ChangeAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        logging.debug('Avatar change attempt for user: %s', request.user.username)
        user = request.user
        avatar_url = request.data.get('avatar')
        
        if not avatar_url:
            return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract the path relative to the media root
        parsed_url = urlparse(avatar_url)
        avatar_path = os.path.relpath(parsed_url.path, settings.MEDIA_URL)

        # Assuming avatar_path is valid and exists in the media directory
        user.avatar = avatar_path
        user.default_avatar = False
        user.save()
        return Response({'success': 'Avatar updated successfully'}, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_username(request):
    user = request.user
    new_username = request.data.get('new_username')

    if not new_username:
        return Response({"error": "New username is required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=new_username).exists():
        return Response({"error": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)

    user.username = new_username
    user.save()

    return Response({"success": "Username updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    user = request.user
    new_email = request.data.get('new_email')

    if not new_email:
        return Response({"error": "New email is required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=new_email).exists():
        return Response({"error": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)

    user.email = new_email
    user.save()

    return Response({"success": "Email updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({"error": "Both current and new passwords are required."}, status=status.HTTP_400_BAD_REQUEST)

    if not check_password(current_password, user.password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    user.password = make_password(new_password)
    user.save()

    return Response({"success": "Password updated successfully."}, status=status.HTTP_200_OK)
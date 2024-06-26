from django.urls import path
from .views import RegisterView, UserProfileView, CustomTokenObtainPairView, upload_avatar, list_avatars, ChangeAvatarView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/profile/', UserProfileView.as_view(), name='user_profile'),
    path('upload-avatar/', upload_avatar, name='upload_avatar'),
    path('list-avatars/', list_avatars, name='list_avatars'),
    path('change-avatar/', ChangeAvatarView.as_view(), name='change_avatar'),
]

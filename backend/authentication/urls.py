from django.urls import path
from .views import (
    RegisterView, UserProfileView, CustomTokenObtainPairView, 
    upload_avatar, list_avatars, ChangeAvatarView,
    change_username, change_email, change_password,
    toggle_2fa, verify_2fa, delete_account,
    change_status,
    toggle_2fa, verify_2fa, delete_account, UserAvatarView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/profile/', UserProfileView.as_view(), name='user_profile'),
    path('upload-avatar/', upload_avatar, name='upload_avatar'),
    path('list-avatars/', list_avatars, name='list_avatars'),
    path('change-avatar/', ChangeAvatarView.as_view(), name='change_avatar'),
    path('change-username/', change_username, name='change_username'),
    path('change-status/', change_status, name='change_status'),
    path('change-email/', change_email, name='change_email'),
    path('change-password/', change_password, name='change_password'),
    path('toggle-2fa/', toggle_2fa, name='toggle_2fa'),
    path('verify-2fa/', verify_2fa, name='verify_2fa'),
    path('delete-account/', delete_account, name='delete_account'),
    path('user/avatar/<str:username>/', UserAvatarView.as_view(), name='user_avatar'),
]
# authentication/urls.py
from django.urls import path
from .views import AuthView, UserListCreate, UserCreate

urlpatterns = [
    path('auth/', AuthView.as_view(), name='auth'),
    path('users/', UserListCreate.as_view(), name='user-list-create'),
    path('create/', UserCreate.as_view(), name='user-create'),
]

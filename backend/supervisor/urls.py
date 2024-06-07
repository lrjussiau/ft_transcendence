# backend/supervisor/urls.py
from django.urls import path
from .views import RootView, FileListCreate, AuthView

urlpatterns = [
    path('', RootView.as_view(), name='root'),
    path('files/', FileListCreate.as_view(), name='file-list-create'),
    path('authentication/', AuthView.as_view(), name='authentication'),
]

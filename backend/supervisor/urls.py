# supervisor/urls.py
from django.urls import path, include
from .views import RootView, FileListCreate

urlpatterns = [
    path('', RootView.as_view(), name='root'),
    path('files/', FileListCreate.as_view(), name='file-list-create'),
    path('authentication/', include('authentication.urls')),  # Correctly include authentication URLs
]

# supervisor/urls.py
from django.urls import path, include
from .views import RootView, FileListCreate

urlpatterns = [
    path('', RootView.as_view(), name='root'),
    path('files/', FileListCreate.as_view(), name='file-list-create'),
    path('authentication/', include('authentication.urls')),
    path('db/', include('db.urls')),
    path('blockchain/', include('blockchain.urls')),
    path('friends/', include('friends.urls')),
    path('livechat/', include('livechat.urls')),
    path('games_history/', include('games_history.urls')),
]


# supervisor/routing.py
from django.urls import re_path
from .consumers import GameConsumer

websocket_urlpatterns = [
    re_path(r'ws/pong/$', GameConsumer.as_asgi()),
]

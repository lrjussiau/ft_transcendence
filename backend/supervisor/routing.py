# supervisor/routing.py
from django.urls import re_path
from .consumers import PongConsumer

websocket_urlpatterns = [
    re_path(r'ws/pong/$', PongConsumer.as_asgi()),
]

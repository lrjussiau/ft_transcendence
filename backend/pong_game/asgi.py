import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pong_game.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from supervisor.routing import websocket_urlpatterns
from status.routing import websocket_urlpatterns as status_websocket_urlpatterns
from livechat.routing import websocket_urlpatterns as livechat_websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            status_websocket_urlpatterns +
            websocket_urlpatterns +
            livechat_websocket_urlpatterns
        )
    ),
})
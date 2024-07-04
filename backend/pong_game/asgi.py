import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from supervisor.routing import websocket_urlpatterns as supervisor_websocket_urlpatterns
from status.routing import websocket_urlpatterns as status_websocket_urlpatterns
from livechat.routing import websocket_urlpatterns as livechat_websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pong_game.settings')
django.setup()

# Combiner tous les WebSocket URL patterns
websocket_urlpatterns = supervisor_websocket_urlpatterns + status_websocket_urlpatterns + livechat_websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})

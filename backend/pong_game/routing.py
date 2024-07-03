from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from supervisor.routing import websocket_urlpatterns
from status.routing import websocket_urlpatterns as status_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns + status_websocket_urlpatterns
        )
    ),
})
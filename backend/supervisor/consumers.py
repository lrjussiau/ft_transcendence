import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from supervisor.pongengine.LobbyManager import LobbyManager
import json

logger = logging.getLogger(__name__)

class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lobby_manager = LobbyManager()

    async def connect(self):
        # Accept the connection
        await self.accept()
        logger.debug("WebSocket connection established")

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'Connect':
            await self.lobby_manager.connect(self, data)
        else:
            await self.lobby_manager.receive(self, text_data)

    async def disconnect(self, close_code):
        await self.lobby_manager.disconnect(self)

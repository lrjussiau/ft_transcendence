import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message
from db.models import User
import logging

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        logger.info(f"Attempting to connect to room: {self.room_id}")

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Successfully connected to room: {self.room_id}")

    async def disconnect(self, close_code):
        logger.info(f"Disconnected from room: {self.room_id} with code: {close_code}")
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        user_id = event['user_id']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'user_id': user_id
        }))
        logger.info(f"Message sent to WebSocket: {message}")


    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def receive(self, text_data):
        logger.info(f"Received message in room {self.room_id}: {text_data}")
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']
            user_id = text_data_json['user_id']

            logger.info(f"User id from message: {user_id}")
            user = await self.get_user(user_id)
            
            if user is None:
                logger.error(f"User with id {user_id} not found")
                return

            logger.info(f"User from database: {user.id}")
            saved_message = await self.save_message(user, self.room_id, message)
            
            if saved_message:
                logger.info(f"Message saved successfully: {saved_message.id}")
            else:
                logger.warning("Message was not saved to the database")

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'user_id': user.id
                }
            )
            logger.info(f"Message sent to group {self.room_group_name}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            logger.exception(e)  # This will lo

    @database_sync_to_async
    def save_message(self, user, room_id, message):
        try:
            logger.info(f"Attempting to save message. User: {user.id}, Room: {room_id}, Message: {message}")
            room = ChatRoom.objects.get(id=room_id)
            logger.info(f"ChatRoom found: {room}")
            new_message = Message.objects.create(room=room, user=user, content=message)
            logger.info(f"Message saved to database: {new_message.id}")
            return new_message
        except ChatRoom.DoesNotExist:
            logger.error(f"ChatRoom with id {room_id} does not exist")
        except Exception as e:
            logger.error(f"Error saving message to database: {str(e)}")
            logger.exception(e)  # This will log the full stack trace
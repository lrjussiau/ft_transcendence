from django.conf import settings
from django.db import models
from db.models import User

class ChatRoom(models.Model):
    user1 = models.ForeignKey(User, related_name='chat_rooms_as_user1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='chat_rooms_as_user2', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f"Chat between {self.user1.username} and {self.user2.username}"

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, related_name='messages', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
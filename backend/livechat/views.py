from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer
from django.db.models import Q
from db.models import User, Friend  # Changed import to use User from db.models

class ChatRoomList(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(Q(user1=user) | Q(user2=user))
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class ChatRoomDetail(generics.RetrieveAPIView):
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(Q(user1=user) | Q(user2=user))

class MessageList(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['room_id']
        return Message.objects.filter(room_id=room_id)

    def perform_create(self, serializer):
        room_id = self.kwargs['room_id']
        room = ChatRoom.objects.get(id=room_id)
        if self.request.user not in [room.user1, room.user2]:
            return Response({"error": "You are not part of this chat room"}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(user=self.request.user, room_id=room_id)

class CreateChatRoom(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user1_id = request.user.id
        user2_id = request.data.get('user2_id')

        if not user2_id:
            return Response({"error": "user2_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        if user1_id == user2_id:
            return Response({"error": "Cannot create a chat room with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user2 = User.objects.get(id=user2_id)
        except User.DoesNotExist:
            return Response({"error": "User2 does not exist"}, status=status.HTTP_404_NOT_FOUND)


        existing_room = ChatRoom.objects.filter(
            (Q(user1_id=user1_id, user2_id=user2_id) |
             Q(user1_id=user2_id, user2_id=user1_id))
        ).first()

        if existing_room:
            serializer = ChatRoomSerializer(existing_room)
            return Response(serializer.data, status=status.HTTP_200_OK)


        new_room = ChatRoom.objects.create(user1_id=user1_id, user2_id=user2_id)
        serializer = ChatRoomSerializer(new_room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

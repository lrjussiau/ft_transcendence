from django.urls import path
from . import views

urlpatterns = [
    path('rooms/', views.ChatRoomList.as_view(), name='chatroom-list'),
    path('rooms/<int:pk>/', views.ChatRoomDetail.as_view(), name='chatroom-detail'),
    path('rooms/<int:room_id>/messages/', views.MessageList.as_view(), name='message-list'),
    path('create-room/', views.CreateChatRoom.as_view(), name='create-chatroom'),  # Add this line
]
from django.urls import path
from .views import (
    AddFriendView, 
    IncomingFriendRequestsView, 
    OutgoingFriendRequestsView, 
    RespondFriendRequestView, 
    FriendsListView
)

urlpatterns = [
    path('add/', AddFriendView.as_view(), name='add-friend'),
    path('requests/incoming/', IncomingFriendRequestsView.as_view(), name='incoming-friend-requests'),
    path('requests/outgoing/', OutgoingFriendRequestsView.as_view(), name='outgoing-friend-requests'),
    path('requests/respond/<int:request_id>/', RespondFriendRequestView.as_view(), name='respond-friend-request'),
    path('', FriendsListView.as_view(), name='friends-list'),
]
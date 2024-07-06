from django.urls import path
#from . import views
from .views import (
    AddFriendView, 
    IncomingFriendRequestsView, 
    OutgoingFriendRequestsView, 
    RespondFriendRequestView, 
    FriendsListView,
    DeleteFriendView,
    is_blocked,
    BlockFriendView
)

urlpatterns = [
    path('add/', AddFriendView.as_view(), name='add-friend'),
    path('is-blocked/<int:friend_id>/', is_blocked, name='is-blocked'),
    path('delete/', DeleteFriendView.as_view(), name='delete-friend'),
    path('block/', BlockFriendView.as_view(), name='delete-friend'),
    path('requests/incoming/', IncomingFriendRequestsView.as_view(), name='incoming-friend-requests'),
    path('requests/outgoing/', OutgoingFriendRequestsView.as_view(), name='outgoing-friend-requests'),
    path('requests/respond/<int:request_id>/', RespondFriendRequestView.as_view(), name='respond-friend-request'),
    path('', FriendsListView.as_view(), name='friends-list'),
]
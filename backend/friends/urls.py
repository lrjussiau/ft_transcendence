from django.urls import path
#from . import views
#from .views import *
from .views import (
    AddFriendView, 
    IncomingFriendRequestsView, 
    OutgoingFriendRequestsView, 
    RespondFriendRequestView, 
    FriendsListView,
    DeleteFriendView,
    IsBlockedView,
    BlockFriendView,
    PendingFriendsListView,
    BlockedFriendsListView,
    UnblockFriendView,
    UserInfoView
)

urlpatterns = [
    path('add/', AddFriendView.as_view(), name='add-friend'),
    path('is-blocked/<int:friend_id>/', IsBlockedView.as_view(), name='is-blocked'),
    path('delete/', DeleteFriendView.as_view(), name='delete-friend'),
    path('block/<int:friend_id>/', BlockFriendView.as_view(), name='block-friend'),
    path('unblock/<int:friend_id>/', UnblockFriendView.as_view(), name='unblock-friend'),
    path('requests/incoming/', IncomingFriendRequestsView.as_view(), name='incoming-friend-requests'),
    path('requests/outgoing/', OutgoingFriendRequestsView.as_view(), name='outgoing-friend-requests'),
    path('requests/respond/<int:request_id>/', RespondFriendRequestView.as_view(), name='respond-friend-request'),
    path('', FriendsListView.as_view(), name='friends-list'),
    path('pending/', PendingFriendsListView.as_view(), name='pending-friends-list'),
    path('blocked/', BlockedFriendsListView.as_view(), name='blocked-friends-list'),
    path('user_stats/<int:user_id>/', UserInfoView.as_view(), name='user_stats'),
]

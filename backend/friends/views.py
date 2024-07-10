from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from db.models import Friend, User
from friends.serializers import FriendRequestSerializer, UserSerializer
import logging

logger = logging.getLogger(__name__)

class AddFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        friend_id = request.data.get('friend_id')
        if not friend_id:
            return Response({'error': 'Friend ID not provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'User does not exist'}, status=status.HTTP_404_NOT_FOUND)

        if Friend.objects.filter(user=request.user, friend=friend).exists():
            return Response({'error': 'Friend request already sent'}, status=status.HTTP_400_BAD_REQUEST)

        Friend.objects.create(user=request.user, friend=friend, status='Pending')
        return Response({'success': 'Friend request sent successfully'}, status=status.HTTP_201_CREATED)

class DeleteFriendView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        friend_id = request.data.get('friend_id')
        logger.info(f"DeleteFriendView post method called: {friend_id}")
        user_id = request.user.id
        logger.info(f"DeleteFriendView post method called:{user_id} ")
        if not friend_id:
            return Response({'error': 'Friend ID not provided'}, status=status.HTTP_400_BAD_REQUEST)
        friendships = Friend.objects.filter(
            (Q(user_id=user_id, friend_id=friend_id) | Q(user_id=friend_id, friend_id=user_id))
        )

        if not friendships.exists():
            return Response({'error': 'Friend not found'}, status=status.HTTP_404_NOT_FOUND)

        deleted_count, _ = friendships.delete()

        return Response({
            'success': f'Friend deleted successfully. {deleted_count} record(s) were deleted.'
        }, status=status.HTTP_200_OK)

class BlockFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        if not friend_id:
            return Response({'error': 'Friend ID not provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'User does not exist'}, status=status.HTTP_404_NOT_FOUND)

        friendship = Friend.objects.filter(user=request.user, friend=friend).first()
        if not friendship:
            return Response({'error': 'Friend not found'}, status=status.HTTP_404_NOT_FOUND)

        friendship.status = "blocked"
        friendship.save()
        return Response({'success': 'Friend blocked successfully'}, status=status.HTTP_200_OK)

class UnblockFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        if not friend_id:
            return Response({'error': 'Friend ID not provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response({'error': 'User does not exist'}, status=status.HTTP_404_NOT_FOUND)

        friendship = Friend.objects.filter(user=request.user, friend=friend).first()
        if not friendship:
            return Response({'error': 'Friend not found'}, status=status.HTTP_404_NOT_FOUND)

        friendship.status = "Accepted"
        friendship.save()
        return Response({'success': 'Friend unblocked successfully'}, status=status.HTTP_200_OK)



class IncomingFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        incoming_requests = Friend.objects.filter(friend=request.user, status='Pending')
        serializer = FriendRequestSerializer(incoming_requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class OutgoingFriendRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        outgoing_requests = Friend.objects.filter(user=request.user, status='Pending')
        serializer = FriendRequestSerializer(outgoing_requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RespondFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        action = request.data.get('action')
        if action not in ['accept', 'reject']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend_request = Friend.objects.get(id=request_id, friend=request.user, status='Pending')
        except Friend.DoesNotExist:
            return Response({'error': 'Friend request not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'accept':
            friend_request.status = 'Accepted'
            Friend.objects.create(user=request.user, friend=friend_request.user, status='Accepted')
        elif action == 'reject':
            friend_request.status = 'Rejected'

        friend_request.save()
        return Response({'success': f'Friend request {action}ed successfully'}, status=status.HTTP_200_OK)


class FriendsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = Friend.objects.filter(
            Q(user=request.user) & (Q(status='Accepted') | Q(status='blocked'))
        )
        serializer = FriendRequestSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PendingFriendsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = Friend.objects.filter(user=request.user, status='Pending')
        serializer = FriendRequestSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



class IsBlockedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friend_id):
        if self.is_blocked(request.user, friend_id):
            return Response({'is_blocked': True})
        else:
            return Response({'is_blocked': False})

    def is_blocked(self, user, friend_id):
        print(f"friend {friend_id}")
        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            print("friend does not exist")
            return False
        
        row = Friend.objects.filter(user=user, friend=friend).first()
        if row.status == "blocked":
            return True
        return False


class BlockedFriendsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friends = Friend.objects.filter(user=request.user, status='blocked')
        serializer = FriendRequestSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

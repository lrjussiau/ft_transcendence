from django.shortcuts import render
from asgiref.sync import sync_to_async
from db.models import Games, User
#from django.db.models import Games
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from games_history.serializers import GameRetrieveSerializer
from blockchain.views import record_score, retrieve_score
from django.db.models import Q, Count
from rest_framework import status


@require_GET
def user_stats(request, user_id):
    wins = Games.objects.filter(winner_id=user_id).count()
    losses = Games.objects.filter(loser_id=user_id).count()
    return JsonResponse({'wins': wins, 'losses': losses})

@sync_to_async
def store_game(score_loser, loser_username, winner_username, tournament_game):
    # Retrieve the User objects based on the provided usernames
    loser = User.objects.get(username=loser_username)
    winner = User.objects.get(username=winner_username)
    
    # Create a new game entry in the Games table
    new_game = Games.objects.create(
        winner=winner,
        loser=loser,
        loser_score=score_loser,
        is_tournament_game=tournament_game
    )

    if tournament_game:
        response = record_score(new_game.game_id, score_loser, loser_username, winner_username)
        if response.status_code == 200:
            return JsonResponse({"message": "Data sent successfully"}, status=200)
        else:
            return JsonResponse({"error": "Failed to send data to blockchain"}, status=500)

"""class StoreGameData(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = GameStoreSerializer(data=request.data)
        if serializer.is_valid():
            game = serializer.save()
        response = record_score(game.id, request.score_loser, request.loser.username, request.winner.username)
        if request.is_tournament_game:
            data_to_send = {
            "game_id": game.id,
            "score_loser" : request.score_loser,
            "loser" : request.loser.username,
            "winner" : request.winner.username
        }
        response = requests.post('/api/blockchain/record_score', json=data_to_send)
        if response.status_code == 200:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)"""
        

class RetrieveGameData(APIView):
    permission_classes = [IsAuthenticated]
    def check_scores_integrity(self, data):
        for game in data:
            print(f"game: game")
            if game['is_tournament_game'] == True:
                response = retrieve_score(game['game_id'])
                if response.status_code != 200:
                    return False
                else:
                    if (response.score_loser == game.score_loser and response.loser == game.loser and response.winner == game.winner):
                        continue
                    else:
                        return False
        return True

    def get(self, request, user_id):
        # Filter games where the user is either the winner or the loser
        matches = Games.objects.filter(
            Q(winner__id=user_id) | Q(loser__id=user_id)
        )
        
        serializer = GameRetrieveSerializer(matches, many=True)
        games = serializer.data
        
        if self.check_scores_integrity(games):
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Data integrity check failed."}, status=status.HTTP_400_BAD_REQUEST)
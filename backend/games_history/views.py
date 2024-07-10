from django.shortcuts import render
from asgiref.sync import sync_to_async
from db.models import Games, User
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from games_history.serializers import GameRetrieveSerializer
from blockchain.views import record_score, retrieve_score
from django.db.models import Q, Count
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import logging
import requests
import json
from django.http import JsonResponse


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@require_GET
def user_stats(request, user_id):
    wins = Games.objects.filter(winner_id=user_id).count()
    losses = Games.objects.filter(loser_id=user_id).count()
    return JsonResponse({'wins': wins, 'losses': losses})

@sync_to_async
def store_game(score_loser, loser_username, winner_username, tournament_game):
    loser = User.objects.get(username=loser_username)
    winner = User.objects.get(username=winner_username)

    # Check for recent similar games in the last 5 seconds
    five_seconds_ago = timezone.now() - timedelta(seconds=5)
    recent_similar_game = Games.objects.filter(
        Q(winner=winner, loser=loser) | Q(winner=loser, loser=winner),
        loser_score=score_loser,
        is_tournament_game=tournament_game,
        match_date__gte=five_seconds_ago
    ).exists()

    if recent_similar_game:
        return JsonResponse({"message": "Similar game recently recorded"}, status=200)

    new_game = Games.objects.create(
        winner=winner,
        loser=loser,
        loser_score=score_loser,
        is_tournament_game=tournament_game
    )

    if tournament_game:
        response = record_score(new_game.game_id, score_loser, loser.username, winner.username)
        if response.status_code == 200:
            return JsonResponse({"message": "Data sent successfully"}, status=200)
        else:
            return JsonResponse({"error": "Failed to send data to blockchain"}, status=500)
    
    return JsonResponse({"message": "Game recorded successfully"}, status=200)

class RetrieveGameData(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        matches = Games.objects.filter(
            Q(winner__id=user_id) | Q(loser__id=user_id)
        )
        
        serializer = GameRetrieveSerializer(matches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
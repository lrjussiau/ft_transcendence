import json
from django.utils import timezone
import requests
from django.http import JsonResponse
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from db.models import Games, User
from .serializers import GameRetrieveSerializer
from datetime import datetime

@csrf_exempt
def endpoint_handler(request, operation_requested):
    if request.content_type == 'application/json':
        data = json.loads(request.body)
    if operation_requested == 'record_score':
        return record_score(data.get('game_id'), data.get('score_loser'),data.get('loser'), data.get('winner'))
    elif operation_requested == 'retrieve_score':
        print("should go here")
        return retrieve_score(data.get('game_id'))
    else:
        return HttpResponse(status=404)

def record_score(game_id, score_loser, loser, winner):
    blockchain_endpoint = "http://blockchain:3000/record_score"

    try:
        data_to_send = {
            "game_id": game_id,
            "score_loser" : score_loser,
            "loser" : loser,
            "winner" : winner
        }

        response = requests.post(blockchain_endpoint, json=data_to_send)

        if response.status_code == 200:
            return JsonResponse({"message": "Data sent successfully"}, status=200)
        else:
            return JsonResponse({"error": "Failed to send data to blockchain"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def retrieve_score(game_id):
    blockchain_endpoint = "http://blockchain:3000/retrieve_score"

    try:
        data_to_send = {
            "game_id": game_id,
        }

        response = requests.post(blockchain_endpoint, json=data_to_send)

        if response.status_code == 200:
            return JsonResponse(response.json(),  status=200)
        else:
            return JsonResponse({"error": "Failed to retrieve data from blockchain"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

class IntegrityCheck(APIView):
    permission_classes = [IsAuthenticated]

    def check_scores_integrity(self, games):
        for game in games:
            if game['is_tournament_game']:
                response = retrieve_score(game['game_id'])
                if response.status_code != 200:
                    return False
                if not (response.score_loser == game['score_loser'] and 
                        response.loser == game['loser'] and 
                        response.winner == game['winner']):
                    return False
        return True

    def get(self, request, user_id):
        matches = Games.objects.filter(Q(winner__id=user_id) | Q(loser__id=user_id))
        serializer = GameRetrieveSerializer(matches, many=True)
        games = serializer.data
        
        check_time = timezone.now().isoformat()
        
        if self.check_scores_integrity(games):
            return Response({
                "status": "OK",
                "message": "DataIntegrityCheckPassed",
                "check_time": check_time
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "KO",
                "message": "DataIntegrityCheckFailed",
                "check_time": check_time
            }, status=status.HTTP_200_OK)
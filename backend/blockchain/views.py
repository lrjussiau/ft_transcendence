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
import logging
import requests
from django.http import JsonResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

    logger.info(f"Attempting to record score for game_id: {game_id}")
    logger.info(f"Score data - Loser: {loser}, Score: {score_loser}, Winner: {winner}")

    try:
        data_to_send = {
            "game_id": game_id,
            "score_loser": score_loser,
            "loser": loser,
            "winner": winner
        }

        logger.info(f"Sending data to blockchain: {data_to_send}")

        response = requests.post(blockchain_endpoint, json=data_to_send)

        logger.info(f"Blockchain response status code: {response.status_code}")
        logger.info(f"Blockchain response content: {response.text}")

        if response.status_code == 200:
            logger.info("Data sent successfully to blockchain")
            return JsonResponse({"message": "Data sent successfully"}, status=200)
        else:
            logger.error(f"Failed to send data to blockchain. Status code: {response.status_code}")
            return JsonResponse({"error": "Failed to send data to blockchain"}, status=500)

    except Exception as e:
        logger.exception(f"Exception occurred while recording score: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

def retrieve_score(game_id):
    blockchain_endpoint = "http://blockchain:3000/retrieve_score"
    try:
        data_to_send = {
            "game_id": game_id,
        }
        response = requests.post(blockchain_endpoint, json=data_to_send)
        data = response.json()
        logger.info(f"Response from Node.js server: {data}")  # Log the response
        return data
    except requests.RequestException as e:
        logger.error(f"Error retrieving score: {str(e)}")
        return {"error": str(e)}

class IntegrityCheck(APIView):
    permission_classes = [IsAuthenticated]

    def check_scores_integrity(self, games):
        for game in games:
            if game['is_tournament_game']:
                response = retrieve_score(game['game_id'])
                logger.info(f"Checking game: {game}")
                logger.info(f"Response: {response}")
                if response.get('status_code') != 200:
                    return False
                if not (response.get('score_loser') == game['loser_score'] and 
                        response.get('loser') == game['loser']['username'] and 
                        response.get('winner') == game['winner']['username']):
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
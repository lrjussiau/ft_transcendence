import json
import requests
from django.http import JsonResponse
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt   #Use this decorator if you're testing with POST requests from non-browser clients
def endpoint_handler(request, operation_requested):
    if request.content_type == 'application/json': # should be json
        data = json.loads(request.body)
    if operation_requested == 'record_score':
        return record_score(data.get('game_id'), data.get('score_loser'),data.get('loser'), data.get('winner'))
    elif operation_requested == 'retrieve_score':
        print("should go here")
        return retrieve_score(data.get('game_id'))
    else:
        return HttpResponse(status=404)  # Not Found

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

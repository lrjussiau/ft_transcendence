import requests
from django.http import JsonResponse

def record_score(game_id, score_loser, score_winner, loser, winner):
    blockchain_endpoint = "http://blockchain:3000/record_score"

    try:
        data_to_send = {
            "game_id": game_id,
            "score_loser" : score_loser,
            "score_winner" : score_winner,
            "loser" : loser,
            "winner" : winner
        }

        response = requests.post(blockchain_endpoint, json=data_to_send)

        if response.status_code == 200:
            return JsonResponse({"message": "Data sent successfully"})
        else:
            return JsonResponse({"error": "Failed to send data to blockchain"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def retrieveScore(game_id):
    blockchain_endpoint = "http://blockchain:3000/retrieve_score"

    try:
        data_to_send = {
            "game_id": game_id,
        }

        response = requests.post(blockchain_endpoint, json=data_to_send)

        if response.status_code == 200:
            return JsonResponse(response.json())
        else:
            return JsonResponse({"error": "Failed to retrieve data from blockchain"}, status=500)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import logging
import urllib.request

class RegisterView(APIView):
    url = 'http://backend_container:8000/api/db/user'

    req = urllib.request.Request(url, method='GET')

    try:
        with urllib.request.urlopen(req) as response:
            response_data = response.read()
            print(response_data.decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'HTTP error: {e.code} - {e.reason}')
    except urllib.error.URLError as e:
        print(f'URL error: {e.reason}')

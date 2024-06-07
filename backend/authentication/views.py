# backend/authentication/views.py
from rest_framework.response import Response
from rest_framework.views import APIView

class AuthView(APIView):
    def get(self, request):
        return Response({"message": "Welcome to the Auth Page"})

    def post(self, request):
        # Implement your authentication logic here
        username = request.data.get('username')
        password = request.data.get('password')
        if username == 'admin' and password == 'password':
            return Response({"message": "Authentication successful"})
        return Response({"message": "Authentication failed"}, status=401)

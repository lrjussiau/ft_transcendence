# backend/pongengine/views.py

from django.shortcuts import render

def index(request):
    return render(request, 'pongengine/pong.html')

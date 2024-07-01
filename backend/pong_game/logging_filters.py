import logging

class ExcludeWebsocketMessages(logging.Filter):
    def filter(self, record):
        return "Sent websocket to client for" not in record.getMessage()

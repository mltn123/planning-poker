from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'/(?P<poker_session>\w+)/$', consumers.PokerConsumer),
    re_path(r'admin/poker_session', consumers.TicketConsumer),
]
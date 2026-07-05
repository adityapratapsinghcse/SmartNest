from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None


class TokenAuthMiddleware(BaseMiddleware):
    """
    Reads ?token=<auth token> from the WebSocket connection URL and
    attaches the resolved User to scope['user'] - same Token model
    your REST API already uses via TokenAuthentication.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        scope['user'] = await get_user_from_token(token_key) if token_key else None
        return await super().__call__(scope, receive, send)
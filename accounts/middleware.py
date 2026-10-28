import time

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import logout
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse


SESSION_ACTIVITY_KEY = "poultryiq_last_activity"


class SessionInactivityMiddleware:
    """Expire authenticated sessions that have had no real user activity."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            now = int(time.time())
            last_activity = request.session.get(SESSION_ACTIVITY_KEY)
            timeout = settings.SESSION_INACTIVITY_TIMEOUT

            if last_activity and now - int(last_activity) >= timeout:
                logout(request)
                messages.warning(request, "Your session expired after a period of inactivity. Please sign in again.")

                if request.path == reverse("session_heartbeat") or request.headers.get("Accept") == "application/json":
                    return JsonResponse(
                        {"expired": True, "login_url": reverse("login")},
                        status=401,
                    )
                return redirect("login")

            if last_activity is None or self._is_user_navigation(request):
                request.session[SESSION_ACTIVITY_KEY] = now

        return self.get_response(request)

    @staticmethod
    def _is_user_navigation(request):
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            return True
        return request.headers.get("Sec-Fetch-Mode") == "navigate"

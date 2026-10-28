from django.conf import settings
from django.urls import reverse


def session_expiry(request):
    return {
        "session_inactivity_timeout": settings.SESSION_INACTIVITY_TIMEOUT,
        "session_inactivity_warning": settings.SESSION_INACTIVITY_WARNING,
        "session_heartbeat_url": reverse("session_heartbeat"),
        "session_login_url": reverse("login"),
        "session_logout_url": reverse("logout"),
    }

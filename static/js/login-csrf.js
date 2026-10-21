(function () {
    "use strict";

    function getCookie(name) {
        const prefix = `${name}=`;

        for (const cookie of document.cookie.split(";")) {
            const value = cookie.trim();
            if (value.startsWith(prefix)) {
                return decodeURIComponent(value.slice(prefix.length));
            }
        }

        return "";
    }

    function syncCsrfToken() {
        const form = document.getElementById("login-form");
        const tokenInput = form?.querySelector('input[name="csrfmiddlewaretoken"]');
        const currentToken = getCookie("csrftoken");

        if (tokenInput && currentToken) {
            tokenInput.value = currentToken;
        }
    }

    function initializeLoginForm() {
        const form = document.getElementById("login-form");
        if (!form) {
            return;
        }

        syncCsrfToken();
        form.addEventListener("submit", syncCsrfToken);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeLoginForm);
    } else {
        initializeLoginForm();
    }

    window.addEventListener("focus", syncCsrfToken);
    window.addEventListener("pageshow", syncCsrfToken);
}());

(function () {
    "use strict";

    var script = document.currentScript;
    if (!script || script.dataset.enabled !== "true") return;

    var timeoutMs = Number(script.dataset.timeoutSeconds) * 1000;
    var warningMs = Number(script.dataset.warningSeconds) * 1000;
    var heartbeatUrl = script.dataset.heartbeatUrl;
    var loginUrl = script.dataset.loginUrl;
    var logoutUrl = script.dataset.logoutUrl;
    var storageKey = "poultryiq:last-user-activity";
    var deadline = Date.now() + timeoutMs;
    var lastHeartbeat = 0;
    var lastBroadcast = 0;
    var warningDialog = null;
    var countdownTimer = null;
    var warningOpen = false;

    if (!timeoutMs || !warningMs || warningMs >= timeoutMs || !heartbeatUrl) return;

    function cookie(name) {
        var prefix = name + "=";
        var item = document.cookie.split(";").map(function (part) { return part.trim(); }).find(function (part) { return part.indexOf(prefix) === 0; });
        return item ? decodeURIComponent(item.slice(prefix.length)) : "";
    }

    function redirectToLogin() {
        window.location.replace(loginUrl);
    }

    function heartbeat(force) {
        var now = Date.now();
        if (!force && now - lastHeartbeat < 60000) return;
        lastHeartbeat = now;

        fetch(heartbeatUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
                "X-CSRFToken": cookie("csrftoken"),
                "X-Requested-With": "XMLHttpRequest"
            },
            keepalive: true
        }).then(function (response) {
            if (response.status === 401) redirectToLogin();
        }).catch(function () {
            // A temporary connection failure must not log the user out early.
        });
    }

    function closeWarning() {
        warningOpen = false;
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        if (warningDialog) warningDialog.remove();
        warningDialog = null;
    }

    function recordActivity(force) {
        if (warningOpen && !force) return;
        var now = Date.now();
        deadline = now + timeoutMs;

        if (force || now - lastBroadcast >= 15000) {
            lastBroadcast = now;
            try { localStorage.setItem(storageKey, String(now)); } catch (error) { /* Storage may be unavailable. */ }
        }
        heartbeat(false);
    }

    function keepSession() {
        closeWarning();
        recordActivity(true);
        heartbeat(true);
    }

    function signOut() {
        var form = document.createElement("form");
        form.method = "post";
        form.action = logoutUrl;
        var csrf = document.createElement("input");
        csrf.type = "hidden";
        csrf.name = "csrfmiddlewaretoken";
        csrf.value = cookie("csrftoken");
        form.appendChild(csrf);
        document.body.appendChild(form);
        form.submit();
    }

    function updateCountdown() {
        var remaining = Math.max(0, deadline - Date.now());
        var totalSeconds = Math.ceil(remaining / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var output = warningDialog && warningDialog.querySelector("[data-session-countdown]");
        if (output) output.textContent = minutes + ":" + String(seconds).padStart(2, "0");
        if (remaining <= 0) redirectToLogin();
    }

    function showWarning() {
        if (warningOpen) return;
        warningOpen = true;
        warningDialog = document.createElement("div");
        warningDialog.className = "session-expiry-backdrop";
        warningDialog.innerHTML =
            '<section class="session-expiry-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sessionExpiryTitle" aria-describedby="sessionExpiryDescription">' +
                '<span class="session-expiry-dialog__icon" aria-hidden="true"><i class="bi bi-clock-history"></i></span>' +
                '<div><h2 id="sessionExpiryTitle">Are you still working?</h2>' +
                '<p id="sessionExpiryDescription">For your security, this session will close in <strong data-session-countdown aria-live="polite"></strong>.</p></div>' +
                '<div class="session-expiry-dialog__actions">' +
                    '<button type="button" class="btn btn-outline-secondary" data-session-signout>Sign out now</button>' +
                    '<button type="button" class="btn btn-primary" data-session-continue>Stay signed in</button>' +
                '</div>' +
            '</section>';
        document.body.appendChild(warningDialog);
        warningDialog.querySelector("[data-session-continue]").addEventListener("click", keepSession);
        warningDialog.querySelector("[data-session-signout]").addEventListener("click", signOut);
        warningDialog.addEventListener("keydown", function (event) {
            if (event.key !== "Tab") return;
            var controls = warningDialog.querySelectorAll("button");
            var first = controls[0];
            var last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        warningDialog.querySelector("[data-session-continue]").focus();
        updateCountdown();
        countdownTimer = window.setInterval(updateCountdown, 1000);
    }

    ["pointerdown", "keydown", "touchstart", "scroll"].forEach(function (eventName) {
        window.addEventListener(eventName, function () { recordActivity(false); }, { passive: true });
    });

    window.addEventListener("storage", function (event) {
        if (event.key !== storageKey || warningOpen) return;
        var activity = Number(event.newValue);
        if (activity) deadline = activity + timeoutMs;
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) recordActivity(false);
    });

    window.setInterval(function () {
        var remaining = deadline - Date.now();
        if (remaining <= 0) redirectToLogin();
        else if (remaining <= warningMs) showWarning();
    }, 1000);

    recordActivity(true);
})();

(function () {
    "use strict";

    var region;
    var noticeCounter = 0;

    function ensureRegion() {
        if (region && region.isConnected) return region;
        region = document.querySelector("[data-feedback-region]");
        if (region) return region;

        region = document.createElement("div");
        region.className = "feedback-region";
        region.setAttribute("data-feedback-region", "");
        region.setAttribute("aria-live", "polite");
        region.setAttribute("aria-atomic", "false");
        document.body.appendChild(region);
        return region;
    }

    function iconFor(type) {
        return {
            success: "bi-check-circle-fill",
            error: "bi-exclamation-circle-fill",
            warning: "bi-exclamation-triangle-fill",
            loading: "bi-arrow-repeat",
            info: "bi-info-circle-fill"
        }[type] || "bi-info-circle-fill";
    }

    function notify(message, type, options) {
        options = options || {};
        type = type || "info";
        var host = ensureRegion();
        var notice = document.createElement("div");
        var id = "feedback-notice-" + (++noticeCounter);
        var safeType = type === "loading" ? "info" : type;

        notice.id = id;
        notice.className = "feedback-notice feedback-notice--" + safeType;
        notice.setAttribute("role", type === "error" ? "alert" : "status");
        notice.innerHTML =
            '<i class="bi ' + iconFor(type) + ' feedback-notice__icon' + (type === "loading" ? " button-feedback-icon" : "") + '" aria-hidden="true"></i>' +
            '<span class="feedback-notice__copy"></span>' +
            (options.persistent ? "" : '<button type="button" class="feedback-notice__close" aria-label="Dismiss message"><i class="bi bi-x-lg" aria-hidden="true"></i></button>');

        var copy = notice.querySelector(".feedback-notice__copy");
        copy.textContent = message;
        if (options.detail) {
            var detail = document.createElement("small");
            detail.className = "feedback-notice__detail";
            detail.textContent = options.detail;
            copy.appendChild(detail);
        }

        var close = notice.querySelector(".feedback-notice__close");
        if (close) close.addEventListener("click", function () { notice.remove(); });
        host.appendChild(notice);

        if (!options.persistent) {
            window.setTimeout(function () { notice.remove(); }, options.duration || (type === "error" ? 7000 : 5000));
        }
        return notice;
    }

    function actionLabel(button) {
        var explicit = button && button.getAttribute("data-loading-text");
        if (explicit) return explicit;

        var text = button ? (button.textContent || button.value || "").trim().toLowerCase() : "";
        if (/sign in|log in/.test(text)) return "Signing in…";
        if (/log out|sign out/.test(text)) return "Signing out…";
        if (/send|message/.test(text)) return "Sending…";
        if (/upload/.test(text)) return "Uploading…";
        if (/approve/.test(text)) return "Approving…";
        if (/reject/.test(text)) return "Rejecting…";
        if (/pay|payment|disburse/.test(text)) return "Processing payment…";
        if (/save|record|update|complete/.test(text)) return "Saving…";
        if (/create|add|renew/.test(text)) return "Creating…";
        if (/search|filter|apply|generate|prepare/.test(text)) return "Loading…";
        if (/delete|remove|archive|cancel|void|reverse/.test(text)) return "Processing…";
        return "Processing…";
    }

    function fieldName(field) {
        var label;
        if (field.id) label = document.querySelector('label[for="' + CSS.escape(field.id) + '"]');
        var text = label ? label.textContent.replace(/\s+/g, " ").trim() : "";
        return text.replace(/[\*:]+$/, "") || field.getAttribute("aria-label") || field.placeholder || "This field";
    }

    function validationMessage(field) {
        var name = fieldName(field);
        if (field.validity.valueMissing) return name + " is required.";
        if (field.validity.typeMismatch && field.type === "email") return "Enter a valid email address.";
        if (field.validity.patternMismatch) return "Check the format for " + name.toLowerCase() + ".";
        if (field.validity.tooShort) return name + " must be at least " + field.minLength + " characters.";
        if (field.validity.tooLong) return name + " must be no more than " + field.maxLength + " characters.";
        if (field.validity.rangeUnderflow) return name + " must be " + field.min + " or more.";
        if (field.validity.rangeOverflow) return name + " must be " + field.max + " or less.";
        if (field.validity.stepMismatch || field.validity.badInput) return "Enter a valid value for " + name.toLowerCase() + ".";
        return field.validationMessage || "Check this field and try again.";
    }

    function clearFieldError(field) {
        field.classList.remove("is-invalid");
        field.removeAttribute("aria-invalid");
        var errorId = field.getAttribute("data-interaction-error");
        if (errorId) {
            var error = document.getElementById(errorId);
            if (error) error.remove();
            field.removeAttribute("data-interaction-error");
            var describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter(function (id) { return id !== errorId; });
            if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
            else field.removeAttribute("aria-describedby");
        }
    }

    function showFieldError(field) {
        clearFieldError(field);
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");

        var error = document.createElement("div");
        var errorId = "field-error-" + (++noticeCounter);
        error.id = errorId;
        error.className = "interaction-invalid-feedback";
        error.textContent = validationMessage(field);

        var anchor = field.closest(".input-group, .password-input-wrapper") || field;
        anchor.insertAdjacentElement("afterend", error);
        field.setAttribute("data-interaction-error", errorId);
        field.setAttribute("aria-describedby", ((field.getAttribute("aria-describedby") || "") + " " + errorId).trim());
    }

    function invalidFields(form) {
        return Array.prototype.filter.call(form.elements, function (field) {
            return field.willValidate && !field.validity.valid;
        });
    }

    function showValidationSummary(form) {
        var fields = invalidFields(form);
        fields.forEach(showFieldError);
        if (!fields.length) return;

        notify(fields.length === 1 ? validationMessage(fields[0]) : "Complete the highlighted fields before continuing.", "error", {
            detail: fields.length > 1 ? fields.length + " fields need attention." : "Your entry has not been submitted."
        });
        fields[0].focus({ preventScroll: true });
        fields[0].scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    }

    function rememberButton(button) {
        if (!button || button.dataset.feedbackOriginalHtml) return;
        button.dataset.feedbackOriginalHtml = button.innerHTML;
        button.dataset.feedbackOriginalValue = button.value || "";
    }

    function setSubmitting(form, button) {
        if (form.dataset.feedbackSubmitting === "true") return;
        form.dataset.feedbackSubmitting = "true";
        form.setAttribute("aria-busy", "true");

        var label = actionLabel(button);
        var submits = form.querySelectorAll('button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]');
        submits.forEach(function (control) {
            rememberButton(control);
            control.classList.add("is-submitting");
            control.setAttribute("aria-disabled", "true");
            control.setAttribute("aria-label", label.replace("…", ""));
        });

        if (button) {
            if (button.tagName === "INPUT") button.value = label;
            else button.innerHTML = '<i class="bi bi-arrow-repeat button-feedback-icon" aria-hidden="true"></i><span>' + label + "</span>";
        }

        var pending = notify(label, "loading", { persistent: true, detail: "Please wait. Avoid pressing the button again." });
        form.dataset.feedbackNoticeId = pending.id;
    }

    function resetFormState(form) {
        delete form.dataset.feedbackSubmitting;
        form.removeAttribute("aria-busy");
        form.querySelectorAll(".is-submitting").forEach(function (control) {
            control.classList.remove("is-submitting");
            control.removeAttribute("aria-disabled");
            control.removeAttribute("aria-label");
            if (control.tagName === "INPUT") control.value = control.dataset.feedbackOriginalValue || control.value;
            else if (control.dataset.feedbackOriginalHtml) control.innerHTML = control.dataset.feedbackOriginalHtml;
            delete control.dataset.feedbackOriginalHtml;
            delete control.dataset.feedbackOriginalValue;
        });
        var notice = document.getElementById(form.dataset.feedbackNoticeId || "");
        if (notice) notice.remove();
        delete form.dataset.feedbackNoticeId;
    }

    document.addEventListener("submit", function (event) {
        var form = event.target;
        if (!(form instanceof HTMLFormElement) || form.hasAttribute("data-no-submit-feedback")) return;

        if (form.dataset.feedbackSubmitting === "true") {
            event.preventDefault();
            event.stopImmediatePropagation();
            notify("This request is already being processed.", "info", { detail: "No second submission was sent." });
            return;
        }

        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            showValidationSummary(form);
            return;
        }

        var submitter = event.submitter || form.querySelector('button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]');
        var afterSubmitHandlers = window.queueMicrotask || function (callback) { Promise.resolve().then(callback); };
        afterSubmitHandlers(function () {
            if (!event.defaultPrevented) setSubmitting(form, submitter);
        });
    }, true);

    document.addEventListener("input", function (event) {
        var field = event.target;
        if (field.matches && field.matches("input, select, textarea") && field.validity.valid) clearFieldError(field);
    });

    document.addEventListener("change", function (event) {
        var field = event.target;
        if (field.matches && field.matches("input, select, textarea") && field.validity.valid) clearFieldError(field);
    });

    document.addEventListener("click", function (event) {
        var blocked = event.target.closest('[aria-disabled="true"].is-submitting');
        if (blocked) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        var trigger = event.target.closest("[data-feedback-message]");
        if (trigger) notify(trigger.getAttribute("data-feedback-message"), trigger.getAttribute("data-feedback-type") || "info");
    }, true);

    window.addEventListener("pageshow", function (event) {
        if (event.persisted) document.querySelectorAll('form[data-feedback-submitting="true"]').forEach(resetFormState);
    });

    window.PoultryIQFeedback = {
        notify: notify,
        resetForm: resetFormState
    };
})();

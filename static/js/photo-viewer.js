(function () {
    "use strict";

    var viewer;
    var image;
    var title;
    var counter;
    var previousButton;
    var nextButton;
    var zoomButton;
    var activeTrigger = null;
    var gallery = [];
    var currentIndex = 0;
    var touchStartX = null;

    function triggers() {
        return Array.prototype.slice.call(document.querySelectorAll("[data-photo-preview]"));
    }

    function createViewer() {
        if (viewer) return;
        viewer = document.createElement("div");
        viewer.className = "photo-viewer";
        viewer.setAttribute("role", "dialog");
        viewer.setAttribute("aria-modal", "true");
        viewer.setAttribute("aria-labelledby", "photoViewerTitle");
        viewer.setAttribute("aria-hidden", "true");
        viewer.innerHTML =
            '<header class="photo-viewer__header">' +
                '<h2 class="photo-viewer__title" id="photoViewerTitle"></h2>' +
                '<div class="photo-viewer__actions">' +
                    '<button type="button" class="photo-viewer__button" data-photo-zoom aria-label="View actual image size" title="Actual size"><i class="bi bi-zoom-in"></i></button>' +
                    '<button type="button" class="photo-viewer__button" data-photo-close aria-label="Close photo"><i class="bi bi-x-lg"></i></button>' +
                '</div>' +
            '</header>' +
            '<div class="photo-viewer__stage" data-photo-stage>' +
                '<img class="photo-viewer__image" alt="">' +
            '</div>' +
            '<button type="button" class="photo-viewer__button photo-viewer__previous" data-photo-previous aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button>' +
            '<button type="button" class="photo-viewer__button photo-viewer__next" data-photo-next aria-label="Next photo"><i class="bi bi-chevron-right"></i></button>' +
            '<footer class="photo-viewer__footer"><span data-photo-counter></span><span aria-hidden="true"> · </span><span>Click the photo for actual size</span></footer>';
        document.body.appendChild(viewer);

        image = viewer.querySelector(".photo-viewer__image");
        title = viewer.querySelector(".photo-viewer__title");
        counter = viewer.querySelector("[data-photo-counter]");
        previousButton = viewer.querySelector("[data-photo-previous]");
        nextButton = viewer.querySelector("[data-photo-next]");
        zoomButton = viewer.querySelector("[data-photo-zoom]");

        viewer.querySelector("[data-photo-close]").addEventListener("click", close);
        viewer.querySelector("[data-photo-stage]").addEventListener("click", function (event) {
            if (event.target === event.currentTarget) close();
        });
        viewer.addEventListener("click", function (event) {
            if (!event.target.closest(".photo-viewer__button, .photo-viewer__image")) close();
        });
        image.addEventListener("click", toggleZoom);
        zoomButton.addEventListener("click", toggleZoom);
        previousButton.addEventListener("click", function () { show(currentIndex - 1); });
        nextButton.addEventListener("click", function () { show(currentIndex + 1); });
        viewer.addEventListener("touchstart", function (event) { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
        viewer.addEventListener("touchend", function (event) {
            if (touchStartX === null || gallery.length < 2) return;
            var distance = event.changedTouches[0].clientX - touchStartX;
            touchStartX = null;
            if (Math.abs(distance) > 55) show(currentIndex + (distance < 0 ? 1 : -1));
        }, { passive: true });
    }

    function sourceFor(trigger) {
        var thumbnail = trigger.querySelector("img");
        return trigger.dataset.photoSrc || (thumbnail && (thumbnail.currentSrc || thumbnail.src)) || "";
    }

    function labelFor(trigger) {
        var thumbnail = trigger.querySelector("img");
        return trigger.dataset.photoTitle || (thumbnail && thumbnail.alt) || "Photo preview";
    }

    function open(trigger) {
        createViewer();
        activeTrigger = trigger;
        var groupName = trigger.dataset.photoGroup;
        gallery = groupName ? triggers().filter(function (item) { return item.dataset.photoGroup === groupName; }) : [trigger];
        currentIndex = Math.max(0, gallery.indexOf(trigger));
        show(currentIndex);
        viewer.classList.add("is-open");
        viewer.setAttribute("aria-hidden", "false");
        document.body.classList.add("photo-viewer-open");
        viewer.querySelector("[data-photo-close]").focus();
    }

    function show(index) {
        if (!gallery.length) return;
        currentIndex = (index + gallery.length) % gallery.length;
        var trigger = gallery[currentIndex];
        image.classList.remove("is-actual-size");
        image.src = sourceFor(trigger);
        image.alt = labelFor(trigger);
        title.textContent = labelFor(trigger);
        counter.textContent = gallery.length > 1 ? "Photo " + (currentIndex + 1) + " of " + gallery.length : "Photo preview";
        previousButton.hidden = gallery.length < 2;
        nextButton.hidden = gallery.length < 2;
        updateZoomButton();
    }

    function updateZoomButton() {
        var zoomed = image.classList.contains("is-actual-size");
        zoomButton.setAttribute("aria-label", zoomed ? "Fit photo to screen" : "View actual image size");
        zoomButton.title = zoomed ? "Fit to screen" : "Actual size";
        zoomButton.innerHTML = '<i class="bi ' + (zoomed ? "bi-arrows-angle-contract" : "bi-zoom-in") + '"></i>';
    }

    function toggleZoom(event) {
        event.stopPropagation();
        image.classList.toggle("is-actual-size");
        updateZoomButton();
    }

    function close() {
        if (!viewer || !viewer.classList.contains("is-open")) return;
        viewer.classList.remove("is-open");
        viewer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("photo-viewer-open");
        image.removeAttribute("src");
        if (activeTrigger && activeTrigger.isConnected) activeTrigger.focus();
        activeTrigger = null;
    }

    document.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-photo-preview]");
        if (!trigger) return;
        event.preventDefault();
        open(trigger);
    });

    document.addEventListener("error", function (event) {
        if (event.target.matches("[data-photo-preview] img")) {
            event.target.closest("[data-photo-preview]").classList.add("is-missing");
        }
    }, true);

    document.addEventListener("keydown", function (event) {
        if (!viewer || !viewer.classList.contains("is-open")) return;
        if (event.key === "Escape") close();
        else if (event.key === "ArrowLeft" && gallery.length > 1) show(currentIndex - 1);
        else if (event.key === "ArrowRight" && gallery.length > 1) show(currentIndex + 1);
        else if (event.key === "Tab") {
            var controls = Array.prototype.slice.call(viewer.querySelectorAll("button:not([hidden])"));
            var first = controls[0];
            var last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
})();

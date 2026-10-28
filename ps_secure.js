
(function () {
    "use strict";

    function safeHref(value) {
        if (typeof value !== "string") return null;

        const raw = value.trim();
        if (!raw || /[\u0000-\u001F\u007F]/.test(raw)) {
            return null;
        }

        try {
            const url = new URL(raw, window.location.href);

            if (
                url.origin !== window.location.origin &&
                url.protocol !== "https:"
            ) {
                return null;
            }

            if (
                url.protocol !== "http:" &&
                url.protocol !== "https:"
            ) {
                return null;
            }

            if (url.username || url.password) {
                return null;
            }

            return url.href;
        } catch {
            return null;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );
    }

    function safeLink(label, href, className = "game-link") {
        const url = safeHref(href);
        const text = escapeHtml(label);

        if (!url) return text;

        const external =
            new URL(url).origin !== window.location.origin;

        const attributes = external
            ? ' target="_blank" rel="noopener noreferrer"'
            : "";

        return `<a class="${className}" href="${escapeHtml(url)}"${attributes}>${text}</a>`;
    }

    window.PSSEC = Object.freeze({
        safeHref,
        safeLink,
        escapeHtml
    });
})();
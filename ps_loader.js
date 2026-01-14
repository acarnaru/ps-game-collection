(function () {
    "use strict";

    function mainGenre(raw) {
        const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        const first = arr.find(x => String(x ?? "").trim());
        if (!first) return "";

        return String(first).split(",")[0].trim();
    }

    function toIndexRow(g) {
        return {
        title: g.title ?? "",
        platform: g.platform ?? "",
        format: g.format ?? "",

        genre: mainGenre(g.genre),

        version: g.version ?? "",
        included: Array.isArray(g.included) ? g.included : [],
        notes: Array.isArray(g.notes) ? g.notes : [],
        publisher: Array.isArray(g.publisher) ? g.publisher : (g.publisher ? [g.publisher] : [])
        };
    }

    window.PSLOAD = Object.freeze({
        getIndexData() {
        return {
            DATA: window.PSDB.games.map(toIndexRow),
            DATA_HARDWARE: window.PSDB.hardware
        };
        },
        getGameData() {
        return { DATA: window.PSDB.games };
        },
        getSkyData() {
        return { DATA: window.PSDB.sky };
        }
    });
})();

const { DATA } = PSLOAD.getHardData();

(function () {
const btn = document.getElementById("toTop");
if (!btn) return;

function getScrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
}

function showOrHide() {
    btn.classList.toggle("show", getScrollY() > 300);
}

window.addEventListener("scroll", showOrHide, { passive: true });
window.addEventListener("load", showOrHide);

btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});
})();

function escapeHtml(s) {
return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uniq(arr) {
const seen = new Set();
const out = [];
for (const x of (arr || [])) {
    const k = String(x ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
}
return out;
}

function norm(s){
return String(s ?? "").trim().toLowerCase();
}

function asArray(v){
if (Array.isArray(v)) return v;
if (v == null) return [];
const s = String(v).trim();
return s ? [s] : [];
}

function deviceKey(t) {
return String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function makeKey(h) {
    if (h.id) {
        return "hardware:" + String(h.id).trim();
    }
    return [h.device, (h.platform || ""), h.brand, (h.category || "")].join("||");
}

function getHashKey() {
const raw = (location.hash || "").replace(/^#/, "");
if (!raw) return "";
try { return decodeURIComponent(raw); } catch (e) { return raw; }
}

function setHashKey(key) {
location.hash = encodeURIComponent(key);
}

const byKey = new Map();
const byId = new Map();

for (const h of DATA) {
    const key = makeKey(h);

    if (byKey.has(key)) {
        console.error("Duplicate hardware key:", key, h);
    }

    byKey.set(key, h);

    if (h.id) {
        const id = norm(h.id);

        if (byId.has(id)) {
            console.error("Duplicate hardware ID:", id);
        }

        byId.set(id, key);
    }
}

const keysSorted = Array.from(byKey.keys()).sort((a, b) => {
    const da = byKey.get(a)?.device ?? "";
    const db = byKey.get(b)?.device ?? "";

    return deviceKey(da).localeCompare(deviceKey(db));
});

const platformAliases = new Map([
    ["ps3", "ps3"],
    ["ps4", "ps4"],
    ["ps5", "ps5"],
    ["vita", "vita"],
    ["ps vita", "vita"],
    ["pstv", "pstv"],
    ["ps tv", "pstv"],
    ["portal", "portal"],
    ["ps portal", "portal"]
]);

function normalisePlatform(value) {
    const key = norm(value).replace(/\s+/g, " ");
    return platformAliases.get(key) || key;
}

function hardwarePlatforms(h) {
    return asArray(h.platform).map(normalisePlatform);
}

function matchesHardwarePlatform(h, platform) {
    const requested = normalisePlatform(platform);

    return hardwarePlatforms(h).includes(requested);
}

function matchesDeviceName(device, requestedName) {
    const actual = deviceKey(device);
    const requested = deviceKey(requestedName);

    if (!requested) return false;

    return actual === requested ||
        actual.startsWith(requested + " ");
}

function resolveSeeAlsoToKey(entry) {

    const isObject =
        entry !== null &&
        typeof entry === "object" &&
        !Array.isArray(entry);

    if (isObject && entry.id) {
        return byId.get(norm(entry.id)) || null;
    }

    const raw = String(
        isObject
            ? (entry.device || entry.title || entry.label || "")
            : (entry || "")
    ).trim();

    if (!raw) return null;

    let requestedName = raw;
    let qualifier = "";

    const match = raw.match(/^(.*?)\s+\(([^)]+)\)\s*$/);

    if (match) {
        requestedName = match[1].trim();
        qualifier = match[2].trim();
    }

    let desiredPlatform = isObject
        ? String(entry.platform || "").trim()
        : "";

    let desiredBrand = isObject
        ? String(entry.brand || "").trim()
        : "";

    let desiredCategory = isObject
        ? String(entry.category || "").trim()
        : "";

    if (qualifier) {
        const parts = qualifier
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);

        for (const part of parts) {
            const token = norm(part).replace(/\s+/g, " ");

            if (platformAliases.has(token)) {
                desiredPlatform = part;
                continue;
            }

            const brandExists = DATA.some(
                h => norm(h.brand) === norm(part)
            );

            if (brandExists) {
                desiredBrand = part;
                continue;
            }

            const categoryExists = DATA.some(
                h => asArray(h.category).some(
                    c => norm(c) === norm(part)
                )
            );

            if (categoryExists) {
                desiredCategory = part;
                continue;
            }

            console.warn(
                "Unknown hardware qualifier:",
                part,
                "in",
                raw
            );

            return null;
        }
    }

    let matches = keysSorted
        .map(key => ({
            key,
            hard: byKey.get(key)
        }))
        .filter(x =>
            matchesDeviceName(x.hard.device, requestedName)
        );

    if (desiredPlatform) {
        matches = matches.filter(x =>
            matchesHardwarePlatform(x.hard, desiredPlatform)
        );
    }

    if (desiredBrand) {
        matches = matches.filter(x =>
            norm(x.hard.brand) === norm(desiredBrand)
        );
    }

    if (desiredCategory) {
        matches = matches.filter(x =>
            asArray(x.hard.category).some(
                c => norm(c) === norm(desiredCategory)
            )
        );
    }

    if (!matches.length) {
        console.warn("Hardware See Also not found:", raw);
        return null;
    }

    const exactMatches = matches.filter(x =>
        deviceKey(x.hard.device) === deviceKey(requestedName)
    );

    if (exactMatches.length) {
        matches = exactMatches;
    }

    if (matches.length === 1) {
        return matches[0].key;
    }

    console.warn(
        "Ambiguous hardware See Also:",
        raw,
        matches.map(x => x.hard.device)
    );

    return null;
}

function mapBrandsToLinks(brands) {
if (!Array.isArray(brands)) return [];

return brands
    .map(name => {
    const label = String(name || "").trim();
    if (!label) return null;

    const url = PSDB.manufacturerLinks?.[label] || "";

    return url ? { label, href: url } : label;
    })
    .filter(Boolean);
}

const NOTE_ID_MAP = {
"General": "general",
"Stock": "stock",
"3D Compatible": "3d",
"3D": "3d",
"PS Move": "move-game",
"PSVR2": "vr2-game",
"PSVR": "vr-game",
"uDraw": "udraw"
};

const GENRE_ABBR = {
"RPG":  "Role-Playing Game",
"JRPG": "Japanese-style Role-Playing Game",
"CRPG": "Computer Role-Playing Game",
"TRPG": "Tactical turn-based Role-Playing Game",
"ARPG": "Action Role-Playing Game",
"RTS":  "Real-Time Strategy",
"TBS":  "Turn-Based Strategy",
"TBT":  "Turn-Based Tactics",
"FPS":  "First-Person Shooter",
"MOBA": "Multiplayer Online Battle Arena",
"MMORPG": "Massive Multiplayer Online Role-Playing Game"
};

let genreTooltipEl = null;
let genreTooltipTarget = null;
let genreTooltipHandlersBound = false;

function ensureGenreTooltip(){
if (genreTooltipEl) return genreTooltipEl;
const tooltip = document.createElement("div");
tooltip.className = "genre-tooltip";
tooltip.setAttribute("role", "tooltip");
document.body.appendChild(tooltip);
genreTooltipEl = tooltip;
return tooltip;
}

function positionGenreTooltip(){
if (!genreTooltipTarget) return;
const tooltip = ensureGenreTooltip();
const rect = genreTooltipTarget.getBoundingClientRect();
const left = rect.left + rect.width / 2;
const top  = rect.top;
tooltip.style.left = `${left}px`;
tooltip.style.top  = `${top}px`;
}

function showGenreTooltip(target){
const tip = target.getAttribute("data-tip");
if (!tip) return;
const tooltip = ensureGenreTooltip();
genreTooltipTarget = target;
tooltip.textContent = tip;
tooltip.classList.add("show");
positionGenreTooltip();
}

function hideGenreTooltip(){
if (!genreTooltipEl) return;
genreTooltipEl.classList.remove("show");
genreTooltipTarget = null;
}

function bindGenreTooltipHandlers(){
if (genreTooltipHandlersBound) return;
genreTooltipHandlersBound = true;

document.addEventListener("mouseover", (e) => {
    const t = e.target.closest?.(".genre-abbr");
    if (t) showGenreTooltip(t);
});

document.addEventListener("mouseout", (e) => {
    const t = e.target.closest?.(".genre-abbr");
    if (t) hideGenreTooltip();
});

document.addEventListener("focusin", (e) => {
    const t = e.target.closest?.(".genre-abbr");
    if (t) showGenreTooltip(t);
});

document.addEventListener("focusout", (e) => {
    const t = e.target.closest?.(".genre-abbr");
    if (t) hideGenreTooltip();
});

window.addEventListener("scroll", () => {
    if (genreTooltipTarget) positionGenreTooltip();
}, { passive: true });

window.addEventListener("resize", () => {
    if (genreTooltipTarget) positionGenreTooltip();
}, { passive: true });
}

function genreAbbrHtmlize(escapedText){
return escapedText.replace(/\b([A-Za-z]{2,5})\b/g, (m) => {
    const key = m.toUpperCase();
    const tip = GENRE_ABBR[key];
    if (!tip) return m;
    return `<span class="genre-abbr" tabindex="0" data-tip="${escapeHtml(tip)}">${m}</span>`;
});
}

function notesOrTextHtml(x) {
let s = escapeHtml(String(x ?? ""));
s = genreAbbrHtmlize(s);

const entries = Object.entries(NOTE_ID_MAP)
    .sort((a, b) => b[0].length - a[0].length);

for (const [term, id] of entries) {
    const safeTerm = escapeHtml(term);
    s = s.split(safeTerm).join(`<a class="note-link" href="../ps_info/ps_notes.html#${id}">${safeTerm}</a>`);
}

return s;
}

function makeMini(title, items, extraClass=""){
const li = (items && items.length)
    ? items.map(x => {
        
    if (x && typeof x === "object" && x.href) {
        const label = x.label ?? x.href;

        return `<li>${PSSEC.safeLink(
            label,
            x.href,
            "game-link"
        )}</li>`;
    }

    return `<li>${notesOrTextHtml(x)}</li>`;
    }).join("")
    : "<li>—</li>";

    return `
    <div class="mini ${extraClass}">
        <h3 class="card-title mini-title">${escapeHtml(title)}</h3>
        <div class="mini-body">
        <ul class="mini-list">${li}</ul>
        </div>
    </div>
    `;
}

function renderHardware(key) {
let currentKey = key;

if (!currentKey || !byKey.has(currentKey)) {
    currentKey = keysSorted[0] || "";
    if (currentKey) setHashKey(currentKey);
}

const h = byKey.get(currentKey);
if (!h) return;

const titleEl = document.getElementById("hardTitle");
titleEl.textContent = h.device || "Hardware";

const i = keysSorted.indexOf(currentKey);
const prevKey = keysSorted[(i - 1 + keysSorted.length) % keysSorted.length];
const nextKey = keysSorted[(i + 1) % keysSorted.length];

document.getElementById("prevBtn").onclick = () => setHashKey(prevKey);
document.getElementById("nextBtn").onclick = () => setHashKey(nextKey);

const condition = (h.condition ? [h.condition] : []);
const platform = asArray(h.platform);
const brandItems = mapBrandsToLinks(asArray(h.brand));
const category = asArray(h.category);

let categoryItems = category.slice();

    if (Array.isArray(h.notes) && h.notes.length > 0) {
    const firstNote = String(h.notes[0] ?? "").trim();

    if (firstNote && categoryItems.some(c => norm(c) === "other")) {
        categoryItems = categoryItems.map(c => (norm(c) === "other" ? firstNote : c));
        categoryItems = [...new Set(categoryItems)];
    }
    }

const miniCondition = makeMini("Condition", condition, "mini-small");
const miniPlatform  = makeMini("Platform", platform, "mini-small");
const miniBrand     = makeMini("Brand", brandItems, "mini-small");
const miniCategory  = makeMini("Category", categoryItems, "mini-small");

const row = (arr) => `<div class="mini-row cols-${arr.length}">${arr.join("")}</div>`;
const miniHtml = [
    row([miniCondition, miniPlatform]),
    row([miniBrand, miniCategory])
].join("");

document.getElementById("miniGrid").innerHTML = miniHtml;

const additionalOnly = Array.isArray(h.additionalInfo) ? h.additionalInfo : [];

const additionalInfoList = document.getElementById("additionalInfo");
additionalInfoList.innerHTML = (additionalOnly && additionalOnly.length)
    ? additionalOnly.map(x => `<li>${notesOrTextHtml(x)}</li>`).join("")
    : "<li>—</li>";

const seeAlsoList = document.getElementById("seeAlso");
const seeAlso = Array.isArray(h.seeAlso) ? h.seeAlso : [];

if (seeAlso.length && seeAlso[0] !== "—") {
    seeAlsoList.innerHTML = seeAlso.map(entry => {
    const label = (entry && typeof entry === "object") ? (entry.label || entry.device || entry.title) : String(entry || "");
    const key = resolveSeeAlsoToKey(entry);

    if (!key) return `<li>${escapeHtml(label)}</li>`;
    return `<li><a class="game-link" href="#${encodeURIComponent(key)}">${escapeHtml(label)}</a></li>`;
    }).join("");
} else {
    seeAlsoList.innerHTML = "<li>—</li>";
}
}

bindGenreTooltipHandlers();

window.addEventListener("hashchange", () => renderHardware(getHashKey()));
renderHardware(getHashKey());

const backToTopBtn = document.getElementById("toTop");

function toggleBackToTop() {
if (!backToTopBtn) return;

const enabled = window.innerWidth <= 1024;
const scrolled = (window.pageYOffset || document.documentElement.scrollTop || 0) > 300;

backToTopBtn.classList.toggle("show", enabled && scrolled);
}

window.addEventListener("scroll", toggleBackToTop, { passive: true });
window.addEventListener("resize", toggleBackToTop);
window.addEventListener("load", toggleBackToTop);
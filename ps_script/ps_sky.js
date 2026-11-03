const { DATA } = PSLOAD.getSkyData();

const SKY = Array.isArray(DATA?.skylanders) ? DATA.skylanders : [];
const GAMES = Array.isArray(window.PSDB?.games) ? window.PSDB.games : [];

const GAME_SHORT = ["Spyro's Adventure","Giants","Swap Force","Trap Team","SuperChargers","Imaginators"];
const REGULAR_TAGS = new Set(["Anchors Away", "Big Bang", "Big Bubble", "Blizzard", "Bone Bash", "Core", "Deep Dive", "Double Dare", "Fire Bone", "Fizzy Frenzy", "Full Blast", "Giant", "Heavy Duty", "Hog Wild", "Horn Blast", "Hurricane", "Hyper Beam", "Knockout", "Lava Barf", "Lava Lance", "Mega Ram", "Mini", "Ninja", "Phantom", "Shark Shooter", "Skylander Sensei", "Super Gulp", "Super Shot", "SuperCharger", "Sure Shot", "Swapper", "Thorn Horn", "Tidal Wave", "Trap Master", "Turbo", "Twin Blade", "Villain Sensei"]);

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

btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

showOrHide();
})();

function escapeHtml(s){
return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function applySkyGameHighlights(root = document.body) {
const patterns = [
    { re: /(?:Skylanders\s*:?\s*)?Spyro(?:'|’|`|´)s?\s+Adventure/gi, cls: "sky-ssa" },
    { re: /(?:Skylanders\s*:?\s*)?Giants/gi, cls: "sky-giants" },
    { re: /(?:Skylanders\s*:?\s*)?Swap\s+Force/gi, cls: "sky-swapforce" },
    { re: /(?:Skylanders\s*:?\s*)?Trap\s+Team/gi, cls: "sky-trapteam" },
    { re: /(?:Skylanders\s*:?\s*)?Super\s*Chargers/gi, cls: "sky-superchargers" },
    { re: /(?:Skylanders\s*:?\s*)?Imaginators/gi, cls: "sky-imaginators" }
];

const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
    const p = node.parentElement;
    if (!p) return NodeFilter.FILTER_REJECT;
    const tag = p.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

    const t = node.nodeValue;
    if (!/(Spyro['’`´]s?\s+Adventure|Giants|Swap\s+Force|Trap\s+Team|Super\s*Chargers|Imaginators)/i.test(t)) {
        return NodeFilter.FILTER_REJECT;
    }

    return NodeFilter.FILTER_ACCEPT;
    }
});


const textNodes = [];
while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
}

const combinedPattern = new RegExp(
    patterns.map(p => `(?:${p.re.source})`).join("|"),
    "gi"
);

for (const node of textNodes) {
    const text = node.nodeValue;
    const matches = [...text.matchAll(combinedPattern)];

    if (!matches.length) continue;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of matches) {
        const index = match.index;
        const value = match[0];

        fragment.appendChild(
            document.createTextNode(
                text.slice(lastIndex, index)
            )
        );

        const pattern = patterns.find(p => {
            p.re.lastIndex = 0;
            return p.re.test(value);
        });

        if (pattern) {
            const span = document.createElement("span");
            span.className = pattern.cls;
            span.textContent = value;
            fragment.appendChild(span);
        } else {
            fragment.appendChild(
                document.createTextNode(value)
            );
        }

        lastIndex = index + value.length;
    }

    fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
    );

    node.replaceWith(fragment);
}
}

function cleanVal(v){
return String(v ?? "").trim().replace(/^\*/, "").trim();
}

function asArray(v){
if (Array.isArray(v)) return v;
if (v == null) return [];
const s = String(v).trim();
return s ? [s] : [];
}

function primaryFromArray(arr){
if (!Array.isArray(arr) || arr.length === 0) return "";
const starred = arr.find(x => String(x ?? "").trim().startsWith("*"));
return cleanVal(starred ?? arr[0]);
}

function fullSkylandersGameTitle(shortTitle){
const s = cleanVal(shortTitle);
if (!s) return "";
return "Skylanders: " + s;
}

function makeGameKey(g){
return [g.title, g.platform, (g.format||""), (g.version||"")].join("||");
}

function pickPreferredByPlatform(candidates){
const phys = candidates.find(x => String(x?.format||"").toLowerCase() === "physical");
return phys || candidates[0] || null;
}

const NO_PLATFORM_SUFFIX = new Set(["Spyro's Adventure","Giants"]);

function findAllSkylandersGameLinks(shortTitle){
const full = fullSkylandersGameTitle(shortTitle);
const short = cleanVal(shortTitle);
if (!full || !short) return [];

const all = GAMES.filter(x => (x?.title === full) && String(x?.platform||"").trim() !== "");
if (!all.length) return [];

const byPlat = new Map();
for (const g of all){
    const p = String(g.platform || "").trim();
    if (!p) continue;
    if (!byPlat.has(p)) byPlat.set(p, []);
    byPlat.get(p).push(g);
}

const platformOrder = ["PS3","PS4","PS5","Vita"];
const plats = Array.from(byPlat.keys()).sort((a,b) => {
    const ia = platformOrder.indexOf(a);
    const ib = platformOrder.indexOf(b);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    return ra - rb || a.localeCompare(b);
});

const out = [];
for (const plat of plats){
    const pick = pickPreferredByPlatform(byPlat.get(plat) || []);
    if (!pick) continue;
    const showSuffix = !(NO_PLATFORM_SUFFIX.has(short) && plats.length === 1);
    out.push({
    key: makeGameKey(pick),
    label: showSuffix ? `${short} (${plat})` : short
    });
}
return out;
}

function makeSkyKey(s){
const name = s?.name ?? "";
const variant = (s?.variant ?? "") || "Core";
const intro = primaryFromArray(s?.game);
return [name, variant, intro].join("||");
}

function getHashKey(){
const raw = (location.hash || "").replace(/^#/, "");
if (!raw) return "";
try { return decodeURIComponent(raw); } catch(e) { return raw; }
}

function setHashKey(key){
location.hash = encodeURIComponent(key);
}

const byKey = new Map();
const byName = new Map();

for (const s of SKY){
const k = makeSkyKey(s);
byKey.set(k, s);

const name = String(s?.name || "").trim();
if (!byName.has(name)) byName.set(name, []);
byName.get(name).push(s);
}

function gameSortIndex(g){
const ix = GAME_SHORT.indexOf(g);
return ix === -1 ? 999 : ix;
}

function chooseDefaultRegularEntry(name){
const list = byName.get(name) || [];
if (!list.length) return null;

function isRegularVariant(v){
    const vv = String(v || "").trim();
    return REGULAR_TAGS.has(vv);
}

const regulars = list.filter(x => isRegularVariant(x?.variant));
if (regulars.length) {
    const sortedRegulars = [...regulars].sort((a,b) => {
    const ai = gameSortIndex(primaryFromArray(a.game));
    const bi = gameSortIndex(primaryFromArray(b.game));
    if (ai !== bi) return ai - bi;

    const av = String(a.variant || "").toLowerCase();
    const bv = String(b.variant || "").toLowerCase();
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
    });
    return sortedRegulars[0];
}

const sortedAll = [...list].sort((a,b) => {
    const ai = gameSortIndex(primaryFromArray(a.game));
    const bi = gameSortIndex(primaryFromArray(b.game));
    if (ai !== bi) return ai - bi;

    const av = String(a.variant || "").toLowerCase();
    const bv = String(b.variant || "").toLowerCase();
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
});

return sortedAll[0];
}

function resolveSeeAlsoToKey(entry){
const raw = String(entry || "").trim();
if (!raw) return null;

let baseName = raw;
let qualifier = "";
const m = raw.match(/^(.*)\s\(([^)]+)\)\s*$/);
if (m) {
    baseName = m[1].trim();
    qualifier = m[2].trim();
}

const list = byName.get(baseName) || [];
if (!list.length) return null;

if (!qualifier) {
    const def = chooseDefaultRegularEntry(baseName);
    return def ? makeSkyKey(def) : null;
}

if (GAME_SHORT.includes(qualifier)) {
    const inThatGame = list.filter(x => primaryFromArray(x.game) === qualifier);

    const regular = inThatGame.find(x => REGULAR_TAGS.has(String(x?.variant || "").trim()));
    const pick = regular || inThatGame[0] || null;

    return pick ? makeSkyKey(pick) : null;
}

const qLower = qualifier.toLowerCase();
const match = list.find(x => String(x?.variant || "").trim().toLowerCase() === qLower) || null;
if (match) return makeSkyKey(match);

const def = chooseDefaultRegularEntry(baseName);
return def ? makeSkyKey(def) : null;
}

function renderMini(title, value){
const safeTitle = escapeHtml(title);
const safeValue = escapeHtml(value || "");
return (
    '<div class="mini">' +
    '<div class="mini-title">' + safeTitle + '</div>' +
    '<div class="mini-body">' +
        '<div class="mini-value">' + (safeValue || '—') + '</div>' +
    '</div>' +
    '</div>'
);
}

function renderMiniRow(minisArr){
return `<div class="mini-row cols-${minisArr.length}">${minisArr.join("")}</div>`;
}

function renderSkylander(s){
const titleEl = document.getElementById('skyTitle');
const grid = document.getElementById('miniGrid');
const compat = document.getElementById('compatList');
const build = document.getElementById('buildList');
const see = document.getElementById('seeAlso');

if (!s){
    if (titleEl) titleEl.textContent = 'Skylander Not Found';
    if (grid) grid.innerHTML = '';
    if (compat) compat.innerHTML = '<li>—</li>';
    if (build) build.innerHTML = '<li>—</li>';
    if (see) see.innerHTML = '<li>—</li>';
    return;
}

const introduced = primaryFromArray(s.game);
const variant = (s.variant || '') || 'Core';

if (titleEl) titleEl.textContent = s.name || "Skylander";

const r1 = [
    renderMini("Condition", s.condition),
    renderMini("Series", s.series),
    renderMini("Base", s.base),
];

const r2 = [
    renderMini("Element", s.element),
    renderMini("Variant", variant),
    renderMini("Type", s.type || ""),
];

const r3 = [
    renderMini("Introduced", introduced),
    renderMini("Hat", s.hat || ""),
];

if (grid) grid.innerHTML = renderMiniRow(r1) + renderMiniRow(r2) + renderMiniRow(r3);

const games = asArray(s.game).map(cleanVal).filter(Boolean);
const compatLis = games.flatMap(g => {
    const labelBase = cleanVal(g);
    const links = findAllSkylandersGameLinks(g);

    if (links.length){
    return links.map(({key, label}) => {
        const href = '../ps_game/ps_game.html#' + encodeURIComponent(key);
        return `<li><a class="row-link" href="${href}">${escapeHtml(label)}</a></li>`;
    });
    }

    return [`<li>${escapeHtml(labelBase)}</li>`];
}).join('');
compat.innerHTML = compatLis || '<li>—</li>';

const buildArr = asArray(s.build).map(cleanVal).filter(Boolean);
const buildLis = buildArr.map(x => '<li>' + escapeHtml(x) + '</li>').join('');
build.innerHTML = buildLis || '<li>—</li>';
applySkyGameHighlights(build);

const seeArr = asArray(s.seeAlso).map(x => String(x || '').trim()).filter(Boolean);
const seeLis = seeArr.map(x => {
    const k = resolveSeeAlsoToKey(x);
    if (k && byKey.has(k)) {
    const href = 'ps_sky.html#' + encodeURIComponent(k);
    return '<li><a class="row-link" href="' + href + '">' + escapeHtml(x) + '</a></li>';
    }
    return '<li>' + escapeHtml(x) + '</li>';
}).join('');
see.innerHTML = seeLis || '<li>—</li>';
}

const ORDERED_KEYS = [...byKey.keys()].sort((ka, kb) => {
const a = byKey.get(ka);
const b = byKey.get(kb);

const an = String(a?.name || '').toLowerCase();
const bn = String(b?.name || '').toLowerCase();
if (an < bn) return -1;
if (an > bn) return 1;

const av = String(a?.variant || '').toLowerCase();
const bv = String(b?.variant || '').toLowerCase();
if (av < bv) return -1;
if (av > bv) return 1;

const ag = gameSortIndex(primaryFromArray(a?.game));
const bg = gameSortIndex(primaryFromArray(b?.game));
return ag - bg;
});

function currentIndex(){
const k = getHashKey();
return ORDERED_KEYS.indexOf(k);
}

function ensureValidHash(){
const k = getHashKey();
if (k && byKey.has(k)) return k;
if (ORDERED_KEYS.length) {
    setHashKey(ORDERED_KEYS[0]);
    return ORDERED_KEYS[0];
}
return '';
}

function renderFromHash(){
const k = ensureValidHash();
const s = byKey.get(k) || null;
renderSkylander(s);

const n = ORDERED_KEYS.length;
const prev = document.getElementById('prevBtn');
const next = document.getElementById('nextBtn');
if (prev) prev.disabled = (n <= 1);
if (next) next.disabled = (n <= 1);
}

document.getElementById('prevBtn').addEventListener('click', () => {
const n = ORDERED_KEYS.length;
if (n <= 1) return;

const i = currentIndex();
const j = (i <= 0) ? (n - 1) : (i - 1);
setHashKey(ORDERED_KEYS[j]);
});

document.getElementById('nextBtn').addEventListener('click', () => {
const n = ORDERED_KEYS.length;
if (n <= 1) return;

const i = currentIndex();
const j = (i === -1 || i >= n - 1) ? 0 : (i + 1);
setHashKey(ORDERED_KEYS[j]);
});

window.addEventListener('hashchange', renderFromHash);
renderFromHash();
const switchEl = document.getElementById("modeSwitch");
const games = document.getElementById("gamesContent");
const hardware = document.getElementById("hardwareContent");
const subTitle = document.getElementById("subTitle");
(function applyModeFromUrl(){
try{
    const params = new URLSearchParams(location.search);
    const mode = (params.get("mode") || "").toLowerCase();
    if (mode === "games") switchEl.checked = false;
    if (mode === "hardware") switchEl.checked = true;
}catch(e){}
})();

const formatGroup = document.getElementById("formatGroup");
const hardwareGroup = document.getElementById("hardwareGroup");
const sortSelect = document.getElementById("sort");

function setGamesDropdown() {
const genres = Array.from(new Set(
    DATA.flatMap(r => asArray(r.genre).map(x => String(x).trim()).filter(Boolean))
)).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const opts = [{ value: "All", label: "Genre: All" }, ...genres.map(g => ({ value: g, label: `Genre: ${g}` }))];

sortSelect.replaceChildren(
    ...opts.map(o => {
        const option = document.createElement("option");
        option.value = String(o.value);
        option.textContent = String(o.label);
        return option;
    })
);

const values = new Set(opts.map(o => o.value));
if (!values.has(state.genre)) state.genre = "All";
sortSelect.value = state.genre;

const arrowBtn = document.getElementById("titleSort");
if (arrowBtn) {
    arrowBtn.textContent = (state.titleDir === "asc") ? "▼" : "▲";
    if (!arrowBtn.dataset.bound) {
    arrowBtn.dataset.bound = "1";
    arrowBtn.addEventListener("click", () => {
        state.titleDir = (state.titleDir === "asc") ? "desc" : "asc";
        arrowBtn.textContent = (state.titleDir === "asc") ? "▼" : "▲";
        render();
    });
    }
}
}

function setHardwareDropdown() {
const brands = Array.from(new Set(DATA_HARDWARE.map(r => r.brand).filter(Boolean)))
    .sort((a,b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
const opts = [{ value: "All", label: "Brand: All" }, ...brands.map(b => ({ value: b, label: `Brand: ${b}` }))];

sortSelect.replaceChildren(
    ...opts.map(o => {
        const option = document.createElement("option");
        option.value = String(o.value);
        option.textContent = String(o.label);
        return option;
    })
);

const values = new Set(opts.map(o => o.value));
if (!values.has(state.brand)) state.brand = "All";
sortSelect.value = state.brand;
}

function updateModeUI() {
const isHardware = switchEl.checked;
const filterMeta = document.getElementById("filterMeta");
const alphaGroup = document.getElementById("alphaGroup");
const statsEl = document.getElementById("stats");

games.style.display = isHardware ? "none" : "block";
hardware.style.display = isHardware ? "block" : "none";

filterMeta.style.display = "";

subTitle.textContent = isHardware ? "Hardware Catalogue" : "Games Catalogue";
document.title = subTitle.textContent;

formatGroup.style.display = isHardware ? "none" : "";
if (hardwareGroup) hardwareGroup.style.display = isHardware ? "flex" : "none";
if (alphaGroup) alphaGroup.style.display = isHardware ? "none" : "";

if (isHardware) setHardwareDropdown();
else setGamesDropdown();

renderChips();
if (isHardware) renderHardware();
else render();
}

switchEl.addEventListener("change", updateModeUI);
(function enableToggleSwipe(){
const switchWrap = document.querySelector(".switch");
const knobTravel = 34;
let startedChecked = false;
const toggleWrap = document.querySelector(".mode-toggle");
if (!toggleWrap) return;

let startX = 0, startY = 0, lastX = 0, lastY = 0;
let tracking = false;

function threshold(){
    return Math.max(35, Math.min(90, Math.round(window.innerWidth * 0.06)));
}

function startedOnInteractive(target){
    if (!target) return false;
    if (target.closest(".switch")) return false;

    return !!(
    target.closest("a") ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("select") ||
    target.closest("textarea") ||
    target.closest("label")
    );
}

function onStartFromPoint(pt){
    startX = lastX = pt.clientX;
    startY = lastY = pt.clientY;
    startedChecked = switchEl.checked;
    tracking = true;

    if (switchWrap) switchWrap.classList.add("dragging");
}

function onStart(e){
    if (startedOnInteractive(e.target)) return;
    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
    onStartFromPoint(pt);
}

function onMove(e){
    if (!tracking) return;

    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
    lastX = pt.clientX;
    lastY = pt.clientY;

    const dx = lastX - startX;
    const dy = lastY - startY;

    const isHorizontal = Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2;
    if (isHorizontal) e.preventDefault();

    const base = startedChecked ? knobTravel : 0;
    let pos = base + dx;
    pos = Math.max(0, Math.min(knobTravel, pos));

    if (switchWrap) {
    const knob = switchWrap.querySelector(".slider");
    if (knob) {
        knob.style.setProperty("--knobX", pos + "px");
        knob.classList.add("dragging-knob");
    }
    }
}

function onEnd(){
    if (!tracking) return;
    tracking = false;

    const dx = lastX - startX;
    const dy = lastY - startY;

    const commit = Math.abs(dx) >= threshold() && Math.abs(dx) > Math.abs(dy) * 1.2;

    if (commit) {
    const wantHardware = dx > 0;
    if (switchEl.checked !== wantHardware) {
        switchEl.checked = wantHardware;
        updateModeUI();
    }
    } else {
    if (switchEl.checked !== startedChecked) {
        switchEl.checked = startedChecked;
        updateModeUI();
    }
    }

    if (switchWrap) switchWrap.classList.remove("dragging");
    const knob = switchWrap ? switchWrap.querySelector(".slider") : null;
    if (knob) {
    knob.classList.remove("dragging-knob");
    knob.style.removeProperty("--knobX");
    }
}

toggleWrap.addEventListener("touchstart", onStart, { passive: true });
toggleWrap.addEventListener("touchmove", onMove, { passive: false });
toggleWrap.addEventListener("touchend", onEnd, { passive: true });
toggleWrap.addEventListener("touchcancel", () => { tracking = false; }, { passive: true });

toggleWrap.addEventListener("pointerdown", (e) => {
    if (startedOnInteractive(e.target)) return;
    onStartFromPoint(e);
}, { passive: true });

toggleWrap.addEventListener("pointermove", (e) => {
    onMove(e);
}, { passive: false });

toggleWrap.addEventListener("pointerup", (e) => {
    onEnd(e);
}, { passive: true });

toggleWrap.addEventListener("pointercancel", () => { tracking = false; }, { passive: true });

window.addEventListener("resize", () => { tracking = false; }, { passive: true });
})();

updateModeUI();
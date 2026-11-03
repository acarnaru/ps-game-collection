(function () {
const btn = document.getElementById("toTop");
if (!btn) return;
    function showOrHide() {
        btn.classList.toggle("show", (window.pageYOffset || document.documentElement.scrollTop || 0) > 300);
    }
    window.addEventListener("scroll", showOrHide, { passive: true });
    showOrHide();
    btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();

(function () {
const nav = document.querySelector(".notes-sticky");
if (!nav) return;

    function setH() {
        const h = Math.ceil(nav.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--notesStickyH", h + "px");
        document.documentElement.style.setProperty("--notesAnchor", (h + 8) + "px");
    }

window.addEventListener("resize", setH, { passive: true });
window.addEventListener("load", setH);
window.addEventListener("orientationchange", setH);

if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(setH);
    ro.observe(nav);
}

setH();
})();
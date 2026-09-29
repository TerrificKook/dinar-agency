"use strict";

// This site only provides direct contacts. No analytics or browser attribution storage.
document.documentElement.classList.add("js");
document.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("#currentYear");
    if (year) year.textContent = String(new Date().getFullYear());
    initNavigation();
    initEmailReveal();
    initVisualMotion();
});

function initVisualMotion() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !("IntersectionObserver" in window) || !Element.prototype.animate || !CSS.supports("translate", "0 1px")) return;
    const compact = window.matchMedia("(max-width: 800px), (pointer: coarse)");
    const targets = document.querySelectorAll(".hero-screen-main, .hero-screen-secondary, .project-visual .browser-frame, .audit-document, .flow-art");
    const playing = new Set();
    let remaining = targets.length;
    const dispose = () => {
        if (!remaining && !playing.size) reduced.removeEventListener("change", stop);
    };
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            remaining -= 1;
            // Content is visible before, during and after the optional effect.
            // Individual translate preserves the original rotation of the screens.
            if (!reduced.matches && !document.hidden) {
                const small = compact.matches;
                const isImage = entry.target.matches(".hero-screen-main, .hero-screen-secondary, .browser-frame");
                const animation = entry.target.animate([
                    { translate: `0 ${small ? 8 : 18}px`, opacity: isImage ? .84 : 1 },
                    { translate: "0 0", opacity: 1 }
                ], {
                    duration: small ? 360 : 620,
                    delay: !small && entry.target.matches(".hero-screen-secondary") ? 100 : 0,
                    easing: "cubic-bezier(.2,.7,.2,1)",
                    fill: "backwards"
                });
                playing.add(animation);
                const finished = () => { playing.delete(animation); dispose(); };
                animation.finished.then(finished, finished);
            }
        });
        if (!remaining) observer.disconnect();
        dispose();
    }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
    function stop() {
        if (!reduced.matches) return;
        observer.disconnect();
        remaining = 0;
        playing.forEach(animation => animation.cancel());
        reduced.removeEventListener("change", stop);
    }
    reduced.addEventListener("change", stop);
    targets.forEach(target => observer.observe(target));
    dispose();
}


function initNavigation() {
    const toggle = document.querySelector("#navToggle");
    const menu = document.querySelector("#navMenu");
    const mobile = window.matchMedia("(max-width: 800px)");
    const setOpen = (open, returnFocus = false) => {
        menu.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
        if (open) menu.querySelector("a")?.focus();
        else if (returnFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true", true));
    menu.addEventListener("click", event => {
        if (event.target.closest("a") && mobile.matches) setOpen(false, true);
    });
    document.addEventListener("click", event => {
        if (toggle.getAttribute("aria-expanded") === "true" && !event.target.closest(".site-header")) setOpen(false, true);
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (toggle.getAttribute("aria-expanded") === "true") { event.preventDefault(); setOpen(false, true); return; }
            const disclosure = document.activeElement?.closest("details[open]");
            if (disclosure) { disclosure.open = false; disclosure.querySelector("summary")?.focus(); }
        }
        if (event.key === "Tab" && toggle.getAttribute("aria-expanded") === "true" && mobile.matches) {
            const items = [toggle, ...menu.querySelectorAll("a"), document.querySelector(".header-contact")];
            const index = items.indexOf(document.activeElement);
            event.preventDefault();
            items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
        }
    });
    mobile.addEventListener("change", () => setOpen(false));
}

function decodeContact(encoded) { try { return atob(encoded || "").trim(); } catch { return ""; } }

function initEmailReveal() {
    document.querySelectorAll("[data-email-b64]").forEach(block => {
        const button = block.querySelector("[data-email-reveal]");
        const link = block.querySelector("[data-email-link]");
        if (!button || !link) return;
        button.addEventListener("click", () => {
            const email = decodeContact(block.dataset.emailB64);
            if (!email.includes("@")) return;
            link.textContent = email;
            link.href = `mailto:${email}`;
            link.hidden = false;
            button.hidden = true;
            link.focus();
        });
    });
}

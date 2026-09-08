"use strict";

document.documentElement.classList.add("js");
const SOURCE_KEY = "dinarAgencySourceV05";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid"];
let sourceState;
let rememberSource = false;
let recentPreparations = [];

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#currentYear").textContent = String(new Date().getFullYear());
    initSource();
    initNavigation();
    initEmailReveal();
    initContactForm();
    initAnalytics();
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

function cleanValue(value, max = 120) {
    return String(value || "").replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, max);
}
function cleanTag(value) {
    // Campaign labels are not a place for personal contacts.
    return cleanValue(value).replace(/[^\s@]+@[^\s@]+/g, "[скрыто]").replace(/\+?\d[\d ()-]{8,}\d/g, "[скрыто]");
}
function campaignValue(key, value) {
    if (key === "yclid") return cleanValue(value).replace(/[^a-zA-Z0-9_-]/g, "");
    return cleanTag(value);
}
function currentSource() {
    const query = new URLSearchParams(location.search);
    const campaign = {};
    CAMPAIGN_KEYS.forEach(key => { const value = campaignValue(key, query.get(key)); if (value) campaign[key] = value; });
    let referrer = "";
    try { const url = new URL(document.referrer); if (/^https?:$/.test(url.protocol) && url.hostname !== location.hostname) referrer = url.hostname; } catch { /* A direct visit has no referrer. */ }
    return { campaign, landing: cleanValue(location.pathname, 200), referrer: cleanValue(referrer, 160) };
}
function validStoredSource(value) {
    if (!value || typeof value !== "object" || typeof value.landing !== "string" || !value.landing.startsWith("/")) return null;
    const campaign = {};
    CAMPAIGN_KEYS.forEach(key => { const tag = campaignValue(key, value.campaign?.[key]); if (tag) campaign[key] = tag; });
    let referrer = "";
    if (typeof value.referrer === "string" && /^[a-z0-9.-]+$/i.test(value.referrer)) referrer = value.referrer.slice(0,160);
    return { campaign, landing: cleanValue(value.landing.split(/[?#]/)[0], 200), referrer };
}
function initSource() {
    const current = currentSource();
    sourceState = { first: current, last: Object.keys(current.campaign).length ? current : null };
    try {
        const saved = JSON.parse(sessionStorage.getItem(SOURCE_KEY) || "null");
        if (saved?.consent === true) {
            const first = validStoredSource(saved.first);
            if (first) { rememberSource = true; sourceState.first = first; sourceState.last = Object.keys(current.campaign).length ? current : validStoredSource(saved.last); }
        }
    } catch { /* Storage is optional. */ }
    const checkbox = document.querySelector("#rememberSource");
    checkbox.checked = rememberSource;
    if (rememberSource) persistSource();
    checkbox.addEventListener("change", () => {
        rememberSource = checkbox.checked;
        if (rememberSource) persistSource();
        else {
            try { sessionStorage.removeItem(SOURCE_KEY); } catch { /* Memory only. */ }
            sourceState = { first: current, last: Object.keys(current.campaign).length ? current : null };
            document.querySelector("#sourceStatus").textContent = "Источник больше не запоминается между страницами. Подготовка сообщения доступна.";
        }
    });
}
function persistSource() {
    if (!rememberSource) return;
    try {
        sessionStorage.setItem(SOURCE_KEY, JSON.stringify({ consent: true, ...sourceState }));
        document.querySelector("#sourceStatus").textContent = "Источник запоминается в этой вкладке. Можно отключить в любой момент.";
    } catch {
        document.querySelector("#sourceStatus").textContent = "Браузер не сохраняет источник между страницами. Сообщение можно подготовить с данными текущей страницы.";
    }
}
function sourceMessage() {
    const describe = (label, record) => {
        if (!record) return [];
        const tags = CAMPAIGN_KEYS.filter(key => record.campaign[key]).map(key => `${key}: ${record.campaign[key]}`);
        return [label, `Первая страница этого перехода: ${record.landing}`, ...(record.referrer ? [`Внешний источник (домен): ${record.referrer}`] : []), ...(tags.length ? tags : [record.referrer ? "Рекламных меток нет" : "Прямой или неизвестный источник; меток нет"])];
    };
    return ["Источник обращения", ...describe("Первый доступный источник:", sourceState.first), ...describe("Последний явный рекламный переход:", sourceState.last), `Текущая страница: ${cleanValue(location.pathname, 200)}`].join("\n");
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
            link.dataset.analyticsGoal = "contact_email_draft";
            link.hidden = false;
            button.hidden = true;
            link.focus();
            if (!button.dataset.analyticsGoal) reachGoal("email_reveal_footer");
        });
    });
}
function normalizeSite(value) {
    const raw = value.trim();
    if (!raw) return "";
    if (/[\s\u0000-\u001f\\]/.test(raw) || (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw))) throw new Error("Укажите обычный адрес сайта: example.ru или https://example.ru. Разрешены только HTTP и HTTPS.");
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error("Проверьте адрес сайта. Укажите домен без логина и пароля.");
    return url.href;
}
function setFormStatus(element, message, isError = false) { element.textContent = message; element.classList.toggle("is-error", isError); }
function buildContactMessage(form) {
    const labels = { name:"Имя", company:"Компания", interest:"Интерес", site_url:"Сайт", message:"Задача", contact:"Контакт для ответа" };
    const lines = ["Здравствуйте, Динар!", "Хочу обсудить сайт.", ""];
    Object.entries(labels).forEach(([name,label]) => { const value=form.elements.namedItem(name)?.value.trim(); if(value) lines.push(`${label}: ${value}`); });
    return [...lines, "", sourceMessage()].join("\n");
}
function recentStoredPreparations() {
    try {
        const values = JSON.parse(localStorage.getItem("dinarAgencyContactSubmits") || "[]");
        return Array.isArray(values) ? values.filter(t => Number.isFinite(t) && Date.now() - t < 3600000 && t <= Date.now()).slice(-5) : [];
    } catch { return []; }
}
function canPrepare() {
    recentPreparations = recentPreparations.filter(t => Date.now() - t < 3600000);
    return Math.max(recentPreparations.length, recentStoredPreparations().length) < 5;
}
function rememberPreparation() {
    const now = Date.now();
    recentPreparations.push(now);
    // Preserve the existing anti-spam timestamp limit. No form or attribution data.
    try { localStorage.setItem("dinarAgencyContactSubmits", JSON.stringify([...recentStoredPreparations(), now].slice(-5))); } catch { /* The in-memory limit remains available. */ }
}
function initContactForm() {
    const form = document.querySelector("#contactForm");
    const status = document.querySelector("#formStatus");
    const preview = document.querySelector("#messagePreview");
    const message = document.querySelector("#preparedMessage");
    const site = form.elements.site_url;
    const interest = form.elements.interest;
    const startedAt = Date.now();
    form.elements.form_started_at.value = String(startedAt);
    form.querySelector('[type="submit"]').disabled = false;
    const syncRequirement = () => {
        site.required = form.dataset.audit === "true" || interest.value === "Разбор сайта и план";
        document.querySelector("#siteUrlLabel").textContent = site.required ? "Адрес сайта *" : "Адрес сайта (если есть)";
        site.setCustomValidity("");
    };
    syncRequirement();
    interest.addEventListener("change", syncRequirement);
    document.querySelectorAll("[data-contact-interest]").forEach(link => link.addEventListener("click", () => { interest.value=link.dataset.contactInterest; syncRequirement(); }));
    let startTracked = false;
    form.addEventListener("input", event => {
        if (event.target === site || event.target === form.elements.message) event.target.setCustomValidity("");
        if (!startTracked && event.target.name !== "company_website") { startTracked = true; reachGoal(form.dataset.analyticsStartGoal); }
    });
    const emailLink = preview.querySelector('[data-contact-channel="email"]');
    let emailDraftUrl = "";
    const updateEmail = () => {
        const email = decodeContact(document.querySelector('.direct-contacts [data-email-b64]').dataset.emailB64);
        const draft = `mailto:${email}?subject=${encodeURIComponent("Запрос по сайту - Dinar.agency")}&body=${encodeURIComponent(message.value)}`;
        emailDraftUrl = draft.length <= 1900 ? draft : `mailto:${email}?subject=${encodeURIComponent("Запрос по сайту - Dinar.agency")}`;
        emailLink.dataset.pasteRequired = String(draft.length > 1900);
    };
    form.addEventListener("submit", event => {
        event.preventDefault();
        setFormStatus(status, "");
        try { site.value = normalizeSite(site.value); site.setCustomValidity(""); } catch(error) { site.setCustomValidity(error.message || "Проверьте адрес сайта"); site.reportValidity(); return; }
        if (!form.elements.message.value.trim()) form.elements.message.setCustomValidity("Коротко опишите задачу.");
        if (!form.reportValidity()) return;
        if (form.elements.company_website.value.trim()) { setFormStatus(status,"Не удалось подготовить текст. Можно написать напрямую по контактам рядом.",true); return; }
        if (Date.now() - startedAt < 4000) { setFormStatus(status,"Проверьте текст и нажмите кнопку ещё раз через несколько секунд.",true); return; }
        if (!canPrepare()) { setFormStatus(status,"Можно отредактировать уже готовый текст или написать напрямую. Повторная подготовка станет доступна позже.",true); return; }
        rememberPreparation();
        message.value = buildContactMessage(form);
        preview.hidden = false;
        updateEmail();
        setFormStatus(status,"Текст готов ниже. Проверьте его перед отправкой.");
        reachGoal("contact_message_prepare", { page: form.dataset.audit === "true" ? "audit" : "home" });
        message.focus({preventScroll:true});
        preview.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    });
    message.addEventListener("input", updateEmail);
    document.querySelector("#copyMessage").addEventListener("click", async () => {
        const copied = await copyText(message.value);
        setFormStatus(document.querySelector("#copyStatus"), copied ? "Текст скопирован. Вставьте его в выбранный канал." : "Копирование недоступно. Текст выделен: скопируйте его вручную (Ctrl+C или меню телефона).");
        if (!copied) { message.focus({preventScroll:true}); message.select(); }
        reachGoal("contact_message_copy", { copied });
    });
    preview.querySelectorAll("[data-contact-channel]").forEach(link => link.addEventListener("click", () => {
        const channel = link.dataset.contactChannel;
        if (channel === "email") {
            updateEmail();
            // A button keeps the private draft out of automatic link tracking.
            // The return value cannot confirm whether a mail application opened.
            try { window.open(emailDraftUrl, "_self", "noopener"); } catch { /* The editable preview and copy action remain available. */ }
        }
        const hint = channel === "email" && link.dataset.pasteRequired === "true" ? "Для длинного сообщения скопируйте текст и вставьте его в письмо вручную." : "Если приложение открылось, вставьте текст и отправьте его сами. Если нет - используйте прямые контакты рядом.";
        setFormStatus(document.querySelector("#copyStatus"),hint);
        reachGoal(form.dataset.analyticsSubmitGoal.replace(/telegram$/,channel), { channel });
    }));
}
async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { return false; }
    return false;
}
function reachGoal(name, params = {}) {
    if (!name) return;
    try { if(typeof window.ym === "function") window.ym(109675049,"reachGoal",name,params); } catch { /* Analytics must never interrupt a contact action. */ }
    try { if(typeof window.gtag === "function") window.gtag("event",name,params); } catch { /* Independent transport. */ }
}
function initAnalytics() {
    document.addEventListener("click", event => { const target=event.target.closest("[data-analytics-goal]"); if(target) reachGoal(target.dataset.analyticsGoal); });
    document.querySelectorAll(".faq-list details").forEach((item,index) => item.addEventListener("toggle", () => { if(item.open) reachGoal("faq_open",{item:index+1}); }));
    const goals = new Map([["audience","scroll_audience"],["services","scroll_services"],["work","scroll_work"],["process","scroll_process"],["ownership","scroll_ownership"],["about","scroll_about"],["direct","scroll_direct"],["faq","scroll_faq"],["contact","scroll_contact"]]);
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){reachGoal(goals.get(entry.target.id));observer.unobserve(entry.target);} }),{threshold:.15});
    goals.forEach((goal,id) => { const section=document.getElementById(id);if(section)observer.observe(section); });
}

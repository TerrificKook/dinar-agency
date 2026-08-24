"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initCurrentYear();
    initHeader();
    initMobileNavigation();
    initEmailReveal();
    initContactIntents();
    initContactForm();
    initAnalytics();
});

function initCurrentYear() {
    const year = document.querySelector("#currentYear");
    if (year) {
        year.textContent = String(new Date().getFullYear());
    }
}

function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const updateHeader = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
}

function initMobileNavigation() {
    const toggle = document.querySelector("#navToggle");
    const menu = document.querySelector("#navMenu");
    if (!toggle || !menu) return;

    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.append(overlay);

    const setMenuState = (isOpen) => {
        toggle.classList.toggle("is-open", isOpen);
        menu.classList.toggle("is-open", isOpen);
        overlay.classList.toggle("is-open", isOpen);
        document.body.classList.toggle("menu-open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");

        if (isOpen) {
            menu.querySelector("a")?.focus();
        }
    };

    const closeMenu = () => setMenuState(false);

    toggle.addEventListener("click", () => {
        setMenuState(!menu.classList.contains("is-open"));
    });

    overlay.addEventListener("click", closeMenu);
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu.classList.contains("is-open")) {
            closeMenu();
            toggle.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900 && menu.classList.contains("is-open")) {
            closeMenu();
        }
    });
}

function initEmailReveal() {
    document.querySelectorAll("[data-email-b64]").forEach((block) => {
        const revealButton = block.querySelector("[data-email-reveal]");
        const emailLink = block.querySelector("[data-email-link]");
        if (!revealButton || !emailLink) return;

        revealButton.addEventListener("click", () => {
            const email = decodeContact(block.getAttribute("data-email-b64"));
            if (!email || !email.includes("@")) return;

            emailLink.textContent = email;
            emailLink.href = `mailto:${email}`;
            emailLink.hidden = false;
            revealButton.hidden = true;
            reachGoal("email_reveal_footer");
        });
    });
}

function initContactIntents() {
    const interest = document.querySelector('#contactForm [name="interest"]');
    if (!interest) return;

    document.querySelectorAll("[data-contact-interest]").forEach((link) => {
        link.addEventListener("click", () => {
            const selectedInterest = link.getAttribute("data-contact-interest");
            const optionExists = Array.from(interest.options)
                .some((option) => option.value === selectedInterest);

            if (optionExists) {
                interest.value = selectedInterest;
            }
        });
    });
}

function initContactForm() {
    const form = document.querySelector("#contactForm");
    const status = document.querySelector("#formStatus");
    const emailButton = document.querySelector("#emailDraftButton");
    if (!form) return;

    const formStartGoal = form.getAttribute("data-analytics-start-goal") || "contact_form_start";
    const formSubmitGoal = form.getAttribute("data-analytics-submit-goal") || "contact_form_telegram";

    const startedAt = Date.now();
    const startedInput = form.elements.namedItem("form_started_at");
    if (startedInput) {
        startedInput.value = String(startedAt);
    }

    let formStartTracked = false;
    form.addEventListener("input", () => {
        if (!formStartTracked) {
            reachGoal(formStartGoal);
            formStartTracked = true;
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setFormStatus(status, "");

        if (!form.reportValidity()) return;

        const honeypot = form.elements.namedItem("company_website");
        if (honeypot?.value.trim()) {
            setFormStatus(status, "Не удалось подготовить сообщение. Обновите страницу и попробуйте ещё раз.", true);
            return;
        }

        if (Date.now() - startedAt < 4000) {
            setFormStatus(status, "Проверьте поля и отправьте форму ещё раз через несколько секунд.", true);
            return;
        }

        if (!canSubmitContactForm()) {
            setFormStatus(status, "Лимит подготовленных сообщений достигнут. Напишите напрямую в Telegram.", true);
            return;
        }

        const message = buildContactMessage(form);
        const telegramWindow = window.open("https://t.me/mrdinar", "_blank", "noopener");
        const copied = await copyText(message);

        if (copied) {
            rememberContactSubmit();
            setFormStatus(status, telegramWindow
                ? "Текст скопирован. Вставьте его в открывшийся диалог Telegram."
                : "Текст скопирован. Откройте Telegram и отправьте его пользователю @mrdinar.");
            reachGoal(formSubmitGoal, { copied: true });
        } else {
            setFormStatus(status, "Telegram открыт, но браузер не разрешил копирование. Скопируйте данные из полей вручную.", true);
            reachGoal(formSubmitGoal, { copied: false });
        }
    });

    emailButton?.addEventListener("click", () => {
        const email = decodeContact(emailButton.getAttribute("data-email-b64"));
        if (!email || !email.includes("@")) return;

        const message = buildContactMessage(form);
        const subject = "Запрос по сайту - Dinar.agency";
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        reachGoal("contact_email_draft");
    });
}

function buildContactMessage(form) {
    const data = new FormData(form);
    const value = (name) => String(data.get(name) || "").trim() || "не указано";

    return [
        "Здравствуйте, Динар!",
        "",
        "Хочу обсудить сайт.",
        `Имя: ${value("name")}`,
        `Компания / деятельность: ${value("company")}`,
        `Интерес: ${value("interest")}`,
        `Существующий сайт: ${value("site_url")}`,
        `Задача: ${value("message")}`,
        `Контакт для ответа: ${value("contact")}`
    ].join("\n");
}

function setFormStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
}

function canSubmitContactForm() {
    try {
        const key = "dinarAgencyContactSubmits";
        const now = Date.now();
        const hour = 60 * 60 * 1000;
        const recent = JSON.parse(localStorage.getItem(key) || "[]")
            .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < hour);
        return recent.length < 5;
    } catch {
        return true;
    }
}

function rememberContactSubmit() {
    try {
        const key = "dinarAgencyContactSubmits";
        const now = Date.now();
        const hour = 60 * 60 * 1000;
        const recent = JSON.parse(localStorage.getItem(key) || "[]")
            .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < hour);
        recent.push(now);
        localStorage.setItem(key, JSON.stringify(recent));
    } catch {
        // Local storage can be disabled. The form still works without client-side throttling.
    }
}

async function copyText(text) {
    if (!text) return false;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        const temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.append(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        return copied;
    } catch {
        return false;
    }
}

function decodeContact(encoded) {
    if (!encoded) return "";
    try {
        return atob(encoded).trim();
    } catch {
        return "";
    }
}

function initAnalytics() {
    document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-analytics-goal]");
        if (!target) return;

        reachGoal(target.getAttribute("data-analytics-goal"), {
            text: target.textContent.trim().slice(0, 80)
        });
    });

    document.querySelectorAll(".faq-list details").forEach((item, index) => {
        item.addEventListener("toggle", () => {
            if (item.open) {
                reachGoal("faq_open", { item: index + 1 });
            }
        });
    });

    const sectionGoals = new Map([
        ["audience", "scroll_audience"],
        ["services", "scroll_services"],
        ["work", "scroll_work"],
        ["process", "scroll_process"],
        ["ownership", "scroll_ownership"],
        ["about", "scroll_about"],
        ["direct", "scroll_direct"],
        ["faq", "scroll_faq"],
        ["contact", "scroll_contact"]
    ]);

    if (!("IntersectionObserver" in window)) return;

    const seen = new Set();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting || seen.has(entry.target.id)) return;
            seen.add(entry.target.id);
            reachGoal(sectionGoals.get(entry.target.id));
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.28 });

    sectionGoals.forEach((goal, sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) observer.observe(section);
    });
}

function reachGoal(goalName, params = {}) {
    if (!goalName) return;

    if (typeof window.ym === "function") {
        window.ym(109675049, "reachGoal", goalName, params);
    }

    if (typeof window.gtag === "function") {
        window.gtag("event", goalName, params);
    }
}

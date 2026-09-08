"use strict";

// Local previews never contact analytics services. Production IDs are unchanged.
(() => {
    if (!["dinar.agency", "www.dinar.agency"].includes(location.hostname)) return;
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid"];
    const safeUrl = new URL(location.pathname, location.origin);
    const query = new URLSearchParams(location.search);
    keys.forEach(key => {
        let value = (query.get(key) || "").replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0,120);
        value = key === "yclid" ? value.replace(/[^a-zA-Z0-9_-]/g, "") : value.replace(/[^\s@]+@[^\s@]+/g, "[скрыто]").replace(/\+?\d[\d ()-]{8,}\d/g, "[скрыто]");
        if (value) safeUrl.searchParams.set(key, value);
    });
    let referrer = "";
    try { const ref = new URL(document.referrer); if (/^https?:$/.test(ref.protocol)) referrer = ref.origin + "/"; } catch { /* Direct visit. */ }
    try {
        window.ym = window.ym || function() { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        const tag = document.createElement("script");
        tag.async = true;
        tag.src = "https://mc.yandex.ru/metrika/tag.js?id=109675049";
        document.head.append(tag);
        window.ym(109675049, "init", { ssr:true, webvisor:true, clickmap:true, referrer, url:safeUrl.href, accurateTrackBounce:true, trackLinks:true });
    } catch { /* The page remains usable without analytics. */ }
    try {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
        const tag = document.createElement("script");
        tag.async = true;
        tag.src = "https://www.googletagmanager.com/gtag/js?id=G-1CB6EWXD6X";
        document.head.append(tag);
        window.gtag("js", new Date());
        window.gtag("config", "G-1CB6EWXD6X", { page_location:safeUrl.href, page_referrer:referrer });
    } catch { /* Independent transport. */ }
})();

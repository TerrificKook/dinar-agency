document.addEventListener("DOMContentLoaded", () => {
  const content = window.FISHKI_CONTENT || {};
  const catalogItems = Array.isArray(content.catalog) ? content.catalog : [];
  const tips = Array.isArray(content.tips) ? content.tips : [];
  const pdfs = Array.isArray(content.pdfs) ? content.pdfs : [];

  const state = {
    filter: "Все",
    search: "",
    activeCard: null
  };

  const selectors = {
    catalogGrid: document.querySelector("#catalogGrid"),
    filterRow: document.querySelector("#filterRow"),
    searchInput: document.querySelector("#catalogSearch"),
    emptyState: document.querySelector("#emptyState"),
    pdfGrid: document.querySelector("#pdfGrid"),
    toast: document.querySelector("#toast"),
    modal: document.querySelector("#cardModal"),
    modalCategory: document.querySelector("#modalCategory"),
    modalTitle: document.querySelector("#modalTitle"),
    modalDescription: document.querySelector("#modalDescription"),
    modalText: document.querySelector("#modalText"),
    modalCopy: document.querySelector("#modalCopy"),
    modalClose: document.querySelector("#modalClose"),
    tipText: document.querySelector("#tipText"),
    randomTipButton: document.querySelector("#randomTipButton"),
    promptForm: document.querySelector("#promptForm"),
    promptResult: document.querySelector("#promptResult"),
    copyGeneratedPrompt: document.querySelector("#copyGeneratedPrompt"),
    catalogCount: document.querySelector("#catalogCount"),
    pdfCount: document.querySelector("#pdfCount")
  };

  applyLinks();
  renderStats();
  renderFilters();
  renderCatalog();
  renderPdfs();
  bindCatalogEvents();
  bindPromptEvents();
  bindModalEvents();
  bindTipEvents();
  initReveal();
  initHeaderScroll();
  initAnalytics();

  function applyLinks() {
    const telegram = content.links?.telegram || "https://t.me/mrdinar";
    const contact = content.links?.contact || "https://t.me/mrdinar";

    document.querySelectorAll("[data-tg-link]").forEach((link) => {
      link.href = telegram;
    });

    document.querySelectorAll("[data-contact-link]").forEach((link) => {
      link.href = contact;
    });
  }

  function renderStats() {
    if (selectors.catalogCount) {
      selectors.catalogCount.textContent = catalogItems.length ? String(catalogItems.length) : "—";
    }

    if (selectors.pdfCount) {
      const available = pdfs.filter((item) => item.href).length;
      selectors.pdfCount.textContent = available ? String(available) : "—";
    }
  }

  function getCategories() {
    return ["Все", ...new Set(catalogItems.map((item) => item.category))];
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderFilters() {
    if (!selectors.filterRow) return;

    selectors.filterRow.innerHTML = getCategories()
      .map((filter) => {
        const active = filter === state.filter ? " is-active" : "";
        return `<button class="filter-btn${active}" type="button" data-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`;
      })
      .join("");
  }

  function matchesItem(item) {
    const search = normalize(state.search);
    const haystack = normalize(`${item.category} ${item.title} ${item.description} ${item.text}`);
    const categoryMatch = state.filter === "Все" || item.category === state.filter;
    const searchMatch = !search || haystack.includes(search);
    return categoryMatch && searchMatch;
  }

  function renderCatalog() {
    if (!selectors.catalogGrid) return;

    const items = catalogItems.filter(matchesItem);
    selectors.catalogGrid.innerHTML = items
      .map((item) => {
        const index = catalogItems.indexOf(item);
        return `
          <article class="catalog-card">
            <span class="card-category">${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <div class="card-actions">
              <button class="btn btn-primary btn-small" type="button" data-copy="${index}">Скопировать</button>
              <button class="btn btn-small" type="button" data-open="${index}">Открыть</button>
            </div>
          </article>
        `;
      })
      .join("");

    if (selectors.emptyState) {
      const hasActiveSearch = Boolean(normalize(state.search)) || state.filter !== "Все";

      if (!catalogItems.length) {
        selectors.emptyState.textContent = "Раздел наполняется.";
        selectors.emptyState.hidden = false;
      } else {
        selectors.emptyState.textContent = "По этому запросу ничего не нашлось. Попробуйте другое слово или сбросьте фильтр.";
        selectors.emptyState.hidden = items.length > 0 || !hasActiveSearch;
      }
    }
  }

  function renderPdfs() {
    if (!selectors.pdfGrid) return;

    if (!pdfs.length) {
      selectors.pdfGrid.innerHTML = '<p class="empty-state">Раздел наполняется.</p>';
      return;
    }

    selectors.pdfGrid.innerHTML = pdfs
      .map((item) => {
        const isAvailable = Boolean(item.href);
        const statusClass = isAvailable ? "status-badge" : "status-badge status-soon";
        const action = isAvailable
          ? `<a class="btn btn-primary btn-small" href="${escapeHtml(item.href)}" data-analytics-goal="fishki_pdf_open">${escapeHtml(item.action)}</a>`
          : `<button class="btn btn-small is-disabled" type="button" disabled>${escapeHtml(item.action)}</button>`;

        return `
          <article class="pdf-card">
            <span class="${statusClass}">${escapeHtml(item.status)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <div class="card-actions">${action}</div>
          </article>
        `;
      })
      .join("");
  }

  function bindCatalogEvents() {
    if (selectors.filterRow) {
      selectors.filterRow.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        state.filter = button.dataset.filter;
        renderFilters();
        renderCatalog();
        reachGoal("fishki_filter_click", { filter: state.filter });
      });
    }

    if (selectors.searchInput) {
      selectors.searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        renderCatalog();
      });
    }

    if (selectors.catalogGrid) {
      selectors.catalogGrid.addEventListener("click", (event) => {
        const copyButton = event.target.closest("[data-copy]");
        const openButton = event.target.closest("[data-open]");

        if (copyButton) {
          const item = catalogItems[Number(copyButton.dataset.copy)];
          copyText(item.text, copyButton, "fishki_prompt_copy");
        }

        if (openButton) {
          openCard(Number(openButton.dataset.open), openButton);
          reachGoal("fishki_prompt_open");
        }
      });
    }
  }

  function openCard(index, trigger) {
    const item = catalogItems[index];
    if (!item || !selectors.modal) return;

    state.activeCard = item;
    state.modalTrigger = trigger || null;
    selectors.modalCategory.textContent = item.category;
    selectors.modalTitle.textContent = item.title;
    selectors.modalDescription.textContent = item.description;
    selectors.modalText.textContent = item.text;
    selectors.modal.classList.add("is-open");
    selectors.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    selectors.modalClose?.focus();
  }

  function closeCard() {
    if (!selectors.modal) return;

    selectors.modal.classList.remove("is-open");
    selectors.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    state.activeCard = null;
    state.modalTrigger?.focus();
    state.modalTrigger = null;
  }

  function bindModalEvents() {
    selectors.modalCopy?.addEventListener("click", () => {
      if (state.activeCard) {
        copyText(state.activeCard.text, selectors.modalCopy, "fishki_prompt_copy_modal");
      }
    });

    selectors.modalClose?.addEventListener("click", closeCard);

    selectors.modal?.addEventListener("click", (event) => {
      if (event.target === selectors.modal) {
        closeCard();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && selectors.modal?.classList.contains("is-open")) {
        closeCard();
      }
    });
  }

  function bindTipEvents() {
    if (!selectors.randomTipButton || !selectors.tipText || !tips.length) return;

    selectors.tipText.textContent = tips[0];
    selectors.randomTipButton.addEventListener("click", () => {
      const current = selectors.tipText.textContent.trim();
      const pool = tips.filter((tip) => tip !== current);
      const nextTip = pool[Math.floor(Math.random() * pool.length)] || tips[0];
      selectors.tipText.textContent = nextTip;
      selectors.tipText.classList.remove("is-changing");
      void selectors.tipText.offsetWidth;
      selectors.tipText.classList.add("is-changing");
      reachGoal("fishki_random_tip");
    });
  }

  function bindPromptEvents() {
    selectors.promptForm?.addEventListener("submit", (event) => {
      event.preventDefault();

      const task = document.querySelector("#taskInput")?.value.trim() || "[задача]";
      const audience = document.querySelector("#audienceInput")?.value.trim() || "[для кого]";
      const place = document.querySelector("#placeInput")?.value.trim() || "[где]";
      const tone = document.querySelector("#toneInput")?.value.trim() || "[тон]";
      const ban = document.querySelector("#banInput")?.value.trim() || "[что нельзя]";

      selectors.promptResult.textContent =
        `Ты опытный помощник для малого бизнеса. Мне нужно: ${task}.\n` +
        `Результат нужен для: ${audience}.\n` +
        `Будет использоваться здесь: ${place}.\n` +
        `Тон ответа: ${tone}.\n` +
        `Нельзя: ${ban}.\n` +
        "Сначала уточни, если данных не хватает. Потом дай готовый результат, который можно сразу использовать.";

      selectors.promptResult.classList.remove("is-changing");
      void selectors.promptResult.offsetWidth;
      selectors.promptResult.classList.add("is-changing");
      reachGoal("fishki_prompt_generator");
    });

    selectors.copyGeneratedPrompt?.addEventListener("click", () => {
      copyText(selectors.promptResult?.textContent.trim(), selectors.copyGeneratedPrompt, "fishki_generated_prompt_copy");
    });
  }

  async function copyText(text, button, goalName) {
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      button?.classList.add("copied");
      window.setTimeout(() => button?.classList.remove("copied"), 450);
      showToast("Скопировано. Можно вставлять в ChatGPT.");
      reachGoal(goalName);
    } catch (error) {
      showToast("Не получилось скопировать. Выделите текст вручную.");
    }
  }

  function showToast(message) {
    if (!selectors.toast) return;

    selectors.toast.textContent = message;
    selectors.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      selectors.toast.classList.remove("is-visible");
    }, 2200);
  }

  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!items.length || reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
  }

  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
      header.classList.toggle("is-scrolled", window.scrollY > 20);
    }, { passive: true });
  }

  function initAnalytics() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-analytics-goal]");
      if (!target) return;

      reachGoal(target.getAttribute("data-analytics-goal"), {
        text: target.textContent.trim(),
        href: target.getAttribute("href") || ""
      });
    });
  }

  function reachGoal(goalName, params = {}) {
    if (!goalName || typeof window.ym !== "function") return;

    window.ym(109675049, "reachGoal", goalName, params);
  }
});

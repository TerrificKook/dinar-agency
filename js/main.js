// =========================================
// dinar.agency — Main JavaScript
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initNavbarScroll();
    initSmoothScroll();
    initScrollAnimations();
    initEmailReveal();
    initContactFormProtection();
});

// ==================
// Mobile Menu
// ==================
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    
    if (!toggle || !menu) return;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
    
    function openMenu() {
        toggle.classList.add('active');
        menu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMenu() {
        toggle.classList.remove('active');
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    toggle.addEventListener('click', () => {
        if (menu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    
    overlay.addEventListener('click', closeMenu);
    
    // Close menu when clicking a nav link
    menu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
            closeMenu();
        }
    });
}

// ==================
// Navbar Scroll Effect
// ==================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    let lastScrollY = 0;
    let ticking = false;
    
    function updateNavbar() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show on scroll direction (only after 300px)
        if (currentScrollY > 300) {
            if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 5) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive: true });
}

// ==================
// Smooth Scrolling
// ==================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ==================
// Scroll Animations
// ==================
function initScrollAnimations() {
    // Mark elements for animation
    const animateSelectors = [
        '.service-card',
        '.audience-card',
        '.about-content',
        '.contact-card',
        '.value-item'
    ];
    
    animateSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('animate-on-scroll');
        });
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the animation
                const siblings = Array.from(entry.target.parentElement.children)
                    .filter(child => child.classList.contains('animate-on-scroll'));
                const idx = siblings.indexOf(entry.target);
                
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, idx * 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ==================
// Email Reveal
// ==================
function initEmailReveal() {
    const card = document.getElementById('emailCard');
    const revealBtn = document.getElementById('showEmailBtn');
    const emailLink = document.getElementById('emailLink');

    if (!card || !revealBtn || !emailLink) return;

    revealBtn.addEventListener('click', () => {
        const user = card.dataset.emailUser;
        const domain = card.dataset.emailDomain;
        const zone = card.dataset.emailZone;
        const email = `${user}@${domain}.${zone}`;

        emailLink.textContent = email;
        emailLink.href = `mailto:${email}`;
        emailLink.hidden = false;
        revealBtn.hidden = true;
    });
}

// ==================
// Contact Form Anti-bot
// ==================
function initContactFormProtection() {
    const form = document.getElementById('contactForm');
    const startedAt = document.getElementById('formStartedAt');
    const status = document.getElementById('formStatus');

    if (!form || !startedAt || !status) return;

    startedAt.value = String(Date.now());

    function setStatus(message, type = '') {
        status.textContent = message;
        status.classList.remove('is-error', 'is-success');
        if (type) {
            status.classList.add(type);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        const honeypot = String(data.get('company_website') || '').trim();
        if (honeypot.length > 0) {
            setStatus('Заявка отклонена.', 'is-error');
            return;
        }

        const started = Number(data.get('form_started_at') || 0);
        const elapsed = Date.now() - started;
        if (!started || elapsed < 4000) {
            setStatus('Слишком быстрая отправка. Попробуйте через несколько секунд.', 'is-error');
            return;
        }

        const tokenField = form.querySelector('[name="cf-turnstile-response"]');
        if (!tokenField || !tokenField.value) {
            setStatus('Подтвердите, что вы не робот (Turnstile).', 'is-error');
            return;
        }

        const now = Date.now();
        const storageKey = 'contactFormSubmissions';
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]').filter((t) => now - t < 3600000);
        if (existing.length >= 5) {
            setStatus('Слишком много отправок с этого устройства. Повторите позже.', 'is-error');
            return;
        }
        existing.push(now);
        localStorage.setItem(storageKey, JSON.stringify(existing));

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            form.reset();
            startedAt.value = String(Date.now());
            setStatus('Спасибо! Заявка отправлена. Отвечу в ближайшее время.', 'is-success');
        } catch (error) {
            setStatus('Не удалось отправить форму. Напишите в Telegram, если ошибка повторится.', 'is-error');
        }
    });
}

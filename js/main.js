// =========================================
// dinar.agency — Main JavaScript
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initNavbarScroll();
    initSmoothScroll();
    initScrollAnimations();
    initEmailFallback();
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
// Cloudflare Email Fallback
// ==================
function initEmailFallback() {
    const protectedNodes = Array.from(document.querySelectorAll('.__cf_email__'));
    if (!protectedNodes.length) return;

    const hasUnresolvedEmail = protectedNodes.some((node) => needsEmailFallback(node));
    if (!hasUnresolvedEmail) return;

    protectedNodes.forEach((node) => {
        const fallbackEmail = buildFallbackEmail(node);
        if (!fallbackEmail) return;

        node.textContent = fallbackEmail;

        const fallbackLink = node.closest('a[data-email-fallback]') || node.closest('a[href*="/cdn-cgi/l/email-protection"]');
        if (fallbackLink) {
            fallbackLink.setAttribute('href', `mailto:${fallbackEmail}`);
        }
    });

    document.querySelectorAll('a[data-email-fallback], a[href*="/cdn-cgi/l/email-protection"]').forEach((link) => {
        if (!isProtectedEmailLink(link)) return;

        const fallbackEmail = buildFallbackEmail(link);
        if (!fallbackEmail) return;

        link.setAttribute('href', `mailto:${fallbackEmail}`);
    });
}

function needsEmailFallback(node) {
    const rawText = (node.textContent || '').replace(/ /g, ' ').trim().toLowerCase();
    return rawText.includes('[email protected]') || rawText.includes('[email protected]') || rawText.includes('[email');
}

function buildFallbackEmail(node) {
    const fallback = node.getAttribute('data-email-fallback');
    if (!fallback) return '';

    const parts = fallback.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 2) return '';

    return `${parts[0]}@${parts[1]}`;
}

function isProtectedEmailLink(link) {
    const href = link.getAttribute('href') || '';
    return href.includes('/cdn-cgi/l/email-protection');
}

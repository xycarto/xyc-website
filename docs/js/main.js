/* ============================================================
   main.js — shared across all pages
   ============================================================ */

// ----------------------------------------------------------
// 1. NAV — add .scrolled class when page is scrolled down
// ----------------------------------------------------------
(function () {
    const nav = document.getElementById('site-nav');
    if (!nav) return;

    function updateNav() {
        nav.classList.toggle('scrolled', window.scrollY > 20);
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
}());


// ----------------------------------------------------------
// 2. MOBILE MENU — hamburger toggle
// ----------------------------------------------------------
(function () {
    const toggle = document.getElementById('nav-toggle');
    const links  = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen);
    });

    links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
            links.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}());


// ----------------------------------------------------------
// 3. GALLERY — disable right-click on images
// ----------------------------------------------------------
(function () {
    document.addEventListener('contextmenu', function (e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
}());
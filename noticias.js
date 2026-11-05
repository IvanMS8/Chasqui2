/**
 * CHASQUI UI/UX
 * Noticias — script independiente
 * (menú, efectos de scroll, animaciones de aparición y ajuste de publicaciones)
 */

"use strict";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsObserver = "IntersectionObserver" in window;

/* =========================================
   1. Navegación responsive
   ========================================= */

function initNavigation() {
    const header = document.querySelector(".site-header");
    const menuToggle = document.querySelector(".menu-toggle");
    const navigation = document.querySelector("#primary-navigation");

    if (!menuToggle || !navigation) return;

    const mobileBreakpoint = window.matchMedia("(max-width: 1100px)");

    const isOpen = () => menuToggle.getAttribute("aria-expanded") === "true";

    function setMenuState(open) {
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute(
            "aria-label",
            open ? "Cerrar menú de navegación" : "Abrir menú de navegación"
        );
        navigation.classList.toggle("is-open", open);
    }

    menuToggle.addEventListener("click", () => setMenuState(!isOpen()));

    // Cerrar al elegir un enlace
    navigation.addEventListener("click", (event) => {
        if (event.target.closest("a") && mobileBreakpoint.matches) {
            setMenuState(false);
        }
    });

    // Cerrar con Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen()) {
            setMenuState(false);
            menuToggle.focus();
        }
    });

    // Cerrar al tocar fuera del header
    document.addEventListener("click", (event) => {
        if (isOpen() && header && !header.contains(event.target)) {
            setMenuState(false);
        }
    });

    // Evitar que quede abierto al pasar a escritorio
    mobileBreakpoint.addEventListener("change", (event) => {
        if (!event.matches) setMenuState(false);
    });
}

/* =========================================
   2. Header con sombra y barra de progreso
   ========================================= */

function initScrollEffects() {
    const header = document.querySelector(".site-header");

    const progressBar = document.createElement("div");
    progressBar.className = "scroll-progress";
    progressBar.setAttribute("aria-hidden", "true");
    document.body.prepend(progressBar);

    let ticking = false;

    function update() {
        const scrollTop = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        progressBar.style.transform = `scaleX(${maxScroll > 0 ? scrollTop / maxScroll : 0})`;
        header?.classList.toggle("is-scrolled", scrollTop > 8);
        ticking = false;
    }

    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        },
        { passive: true }
    );

    update();
}

/* =========================================
   3. Aparición de contenido al hacer scroll
   - [data-reveal]  → anima el elemento (up | left | right | zoom)
   - [data-stagger] → anima a sus hijos uno tras otro
   ========================================= */

function initReveal() {
    document.querySelectorAll("[data-stagger]").forEach((group) => {
        const variant = group.dataset.stagger || "up";

        [...group.children].forEach((child, index) => {
            child.dataset.reveal = child.dataset.reveal || variant;
            child.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 110}ms`);
        });
    });

    const items = document.querySelectorAll("[data-reveal]");

    if (!supportsObserver || prefersReducedMotion.matches) {
        items.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            });
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((item) => observer.observe(item));
}

/* =========================================
   Publicaciones de Facebook: se dibujan a su tamaño real
   y se escalan para caber en pantallas angostas
   ========================================= */

function initEmbeds() {
    document.querySelectorAll("[data-embed]").forEach((frame) => {
        const nativeWidth = Number(frame.dataset.width);
        const nativeHeight = Number(frame.dataset.height);
        if (!nativeWidth || !nativeHeight) return;

        function fit() {
            const scale = Math.min(1, frame.clientWidth / nativeWidth);
            frame.style.setProperty("--embed-scale", scale.toFixed(4));
            frame.style.height = `${Math.round(nativeHeight * scale)}px`;
        }

        fit();

        // Se observa la tarjeta (no el marco) para no generar bucles al cambiar la altura
        if ("ResizeObserver" in window) {
            new ResizeObserver(fit).observe(frame.parentElement);
        } else {
            window.addEventListener("resize", fit);
        }
    });
}

/* =========================================
   Inicio
   ========================================= */

initNavigation();
initScrollEffects();
initReveal();
initEmbeds();

/**
 * CHASQUI UI/UX
 * Scripts globales. Cada módulo se activa solo si encuentra sus elementos,
 * por lo que este archivo se puede cargar en todas las páginas.
 */

"use strict";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsObserver = "IntersectionObserver" in window;

/* =========================================
   0. Slider del hero (4 imágenes)
   ========================================= */

function initHeroSlider() {
    const hero = document.querySelector(".hero");
    const slide = hero?.querySelector(".hero__slide");
    const images = hero ? [...hero.querySelectorAll(".hero__background")] : [];

    if (images.length < 2) return;

    const total = images.length;
    const autoplay = !prefersReducedMotion.matches;

    // Motivos por los que el avance automático se detiene (basta uno)
    const pauseReasons = { manual: false, controls: false, offscreen: false, hidden: false };

    let current = Math.max(0, images.findIndex((image) => image.classList.contains("is-active")));
    let leaveTimer;

    /* ---- Controles ---- */

    const icon = (path) =>
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ` +
        `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

    const controls = document.createElement("div");
    controls.className = "hero__controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Controles de las imágenes del encabezado");

    controls.innerHTML = `
        <button class="hero__arrow hero__arrow--prev" type="button" aria-label="Imagen anterior">
            ${icon('<path d="M15 5l-7 7 7 7"/>')}
        </button>
        <div class="hero__dots">
            ${images.map((_, index) => `
                <button class="hero__dot" type="button" aria-label="Ir a la imagen ${index + 1} de ${total}">
                    <span class="hero__dot-bar"><span class="hero__dot-fill"></span></span>
                </button>`).join("")}
        </div>
        <button class="hero__arrow hero__arrow--next" type="button" aria-label="Imagen siguiente">
            ${icon('<path d="M9 5l7 7-7 7"/>')}
        </button>
        ${autoplay ? `
        <button class="hero__pause" type="button" aria-pressed="false" aria-label="Pausar cambio automático">
            <span class="icon-pause">${icon('<path d="M9 5v14M15 5v14"/>')}</span>
            <span class="icon-play">${icon('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>')}</span>
        </button>` : ""}
    `;

    slide.append(controls);

    const dotsWrapper = controls.querySelector(".hero__dots");
    const dots = [...controls.querySelectorAll(".hero__dot")];
    const pauseButton = controls.querySelector(".hero__pause");

    /* ---- Cambio de imagen ---- */

    function goTo(index) {
        const next = (index + total) % total;
        if (next === current) return;

        const previous = images[current];

        // La anterior se queda visible debajo mientras la nueva aparece (disolución limpia)
        images.forEach((image) => image.classList.remove("is-leaving"));
        previous.classList.remove("is-active");
        previous.classList.add("is-leaving");

        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => previous.classList.remove("is-leaving"), 1300);

        images[next].classList.add("is-active");
        current = next;
        updateDots();
    }

    function updateDots() {
        dots.forEach((dot, index) => {
            const active = index === current;
            dot.classList.toggle("is-active", active);
            if (active) dot.setAttribute("aria-current", "true");
            else dot.removeAttribute("aria-current");
        });
    }

    updateDots();

    controls.querySelector(".hero__arrow--prev").addEventListener("click", () => goTo(current - 1));
    controls.querySelector(".hero__arrow--next").addEventListener("click", () => goTo(current + 1));
    dots.forEach((dot, index) => dot.addEventListener("click", () => goTo(index)));

    // Flechas del teclado cuando el foco está en los controles
    controls.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") goTo(current - 1);
        if (event.key === "ArrowRight") goTo(current + 1);
    });

    // Deslizar con el dedo (solo pantallas táctiles)
    let startX = 0;
    let startY = 0;

    slide.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") return;
        startX = event.clientX;
        startY = event.clientY;
    });

    slide.addEventListener("pointerup", (event) => {
        if (event.pointerType !== "touch") return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            goTo(current + (deltaX < 0 ? 1 : -1));
        }
    });

    if (!autoplay) return;

    /* ---- Avance automático ----
       Lo marca la barra roja del punto activo (animación CSS): cuando termina,
       pasa a la siguiente imagen. Así la barra y el cambio siempre van sincronizados,
       incluso al pausar y reanudar. */

    dotsWrapper.addEventListener("animationend", (event) => {
        if (event.animationName === "hero-progress") goTo(current + 1);
    });

    const updatePaused = () => {
        hero.classList.toggle("is-paused", Object.values(pauseReasons).some(Boolean));
    };

    // Botón de pausa (necesario para accesibilidad: el usuario controla el movimiento)
    pauseButton.addEventListener("click", () => {
        pauseReasons.manual = !pauseReasons.manual;
        pauseButton.setAttribute("aria-pressed", String(pauseReasons.manual));
        pauseButton.setAttribute(
            "aria-label",
            pauseReasons.manual ? "Reanudar cambio automático" : "Pausar cambio automático"
        );
        updatePaused();
    });

    // Se detiene mientras el usuario usa los controles
    controls.addEventListener("mouseenter", () => { pauseReasons.controls = true; updatePaused(); });
    controls.addEventListener("mouseleave", () => { pauseReasons.controls = false; updatePaused(); });
    controls.addEventListener("focusin", () => { pauseReasons.controls = true; updatePaused(); });
    controls.addEventListener("focusout", () => { pauseReasons.controls = false; updatePaused(); });

    // Se detiene cuando el hero no se ve o la pestaña está en segundo plano
    if (supportsObserver) {
        new IntersectionObserver(([entry]) => {
            pauseReasons.offscreen = !entry.isIntersecting;
            updatePaused();
        }, { threshold: 0.25 }).observe(hero);
    }

    document.addEventListener("visibilitychange", () => {
        pauseReasons.hidden = document.hidden;
        updatePaused();
    });
}

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
   4. Carrusel de talleres (bucle infinito sin saltos)
   ========================================= */

function initWorkshopsCarousel() {
    const carousel = document.querySelector("#workshops-carousel");
    if (!carousel) return;

    // Con movimiento reducido no hay bucle: no se duplica nada
    if (prefersReducedMotion.matches) return;

    const originals = [...carousel.children];

    // Copias solo visuales: se ocultan a lectores de pantalla y al teclado
    const clones = originals.map((card) => {
        const clone = card.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("inert", "");
        return clone;
    });
    carousel.append(...clones);

    const SPEED = 40; // píxeles por segundo
    const state = { hover: false, focus: false, touch: false, offscreen: false, hidden: false };

    let position = carousel.scrollLeft;
    let lastTime = 0;
    let touchTimer;
    let wasPaused = false;

    // Distancia exacta de un grupo completo (incluye el espacio entre tarjetas)
    const loopWidth = () => clones[0].offsetLeft - originals[0].offsetLeft;
    const isPaused = () => Object.values(state).some(Boolean);

    function frame(now) {
        const delta = Math.min(now - lastTime, 64) / 1000;
        lastTime = now;

        const paused = isPaused();

        if (!paused) {
            // Al reanudar, se parte desde donde dejó el usuario
            if (wasPaused) position = carousel.scrollLeft;

            const width = loopWidth();
            position += SPEED * delta;
            if (width > 0 && position >= width) position -= width;
            carousel.scrollLeft = position;
        }

        wasPaused = paused;
        requestAnimationFrame(frame);
    }

    // Si el usuario desplaza a mano, se mantiene el bucle
    carousel.addEventListener("scroll", () => {
        const width = loopWidth();
        if (isPaused() && width > 0 && carousel.scrollLeft >= width) {
            carousel.scrollLeft -= width;
        }
    }, { passive: true });

    carousel.addEventListener("mouseenter", () => { state.hover = true; });
    carousel.addEventListener("mouseleave", () => { state.hover = false; });
    carousel.addEventListener("focusin", () => { state.focus = true; });
    carousel.addEventListener("focusout", () => { state.focus = false; });

    carousel.addEventListener("touchstart", () => {
        clearTimeout(touchTimer);
        state.touch = true;
    }, { passive: true });

    ["touchend", "touchcancel"].forEach((type) => {
        carousel.addEventListener(type, () => {
            clearTimeout(touchTimer);
            touchTimer = setTimeout(() => { state.touch = false; }, 2500);
        }, { passive: true });
    });

    // Solo se mueve cuando es visible y la pestaña está activa
    if (supportsObserver) {
        new IntersectionObserver(([entry]) => {
            state.offscreen = !entry.isIntersecting;
        }).observe(carousel);
    }

    document.addEventListener("visibilitychange", () => {
        state.hidden = document.hidden;
    });

    requestAnimationFrame((now) => {
        lastTime = now;
        frame(now);
    });
}

/* =========================================
   5. Marquesinas infinitas
   Cualquier pista con [data-marquee] se duplica y se anima.
   Opcional: data-marquee-speed="60" (píxeles por segundo)
   ========================================= */

function initMarquees() {
    if (prefersReducedMotion.matches) return;

    document.querySelectorAll("[data-marquee]").forEach((track) => {
        const speed = Number(track.dataset.marqueeSpeed) || 60;

        [...track.children].forEach((item) => {
            const clone = item.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            clone.setAttribute("inert", "");
            clone.querySelectorAll("img").forEach((img) => img.setAttribute("alt", ""));
            track.append(clone);
        });

        // La velocidad es la misma en cualquier pantalla (duración según el largo real)
        const updateDuration = () => {
            const loopLength = track.scrollWidth / 2;
            track.style.setProperty("--marquee-duration", `${loopLength / speed}s`);
        };

        track.classList.add("is-animated");
        updateDuration();

        if ("ResizeObserver" in window) {
            new ResizeObserver(updateDuration).observe(track);
        } else {
            window.addEventListener("resize", updateDuration);
        }
    });
}

/* =========================================
   5b. Acordeones
   <button data-accordion aria-expanded="false" aria-controls="id-del-panel">
   ========================================= */

function initAccordions() {
    document.querySelectorAll("[data-accordion]").forEach((button) => {
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        if (!panel) return;

        button.addEventListener("click", () => {
            const open = button.getAttribute("aria-expanded") !== "true";
            button.setAttribute("aria-expanded", String(open));
            panel.classList.toggle("is-open", open);
        });
    });
}

/* =========================================
   6. Contadores animados
   ========================================= */

function initCounters() {
    const counters = document.querySelectorAll("[data-target]");
    if (!counters.length || !supportsObserver || prefersReducedMotion.matches) return;

    const formatter = new Intl.NumberFormat("es-BO");
    const DURATION = 1800;

    function animate(element) {
        const target = Number(element.dataset.target);
        const startTime = performance.now();

        function tick(now) {
            const progress = Math.min((now - startTime) / DURATION, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // desacelera al final

            element.textContent = formatter.format(Math.round(target * eased));

            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                animate(entry.target);
                obs.unobserve(entry.target);
            });
        },
        { threshold: 0.6 }
    );

    counters.forEach((counter) => {
        counter.textContent = "0";
        observer.observe(counter);
    });
}

/* =========================================
   7. Formulario de contacto
   ========================================= */

function initContactForm() {
    const form = document.querySelector("#contact-form");
    if (!form) return;

    const fields = [...form.querySelectorAll(".form-input, .form-textarea")];
    const status = form.querySelector(".form-status");
    const submitButton = form.querySelector(".form-button");

    function setStatus(message, state) {
        status.textContent = message;
        status.dataset.state = state;
    }

    function validateField(field) {
        const group = field.closest(".form-group");
        let error = group.querySelector(".form-error");

        if (!error) {
            error = document.createElement("p");
            error.className = "form-error";
            error.id = `${field.id}-error`;
            group.append(error);
        }

        const valid = field.checkValidity();

        if (valid) {
            error.textContent = "";
            field.removeAttribute("aria-describedby");
        } else if (field.validity.valueMissing) {
            error.textContent = "Este campo es obligatorio.";
            field.setAttribute("aria-describedby", error.id);
        } else if (field.type === "email") {
            error.textContent = "Escribe un correo válido, por ejemplo nombre@correo.com.";
            field.setAttribute("aria-describedby", error.id);
        } else {
            error.textContent = "Revisa el formato de este dato.";
            field.setAttribute("aria-describedby", error.id);
        }

        field.setAttribute("aria-invalid", String(!valid));
        return valid;
    }

    fields.forEach((field) => {
        field.addEventListener("blur", () => validateField(field));
        field.addEventListener("input", () => {
            if (field.getAttribute("aria-invalid") === "true") validateField(field);
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const invalidFields = fields.filter((field) => !validateField(field));

        if (invalidFields.length) {
            invalidFields[0].focus();
            setStatus("Revisa los campos marcados antes de enviar.", "error");
            return;
        }

        // Campo trampa: si un bot lo llena, se ignora el envío
        if (form.elements.website?.value) return;

        const endpoint = form.getAttribute("action");

        if (!endpoint || endpoint === "#") {
            setStatus("El formulario aún no está conectado a un servicio de envío.", "info");
            return;
        }

        submitButton.disabled = true;
        setStatus("Enviando mensaje…", "info");

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            form.reset();
            fields.forEach((field) => field.removeAttribute("aria-invalid"));
            setStatus("Mensaje enviado. Te responderemos lo antes posible.", "success");
        } catch (error) {
            setStatus("No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos por correo.", "error");
        } finally {
            submitButton.disabled = false;
        }
    });
}

/* =========================================
   Inicio
   ========================================= */

initHeroSlider();
initNavigation();
initScrollEffects();
initReveal();
initWorkshopsCarousel();
initMarquees();
initAccordions();
initCounters();
initContactForm();

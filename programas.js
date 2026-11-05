/**
 * CHASQUI UI/UX
 * Programas — script independiente
 * (menú, efectos de scroll, animaciones de aparición y formulario)
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

initNavigation();
initScrollEffects();
initReveal();
initContactForm();

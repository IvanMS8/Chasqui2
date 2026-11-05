document.addEventListener("DOMContentLoaded", () => {
    // Control del Acordeón "Nuestra Historia"
    const historyToggle = document.querySelector("#history-toggle");
    const historyContent = document.querySelector("#history-content");

    if (historyToggle && historyContent) {
        historyToggle.addEventListener("click", () => {
            const isExpanded = historyToggle.getAttribute("aria-expanded") === "true";
            historyToggle.setAttribute("aria-expanded", !isExpanded);
            historyContent.hidden = isExpanded;
        });
    }
});
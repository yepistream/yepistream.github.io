const triggers = document.querySelectorAll(".dropdown-trigger");
const panels = document.querySelectorAll(".dropdown-panel");

const random_welcome_messages =
[
    "Welcome, Come Right In",
    "Hi, This Page Is The Doormat To My Site",
    "Welcome To My Site"
]


document.getElementById("welcome").innerText = random_welcome_messages[Math.floor(Math.random()*random_welcome_messages.length)];


if (triggers && panels) {
    triggers.forEach((trigger, i) => {
        trigger.addEventListener("click", () => {
        const isOpen = panels[i].classList.contains("open");

        if (isOpen) {
            panels[i].style.maxHeight = null;
            panels[i].classList.remove("open");
            trigger.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
            panels[i].setAttribute("aria-hidden", "true");
            return;
        }

        panels[i].classList.add("open");
        trigger.classList.add("open");
        panels[i].style.maxHeight = `${panels[i].scrollHeight}px`;
        trigger.setAttribute("aria-expanded", "true");
        panels[i].setAttribute("aria-hidden", "false");
        });
    });
    

    window.addEventListener("resize", () => {
        panels.forEach(panel => {
            if (panel.classList.contains("open")) {
                panel.style.maxHeight = `${panel.scrollHeight}px`;
            }
        });
    });
}

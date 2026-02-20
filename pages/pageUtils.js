const triggers = document.querySelectorAll(".dropdown-trigger");
const panels = document.querySelectorAll(".dropdown-panel");
const typingTargets = Array.from(
    document.getElementsByClassName("terminal-animated")
);
const typingState = new WeakMap();
const typingQueue = [];
let isTypingQueueRunning = false;

const random_welcome_messages =
[
    "Welcome, Come Right In",
    "Hi, This Page Is The Doormat To My Site",
    "Welcome To My Site"
]


//document.getElementById("welcome").innerText = random_welcome_messages[Math.floor(Math.random()*random_welcome_messages.length)];

function getTextNodes(element) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.nodeValue || !node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    return textNodes;
}

function prepareTypingTarget(element) {
    if (typingState.has(element)) {
        return typingState.get(element);
    }

    const nodes = getTextNodes(element).map((node) => {
        const text = node.nodeValue;
        node.nodeValue = "";
        return { node, text };
    });

    const state = {
        nodes,
        typed: false,
        typing: false
    };

    typingState.set(element, state);
    return state;
}

function updateOpenPanelHeight(element) {
    const parentPanel = element.closest(".dropdown-panel");
    if (parentPanel && parentPanel.classList.contains("open")) {
        parentPanel.style.maxHeight = `${parentPanel.scrollHeight}px`;
    }
}

function typeElement(element, baseDelay = 16) {
    const state = prepareTypingTarget(element);

    if (!state.nodes.length || state.typed || state.typing) {
        return Promise.resolve();
    }

    state.typing = true;
    element.classList.add("typing");

    return new Promise((resolve) => {
        let nodeIndex = 0;
        let charIndex = 0;

        const typeNextCharacter = () => {
            if (nodeIndex >= state.nodes.length) {
                state.typing = false;
                state.typed = true;
                element.classList.remove("typing");
                resolve();
                return;
            }

            const currentNode = state.nodes[nodeIndex];
            charIndex += 1;
            currentNode.node.nodeValue = currentNode.text.slice(0, charIndex);
            updateOpenPanelHeight(element);
            const currentChar = currentNode.text[charIndex - 1] || "";

            if (charIndex >= currentNode.text.length) {
                nodeIndex += 1;
                charIndex = 0;
            }

            let delay = baseDelay + Math.floor(Math.random() * 20);

            if (/[.,!?]/.test(currentChar)) {
                delay += 90;
            }

            if (currentChar === " ") {
                delay = Math.max(10, delay - 8);
            }

            window.setTimeout(typeNextCharacter, delay);
        };

        typeNextCharacter();
    });
}

async function runTypingQueue() {
    if (isTypingQueueRunning) {
        return;
    }

    isTypingQueueRunning = true;

    while (typingQueue.length) {
        const nextElement = typingQueue.shift();
        await typeElement(nextElement);
    }

    isTypingQueueRunning = false;
}

function enqueueTyping(elements) {
    elements.forEach((element) => {
        const state = prepareTypingTarget(element);

        if (!state.typed && !state.typing && !typingQueue.includes(element)) {
            typingQueue.push(element);
        }
    });

    runTypingQueue();
}

function isInClosedPanel(element) {
    const parentPanel = element.closest(".dropdown-panel");
    return parentPanel ? !parentPanel.classList.contains("open") : false;
}

typingTargets.forEach((target) => prepareTypingTarget(target));
enqueueTyping(typingTargets.filter((target) => !isInClosedPanel(target)));


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
        enqueueTyping(typingTargets.filter((target) => panels[i].contains(target)));
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

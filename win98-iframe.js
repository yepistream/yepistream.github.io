(() => {
  const container = document.getElementById("quickshow-window");
  const navbar = document.getElementById("quickshow-navbar");
  const iframe = document.getElementById("quickshow-iframe");
  const closeBtn = document.getElementById("quickshow-close");
  if (!container || !navbar || !iframe || !closeBtn) return;

  const cfg = { handle: 12, minW: 240, minH: 160 };

  // percent -> px for sane resizing
  {
    const r = container.getBoundingClientRect();
    container.style.left = `${r.left}px`;
    container.style.top = `${r.top}px`;
    container.style.width = `${r.width}px`;
    container.style.height = `${r.height}px`;
  }

  // add these near the top (after you fetch container/navbar/iframe)
const titleEl = document.getElementById("quickshow-title");
const iconEl  = navbar.querySelector(".w98-icon");

const lockPercentSizeToPx = () => {
  const r = container.getBoundingClientRect();
  container.style.left = `${r.left}px`;
  container.style.top = `${r.top}px`;
  container.style.width = `${r.width}px`;
  container.style.height = `${r.height}px`;
};


  // close hides whole window
  const hide = () => { container.style.display = "none"; };
  const show = () => { container.style.display = "block"; syncIframeHeight(); };

// global API
window.quickshowOpen = (url, opts = {}) => {
  if (typeof url === "string" && url.trim()) iframe.src = url;
  if (opts.title != null && titleEl) titleEl.textContent = String(opts.title);
  if (opts.icon != null && iconEl) iconEl.src = String(opts.icon);

  show();

  // optional: reset size from CSS % each open
  if (opts.resetSize === true) {
    container.style.removeProperty("width");
    container.style.removeProperty("height");
    container.style.removeProperty("left");
    container.style.removeProperty("top");
    requestAnimationFrame(lockPercentSizeToPx);
  }
  if(opts.size.w && opts.size.h){
    container.style.width = opts.size.w + "%"
    container.style.height = opts.size.h + "%"
  }


  console.debug("[quickshow] open", url, opts);
};

window.quickshowWindow = { hide, show, el: container };


  const html = document.documentElement;
  const prevHtmlStyleAttr = () => html.getAttribute("style"); // string|null
  let savedHtmlStyleAttr = null;


  
  const lockHtml = (cursor) => {
    savedHtmlStyleAttr = prevHtmlStyleAttr();
    html.style.cssText = `cursor:${cursor} !important; user-select:none !important; -webkit-user-select:none !important; touch-action:none !important;`;
  };
  const unlockHtml = () => {
    if (savedHtmlStyleAttr == null) html.removeAttribute("style");
    else html.setAttribute("style", savedHtmlStyleAttr);
    savedHtmlStyleAttr = null;
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const modeCursor = (m) =>
    m === "drag" ? "move" :
    m === "e" ? "ew-resize" :
    m === "s" ? "ns-resize" :
    "nwse-resize";

  const syncIframeHeight = () => {
    const navH = navbar.getBoundingClientRect().height;
    iframe.style.height = `calc(100% - ${navH}px)`;
  };
  syncIframeHeight();
  new ResizeObserver(syncIframeHeight).observe(container);

  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hide();
    console.debug("[quickshow] hidden");
  });
  window.quickshowWindow = { hide, show, el: container };

  // prevent dragging when clicking buttons in titlebar
  navbar.style.cursor = "move";
  navbar.addEventListener("pointerdown", (e) => {
    if (e.target === closeBtn) return;
    if (e.button != null && e.button !== 0) return;
    begin(e, "drag");
  });

  // resize handles (right, bottom, corner)
  const mkHandle = (dir, css) => {
    const h = document.createElement("div");
    h.dataset.dir = dir;
    Object.assign(h.style, {
      position: "absolute",
      zIndex: 99999999,
      background: "transparent",
      touchAction: "none",
      ...css,
    });
    h.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      begin(e, dir);
    });
    container.appendChild(h);
    return h;
  };

  mkHandle("e",  { right: 0, top: 0, width: `${cfg.handle}px`, height: "100%", cursor: "ew-resize" });
  mkHandle("s",  { left: 0, bottom: 0, width: "100%", height: `${cfg.handle}px`, cursor: "ns-resize" });
  mkHandle("se", { right: 0, bottom: 0, width: `${cfg.handle}px`, height: `${cfg.handle}px`, cursor: "nwse-resize" });

  let mode = null;
  let start = null;

  function begin(e, m) {
    mode = m;
    const r = container.getBoundingClientRect();
    start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height };

    lockHtml(modeCursor(mode));
    iframe.style.pointerEvents = "none";
    container.setPointerCapture?.(e.pointerId);

    console.debug("[quickshow] begin", mode);
  }

  function end() {
    if (!mode) return;
    mode = null;
    start = null;

    iframe.style.pointerEvents = "";
    unlockHtml();

    console.debug("[quickshow] end");
  }

  function move(e) {
    if (!mode || !start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (mode === "drag") {
      const left = clamp(start.left + dx, 0, vw - start.w);
      const top = clamp(start.top + dy, 0, vh - start.h);
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      return;
    }

    let w = start.w, h = start.h;
    if (mode.includes("e")) w = clamp(start.w + dx, cfg.minW, vw - start.left);
    if (mode.includes("s")) h = clamp(start.h + dy, cfg.minH, vh - start.top);

    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
  }
  hide();


  
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("blur", end);
})();
const basePath = window.location.hostname.includes("github.io") ? "/seedle/" : "";

async function loadComponent(targetId, file) {
  const el = document.getElementById(targetId);
  if (!el) return;

  try {
    const response = await fetch(basePath + file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.text();
    el.innerHTML = content;
    console.log(`Loaded ${file} into #${targetId}`);
  } catch (err) {
    console.error(`Error loading ${file}:`, err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("header", "header.html");
  loadComponent("footer", "footer.html");
  checkOrientation();
});

function checkOrientation() {
  let overlay = document.getElementById("orientation-overlay");

  if (window.matchMedia("(orientation: landscape)").matches) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "orientation-overlay";
      overlay.classList.add("orientation-blocker");
      overlay.innerHTML = "<p>Please rotate your device back to portrait mode.</p>";
      document.body.appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
  }
}

window.addEventListener("resize", checkOrientation);

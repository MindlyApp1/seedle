async function loadComponent(targetId, file) {
  const el = document.getElementById(targetId);
  if (!el) return;

  try {
    const response = await fetch(`src/components/${file}`);
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
});

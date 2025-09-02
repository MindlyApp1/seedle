async function loadComponent(targetId, file) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const basePath = window.location.pathname.includes("/src/components/")
    ? ""
    : "src/components/";

  try {
    const response = await fetch(`${basePath}${file}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.text();
    el.innerHTML = content;
    console.log(`Loaded ${file} into #${targetId}`);
  } catch (err) {
    console.error(`Error loading ${file}:`, err);
  }
}


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

    // Temporary wrapper
    const temp = document.createElement("div");
    temp.innerHTML = content;

    // Move <link rel="stylesheet"> into <head>
    temp.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (![...document.head.querySelectorAll("link")].some(l => l.href === link.href)) {
        document.head.appendChild(link.cloneNode(true));
      }
    });

    // Inject only the HTML (without link tags) into target
    el.innerHTML = temp.innerHTML.replace(/<link[^>]+>/g, "");

    console.log(`Loaded ${file} into #${targetId}`);
  } catch (err) {
    console.error(`Error loading ${file}:`, err);
  }
}

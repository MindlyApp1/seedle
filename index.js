const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const items = entry.target.parentElement.querySelectorAll('.step, .benefit');
      items.forEach((item, i) => {
        setTimeout(() => {
          item.classList.add('show');
        }, i * 200);
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.step, .benefit').forEach(el => {
  observer.observe(el);
});

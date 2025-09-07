const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const steps = entry.target.querySelectorAll('.step');
      steps.forEach((step, i) => {
        setTimeout(() => step.classList.add('show'), i * 500);
      });
      const benefits = entry.target.querySelectorAll('.benefit');
      benefits.forEach((benefit, i) => {
        setTimeout(() => benefit.classList.add('show'), i * 500);
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.how-it-works, .benefits')
          .forEach(section => observer.observe(section));
});

document.addEventListener("DOMContentLoaded", () => {
  const flower = document.getElementById("seedle-flower");
  const frames = [
    "assets/flower1.png",
    "assets/flower2.png",
    "assets/flower3.png",
    "assets/flower4.png"
  ];
  let i = 0;
  function animateSeed() {
    if (i < frames.length) {
      flower.src = frames[i];
      if (i === frames.length - 1) {
        setTimeout(() => {
          flower.classList.add("sway");
        }, 1000);
      } else {
        setTimeout(animateSeed, 500);
      }
      i++;
    }
  }
  animateSeed();
});

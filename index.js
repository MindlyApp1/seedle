const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {

      const steps = entry.target.parentElement.querySelectorAll('.step');
      steps.forEach((step, i) => {
        setTimeout(() => {
          step.classList.add('show');
        }, i * 500);
      });

      const benefits = entry.target.parentElement.querySelectorAll('.benefit');
      benefits.forEach(benefit => {
        benefit.classList.add('show');
      });

      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.step, .benefit').forEach(el => {
  observer.observe(el);
});

document.querySelectorAll('.flower-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const id = link.getAttribute('href');
    const target = document.querySelector(id);

    const offset = (window.innerHeight - target.offsetHeight) / 2;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth'
    });
  });
});

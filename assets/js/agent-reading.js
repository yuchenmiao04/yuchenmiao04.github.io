(function () {
  'use strict';
  const toc = document.querySelector('.toc-shell');
  const compact = window.matchMedia('(max-width: 840px)');
  function setToc() { if (toc) toc.open = !compact.matches; }
  setToc();
  compact.addEventListener('change', setToc);
  const headings = [...document.querySelectorAll('article h2[id], article h3[id]')];
  const links = [...document.querySelectorAll('.toc-list a')];
  const progress = document.querySelector('.reading-progress');
  let pending = false;
  function update() {
    pending = false;
    let active = headings.length ? headings[0].id : '';
    for (const h of headings) { if (h.getBoundingClientRect().top <= 120) active = h.id; else break; }
    for (const a of links) {
      if (a.hash === '#' + active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (distance > 0 ? Math.max(0,Math.min(100,window.scrollY/distance*100)) : 0) + '%';
  }
  window.addEventListener('scroll', function () { if (!pending) { pending = true; requestAnimationFrame(update); } }, {passive:true});
  window.addEventListener('resize', update);
  links.forEach(a => a.addEventListener('click', () => { if (compact.matches && toc) toc.open = false; }));
  update();
})();

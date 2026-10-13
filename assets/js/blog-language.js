(function () {
  'use strict';
  var links = document.querySelectorAll('a[data-blog-language]');
  if (!links.length) return;

  function currentSection() {
    if (window.location.hash) {
      var anchor = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      var top = anchor ? anchor.getBoundingClientRect().top : -1;
      if (top >= 0 && top < window.innerHeight) return window.location.hash;
    }
    var headings = document.querySelectorAll('article h2[id], article h3[id]');
    var id = '';
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= 96) id = headings[i].id;
      else break;
    }
    return id ? '#' + encodeURIComponent(id) : '';
  }

  for (var i = 0; i < links.length; i++) {
    (function (link) {
      var path = link.getAttribute('href').split('#')[0];
      function update() { link.setAttribute('href', path + currentSection()); }
      link.addEventListener('pointerdown', update);
      link.addEventListener('click', update);
      link.addEventListener('contextmenu', update);
      window.addEventListener('hashchange', function () {
        link.setAttribute('href', path + window.location.hash);
      });
      if (window.location.hash) link.setAttribute('href', path + window.location.hash);
    })(links[i]);
  }
})();

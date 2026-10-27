/* Lit data/site.json et data/videos.json, puis remplit la page.
   Ces deux fichiers sont ceux que tu modifies dans Pages CMS. */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function chemin(p) { return p ? String(p).replace(/^\//, '') : ''; }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'projet';
  }

  // Lien YouTube ou Vimeo : lecteur intégré et, pour YouTube, trois photogrammes automatiques
  function video(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return {
      src: 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0',
      images: [1, 2, 3].map(function (n) { return 'https://i.ytimg.com/vi/' + yt[1] + '/hq' + n + '.jpg'; })
    };
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]{6,}))?/);
    if (vm) return { src: 'https://player.vimeo.com/video/' + vm[1] + (vm[2] ? '?h=' + vm[2] : ''), images: [] };
    return null;
  }

  // Les trois images d'une ligne : celles choisies dans l'éditeur, sinon celles de YouTube,
  // sinon des aplats de lumière en attendant
  function trois(v) {
    var choisies = (v.images || []).map(function (x) { return chemin(x && x.image ? x.image : x); }).filter(Boolean);
    if (!choisies.length && v.image) choisies = [chemin(v.image)];
    var vid = video(v.lien);
    var auto = vid ? vid.images : [];
    var l = choisies.concat(auto).slice(0, 3);
    var out = [];
    for (var i = 0; i < 3; i++) {
      out.push(l[i]
        ? '<span class="cadre"><img src="' + esc(l[i]) + '" alt="" loading="lazy"></span>'
        : '<span class="cadre attente t' + ((v._i * 3 + i) % 6) + '" aria-hidden="true"></span>');
    }
    return out.join('');
  }

  function charger(p) {
    return fetch(p, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(p);
      return r.json();
    });
  }

  var page = document.body.dataset.page;

  Promise.all([charger('data/site.json'), charger('data/videos.json')]).then(function (res) {
    var site = res[0] || {}, videos = (res[1] && res[1].videos) || [];
    videos.forEach(function (v, i) { v._id = 'v-' + slug(v.titre); v._i = i; v._cat = (v.categorie || 'autres').toLowerCase(); });

    document.querySelectorAll('[data-site]').forEach(function (el) {
      if (site[el.dataset.site]) el.textContent = site[el.dataset.site];
    });

    var cats = [];
    videos.forEach(function (v) { if (cats.indexOf(v._cat) < 0) cats.push(v._cat); });
    var zone = document.getElementById('categories');
    zone.innerHTML = cats.map(function (c) {
      return '<a href="index.html#' + slug(c) + '" data-cat="' + esc(c) + '">' + esc(c) + '</a>';
    }).join('');

    if (page === 'accueil') accueil(videos, cats, zone);

    var bio = document.getElementById('bio');
    if (bio && site.bio) bio.innerHTML = String(site.bio).split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
    var photo = document.getElementById('photo');
    if (photo && site.photo) photo.innerHTML = '<img class="portrait" src="' + esc(chemin(site.photo)) + '" alt="portrait de ' + esc(site.nom) + '">';
    var services = document.getElementById('services');
    if (services && site.services) services.innerHTML = site.services.map(function (s) {
      return '<li><b>' + esc(s.titre) + '</b> • ' + esc(s.texte) + '</li>';
    }).join('');
    var mail = document.getElementById('mail');
    if (mail && site.email) { mail.textContent = site.email; mail.href = 'mailto:' + site.email; }
    var liens = document.getElementById('liens');
    if (liens && site.liens) liens.innerHTML = site.liens.map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.nom) + '</a>';
    }).join('');
  }).catch(function () {
    var g = document.getElementById('liste');
    if (g) g.innerHTML = '<p class="vide">les vidéos n\'ont pas pu être chargées. le site doit être ouvert depuis son adresse en ligne, pas en double-cliquant sur le fichier.</p>';
  });

  function accueil(videos, cats, zone) {
    var liste = document.getElementById('liste');
    var projet = document.getElementById('projet');
    var filtre = null;

    function lignes() {
      var l = videos.filter(function (v) { return !filtre || v._cat === filtre; });
      liste.innerHTML = l.length ? l.map(function (v) {
        return '<a class="ligne" href="#' + v._id + '" data-id="' + v._id + '">' +
          '<h2>' + esc(v.titre) + '</h2>' +
          '<span class="trois">' + trois(v) + '</span></a>';
      }).join('') : '<p class="vide">aucune vidéo pour l\'instant. ajoute ta première vidéo dans pages cms, rubrique vidéos.</p>';
      zone.querySelectorAll('a').forEach(function (a) {
        if (a.dataset.cat === filtre) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }

    function ouvrir(id) {
      var v = videos.filter(function (x) { return x._id === id; })[0];
      if (!v) return fermer();
      var vid = video(v.lien);
      var ligne1 = [esc(v.titre), esc(String(v.categorie || '').toLowerCase()), v.role ? 'rôle ' + esc(String(v.role).toLowerCase()) : '', esc(v.annee)].filter(Boolean).join(' &nbsp;•&nbsp; ');
      var ligne2 = String(v.credits || '').split('\n').filter(Boolean).map(esc).join(' &nbsp;•&nbsp; ');
      var ecran = vid
        ? '<div class="ecran"><iframe src="' + esc(vid.src) + '" title="' + esc(v.titre) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
        : (v.lien ? '<p class="lien-ext"><a href="' + esc(v.lien) + '" target="_blank" rel="noopener">voir le projet ↗</a></p>' : '');
      projet.innerHTML =
        '<div class="credits"><p>' + ligne1 + '</p>' + (ligne2 ? '<p>' + ligne2 + '</p>' : '') +
        (v.description ? '<p class="desc">' + esc(v.description) + '</p>' : '') + '</div>' +
        ecran +
        '<div class="trois">' + trois(v) + '</div>' +
        '<p class="retour"><a href="#" data-action="fermer">← tous les projets</a></p>';
      projet.hidden = false; liste.hidden = true;
      window.scrollTo(0, 0);
    }
    function fermer() { projet.hidden = true; projet.innerHTML = ''; liste.hidden = false; }

    function lireAdresse() {
      var h = decodeURIComponent(location.hash.slice(1));
      if (h.indexOf('v-') === 0) { lignes(); ouvrir(h); return; }
      var cat = cats.filter(function (c) { return slug(c) === h; })[0];
      filtre = cat || null;
      fermer(); lignes();
    }

    liste.addEventListener('click', function (e) {
      var a = e.target.closest('a.ligne');
      if (!a) return;
      e.preventDefault();
      try { history.pushState(null, '', '#' + a.dataset.id); } catch (er) {}
      ouvrir(a.dataset.id);
    });
    projet.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="fermer"]')) {
        e.preventDefault();
        try { history.pushState(null, '', location.pathname + (filtre ? '#' + slug(filtre) : '')); } catch (er) {}
        fermer(); lignes();
      }
    });
    zone.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cat]');
      if (!a) return;
      e.preventDefault();
      filtre = filtre === a.dataset.cat ? null : a.dataset.cat;
      try { history.pushState(null, '', location.pathname + (filtre ? '#' + slug(filtre) : '')); } catch (er) {}
      fermer(); lignes();
    });
    addEventListener('popstate', lireAdresse);
    lireAdresse();
  }

  // Une image qui ne charge pas laisse place à un aplat de lumière
  document.addEventListener('error', function (e) {
    var im = e.target;
    if (im.tagName !== 'IMG' || !im.parentNode || !im.parentNode.classList.contains('cadre')) return;
    var n = Math.abs((im.src || '').length) % 6;
    im.parentNode.classList.add('attente', 't' + n);
    im.remove();
  }, true);

  var copier = document.getElementById('copier');
  if (copier) copier.addEventListener('click', function () {
    var t = document.getElementById('mail').textContent;
    function ok() { copier.textContent = 'copié'; setTimeout(function () { copier.textContent = 'copier l\'adresse'; }, 1600); }
    function selection() { var r = document.createRange(); r.selectNodeContents(document.getElementById('mail')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    try { navigator.clipboard.writeText(t).then(ok, selection); } catch (e) { selection(); }
  });
})();

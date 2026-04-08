(function () {
  var VARIANT = window.NEARE_VARIANT || 'A';

  // --- UTM capture ---
  var params = new URLSearchParams(window.location.search);
  var utm = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || ''
  };
  var referrer = document.referrer || '';

  // --- Tracking stub ---
  function track(event, extra) {
    var payload = Object.assign({ event: event, variant: VARIANT }, extra || {});
    if (window.console) console.log('[neare:track]', payload);
    // Real endpoint can be wired later; fire-and-forget:
    try {
      navigator.sendBeacon && navigator.sendBeacon(
        '/api/track',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    } catch (e) {}
  }
  track('view');

  // --- Smooth scroll for in-page links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (id === 'how') track('howitworks_click');
      if (id === 'join') track('finalcta_click');
    });
  });

  // --- Scroll depth (50% / 90%) ---
  var fired = {};
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    if (pct > 0.5 && !fired['50']) { fired['50'] = 1; track('scroll_50'); }
    if (pct > 0.9 && !fired['90']) { fired['90'] = 1; track('scroll_90'); }
  }, { passive: true });

  // --- Email capture forms ---
  document.querySelectorAll('[data-form]').forEach(function (form) {
    var msg = form.querySelector('[data-msg]');
    var input = form.querySelector('input[type=email]');
    var btn = form.querySelector('button');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Please enter a valid email address.';
        return;
      }
      btn.disabled = true;
      msg.textContent = 'Adding you to the list…';

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          email: email,
          variant: VARIANT,
          referrer: referrer
        }, utm))
      })
        .then(function (r) {
          if (r.status === 429) throw new Error('rate');
          if (!r.ok) throw new Error('server');
          return r.json();
        })
        .then(function () {
          form.classList.add('success');
          msg.textContent = "Thanks — you're on the list. We'll be in touch.";
          track('email_submit');
        })
        .catch(function (err) {
          btn.disabled = false;
          if (err.message === 'rate') {
            msg.textContent = "You're going a bit fast — give it a moment and try again.";
          } else {
            msg.textContent = 'Something went wrong. Please try again.';
          }
        });
    });
  });

  // --- Pricing CTA tracking ---
  document.querySelectorAll('.price-card .btn').forEach(function (b) {
    b.addEventListener('click', function () { track('pricing_click'); });
  });
})();

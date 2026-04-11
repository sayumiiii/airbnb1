/* ============================================================
   HOPE — main.js
   Mobile nav · Filters · Favourites · Form · Toast
   ============================================================ */

// ── Mobile navigation ──────────────────────────────────────────
const burgerBtn  = document.getElementById('burgerBtn');
const mobileNav  = document.getElementById('mobileNav');

if (burgerBtn && mobileNav) {
  burgerBtn.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    burgerBtn.classList.toggle('open', open);
    burgerBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!burgerBtn.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove('open');
      burgerBtn.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // Close on nav link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      burgerBtn.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// ── Toast notification ─────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Favourite toggle ───────────────────────────────────────────
function toggleFav(btn) {
  const liked = btn.classList.toggle('liked');
  const name  = btn.closest('.prop-card')?.querySelector('.prop-name')?.textContent ?? 'Property';
  showToast(liked ? `Saved "${name}" to favourites` : `Removed from favourites`);
}

// ── Filter chips ───────────────────────────────────────────────
const filterChips = document.querySelectorAll('.filter-chip');
const listingsGrid = document.getElementById('listingsGrid');

if (filterChips.length && listingsGrid) {
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filter = chip.dataset.filter;
      const cards  = listingsGrid.querySelectorAll('.prop-card');
      let shown    = 0;

      cards.forEach(card => {
        const price = parseInt(card.dataset.price, 10);
        const dist  = parseInt(card.dataset.dist, 10);

        let visible = true;

        if (filter === 'under500')   visible = price < 500;
        if (filter === 'under200')   visible = price < 200;
        if (filter === '500to1000')  visible = price >= 500  && price <= 1000;
        if (filter === '200to400')   visible = price >= 200  && price <= 400;
        if (filter === 'over1000')   visible = price > 1000;
        if (filter === 'over400')    visible = price > 400;
        if (filter === 'close')      visible = dist < 150;

        card.style.display = visible ? '' : 'none';
        if (visible) shown++;
      });

      if (shown === 0) {
        showToast('No listings match this filter.');
      }
    });
  });
}

// ── Contact form ───────────────────────────────────────────────
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstName = contactForm.querySelector('#firstName');
    const lastName  = contactForm.querySelector('#lastName');
    const email     = contactForm.querySelector('#email');
    const message   = contactForm.querySelector('#message');

    // Simple client-side validation
    let valid = true;

    [firstName, lastName, email, message].forEach(field => {
      if (!field) return;
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--rose-400)';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });

    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.style.borderColor = 'var(--rose-400)';
      valid = false;
    }

    if (!valid) {
      showToast('Please fill in all required fields.');
      return;
    }

    // Show success state
    if (formSuccess) {
      formSuccess.classList.add('visible');
    }

    const submitBtn = contactForm.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Message sent!';
      submitBtn.style.background = 'var(--green-500)';
    }

    showToast('Message sent successfully!');
  });
}

// ── Search bar ─────────────────────────────────────────────────
function handleSearch(e) {
  e.preventDefault();
  const where  = document.getElementById('search-where')?.value.trim();
  const when   = document.getElementById('search-when')?.value.trim();
  const guests = document.getElementById('search-guests')?.value.trim();

  if (!where && !when && !guests) {
    showToast('Enter a destination to search.');
    return;
  }

  // Build a query string and navigate to cottages as an example
  showToast(`Searching for stays in ${where || 'Canada'}…`);
  setTimeout(() => {
    window.location.href = `pages/cottage.html`;
  }, 1200);
}

// ── Scroll-triggered animation (Intersection Observer) ─────────
const animItems = document.querySelectorAll('.animate-fade-up');
if (animItems.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animItems.forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}

// ── Navbar scroll shadow ────────────────────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 2px 20px rgba(0,0,0,.10)'
      : '';
  }, { passive: true });
}

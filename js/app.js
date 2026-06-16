// ─── MAIN APP ───

// ── Toast ──
let toastTimeout;
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── QR Modal ──
function openQRModal() { showToast('ระบบนี้เป็นตัวอย่าง — กรุณาติดต่อทีมงาน'); }
function closeQRModal() { document.getElementById('qr-modal').classList.remove('show'); }

document.getElementById('qr-modal').addEventListener('click', function(e) {
  if (e.target === this) closeQRModal();
});

// ── Mobile nav toggle ──
function toggleMobileNav() {
  document.querySelector('.nav-links').classList.toggle('mobile-open');
}

// ── Page router (SPA) ──
// Canonical page IDs managed by this router
const ALL_SPA_PAGES = ['page-main', 'page-schools', 'page-login', 'page-register', 'page-dashboard', 'page-student', 'page-teacher'];

function showOnlyPage(pageId) {
  ALL_SPA_PAGES.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display   = 'none';
    el.style.opacity   = '';
    el.style.transform = '';
    el.classList.remove('exit', 'enter');
  });
  const target = document.getElementById(pageId);
  if (!target) return;
  target.style.display = 'block';
  window.scrollTo(0, 0);
  // Close mobile nav if open
  document.querySelector('.nav-links')?.classList.remove('mobile-open');
}

// ── Go home (works from any page, preserves schools→main animation) ──
function goHome() {
  const schools = document.getElementById('page-schools');
  if (schools && schools.style.display !== 'none') {
    // Preserve the existing slide-out animation from page-schools
    schools.classList.remove('enter');
    setTimeout(() => {
      schools.style.display = 'none';
      const main = document.getElementById('page-main');
      main.style.display = '';
      main.classList.remove('exit');
      window.scrollTo(0, 0);
    }, 380);
  } else {
    showOnlyPage('page-main');
  }
}

// ── Go to login ──
function goToLogin() {
  showOnlyPage('page-login');
  // Clear previous state
  ['login-username','login-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['login-error-msg','login-lockout-msg','login-attempts-hint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ── Go to register ──
function goToRegister() {
  showOnlyPage('page-register');
  ['reg-role','reg-name','reg-username','reg-password','reg-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const errEl = document.getElementById('reg-error-msg');
  if (errEl) errEl.style.display = 'none';
}

// ── Go to dashboard ──
function goToDashboard() {
  showOnlyPage('page-dashboard');
  if (typeof buildDashboard === 'function') buildDashboard();
}

// ── Navigate from landing page ──
// Navbar "เข้าสู่ระบบ" — go to dashboard if already logged in, else login page
function handleNavLogin() {
  const session = getSession ? getSession() : null;
  if (!session) { goToLogin(); return; }
  goToUserPage(session);
}

// Route to the correct page based on role
function goToUserPage(session) {
  if (!session) { goToLogin(); return; }
  if (session.role === 'student') {
    showOnlyPage('page-student');
    if (typeof buildStudentPage === 'function') buildStudentPage();
  } else if (session.role === 'teacher') {
    showOnlyPage('page-teacher');
    if (typeof buildTeacherPage === 'function') buildTeacherPage();
  } else {
    goToDashboard();
  }
}

// ── School detail page navigation (preserved from original) ──
function navigateToSchools(segIndex) {
  const meta = levelMeta[segIndex];
  currentLevelKey = meta.key;
  buildSchoolPage(meta);

  const main    = document.getElementById('page-main');
  const schools = document.getElementById('page-schools');

  ALL_SPA_PAGES.filter(id => id !== 'page-main' && id !== 'page-schools')
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  main.classList.add('exit');
  setTimeout(() => {
    main.style.display    = 'none';
    schools.style.display = 'block';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => schools.classList.add('enter')));
  }, 320);
}

// ── Sign-in form (demo only) ──
function handleSignIn() { showToast('ระบบนี้เป็นตัวอย่าง — กรุณาติดต่อทีมงาน'); }

// ── Legend row hover → sync with donut ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.legend-row').forEach((row, i) => {
    row.style.cursor = 'pointer';
    row.addEventListener('mouseenter', () => {
      const canvas = document.getElementById('donut-canvas');
      if (!canvas) return;
      activeSegment = i;
      drawDonut(canvas.getContext('2d'), 1, i);
      updateCenterLabel(i);
      highlightLegend(i);
    });
    row.addEventListener('mouseleave', () => {
      activeSegment = -1;
      const canvas = document.getElementById('donut-canvas');
      if (!canvas) return;
      drawDonut(canvas.getContext('2d'), 1, -1);
      resetCenterLabel();
      highlightLegend(-1);
    });
    row.addEventListener('click', () => navigateToSchools(i));
  });

  // Init auth on page load
  if (typeof initAuth === 'function') initAuth();

  // Update nav login button based on session
  updateNavAuthBtn();
});

function updateNavAuthBtn() {
  const session = typeof getSession === 'function' ? getSession() : null;
  const btn = document.getElementById('nav-login-btn');
  if (!btn) return;
  if (session) {
    btn.textContent = 'Dashboard →';
  } else {
    btn.textContent = 'เข้าสู่ระบบ';
  }
}

// ── Init on load ──
window.addEventListener('load', () => {
  initDonut();
  animateLegendBars();
  animateCountUp();
});

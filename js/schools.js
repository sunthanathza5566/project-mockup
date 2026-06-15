// ─── SCHOOL DETAIL PAGE ───

let currentLevelKey = 'primary';
let currentSchoolList = [];

function navigateToSchools(segIndex) {
  const meta = levelMeta[segIndex];
  currentLevelKey = meta.key;
  buildSchoolPage(meta);

  const main = document.getElementById('page-main');
  const schools = document.getElementById('page-schools');

  main.classList.add('exit');

  // Wait for page-main exit animation, then swap display
  setTimeout(() => {
    main.style.display = 'none';
    schools.style.display = 'block';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => schools.classList.add('enter'));
    });
  }, 320);
}

function goHome() {
  const main = document.getElementById('page-main');
  const schools = document.getElementById('page-schools');

  schools.classList.remove('enter');
  setTimeout(() => {
    schools.style.display = 'none';
    main.style.display = '';
    main.classList.remove('exit');
    window.scrollTo(0, 0);
  }, 380);
}

function buildSchoolPage(meta) {
  document.getElementById('breadcrumb-level').textContent = meta.label;
  document.getElementById('schools-page-title').innerHTML = `โรงเรียน<em>${meta.label}</em>`;
  document.getElementById('schools-page-desc').textContent = meta.desc;
  document.getElementById('kpi-schools').textContent = meta.count.toLocaleString('th-TH');
  document.getElementById('kpi-students').textContent = meta.students;
  document.getElementById('kpi-rating').textContent = '⭐ ' + meta.rating;

  const badge = document.getElementById('level-badge');
  badge.textContent = meta.emoji + ' ' + meta.label;
  badge.style.background = meta.color + '18';
  badge.style.color = meta.color;
  badge.style.border = '1px solid ' + meta.color + '40';

  document.getElementById('school-search').value = '';
  currentSchoolList = schoolsData[meta.key] || [];
  renderSchoolGrid(currentSchoolList);
}

function filterSchools() {
  const q = document.getElementById('school-search').value.toLowerCase();
  const sort = document.getElementById('school-sort').value;
  let list = currentSchoolList.filter(s =>
    s.name.toLowerCase().includes(q) || s.province.toLowerCase().includes(q)
  );
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  else if (sort === 'students') list.sort((a, b) => b.students - a.students);
  renderSchoolGrid(list);
}

function renderSchoolGrid(list) {
  const grid = document.getElementById('schools-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="no-results">ไม่พบโรงเรียนที่ค้นหา ลองคีย์เวิร์ดอื่น</div>';
    return;
  }

  const icons = ['🏫','📚','🎒','🏛️','📐','🔬','🌿','⭐'];

  grid.innerHTML = list.map((s, idx) => {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<span class="star" style="color:${i < Math.floor(s.rating) ? '#C4804A' : '#DDD'}">★</span>`
    ).join('');

    const reviews = reviewPool[s.reviews] || [];
    const reviewsHtml = reviews.map(r => {
      const rStars = Array.from({ length: 5 }, (_, i) =>
        `<span class="star" style="color:${i < r.rating ? '#C4804A' : '#DDD'}">★</span>`
      ).join('');
      const initials = r.name.replace('ครู','').replace('Mr.','').replace('Ms.','').trim().substring(0, 2);
      return `<div class="review-item">
        <div class="review-header">
          <div class="reviewer-avatar">${initials}</div>
          <div>
            <div class="reviewer-name">${r.name}</div>
            <div class="reviewer-role">${r.role}</div>
          </div>
          <div class="review-stars">${rStars}</div>
          <div class="review-product">${r.product}</div>
        </div>
        <div class="review-text">"${r.text}"</div>
        <div class="review-date">${r.date}</div>
      </div>`;
    }).join('');

    const tagsHtml = s.tags.map(t => `<span class="school-tag">${t}</span>`).join('');

    return `<div class="school-card">
      <div class="school-card-header">
        <div class="school-logo">${icons[idx % icons.length]}</div>
        <div class="school-info">
          <div class="school-name" title="${s.name}">${s.name}</div>
          <div class="school-meta">
            <span>📍 ${s.province}</span>
            <span>·</span>
            <span>${s.students.toLocaleString('th-TH')} นักเรียน</span>
          </div>
        </div>
        <div class="school-rating">${stars} ${s.rating}</div>
      </div>
      <div class="school-tags">${tagsHtml}</div>
      <div class="reviews-section">
        <button class="reviews-toggle" onclick="toggleReviews(this)">
          <span>💬 รีวิวจากคุณครู (${reviews.length})</span>
          <span class="toggle-arrow">▼</span>
        </button>
        <div class="reviews-list">${reviewsHtml}</div>
      </div>
    </div>`;
  }).join('');
}

function toggleReviews(btn) {
  const list = btn.nextElementSibling;
  const arrow = btn.querySelector('.toggle-arrow');
  const isOpen = list.classList.toggle('open');
  arrow.classList.toggle('open', isOpen);
}

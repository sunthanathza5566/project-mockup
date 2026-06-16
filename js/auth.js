// ─── AUTH SYSTEM ───

const AUTH_KEY        = 'eduflow_users';
const SESSION_KEY     = 'eduflow_session';
const ATTEMPTS_KEY    = 'eduflow_attempts';
const PERMISSIONS_KEY = 'eduflow_permissions';
const WEBADMIN_LOG_KEY = 'eduflow_webadmin_log';

const MAX_ATTEMPTS      = 5;
const LOCKOUT_MS        = 5 * 60 * 1000; // 5 min

// Pre-seeded accounts — web_admin MUST be added here (cannot self-register)
const SEEDED_USERS = [
  { username: 'webadmin', password: 'Admin123', role: 'web_admin',    name: 'ผู้ดูแลระบบหลัก',       seeded: true, createdAt: '2567-01-01' },
  { username: 'teacher1', password: 'Teacher1', role: 'teacher',      name: 'ครูสมชาย ใจดี',         school: 'โรงเรียนทดสอบ EduFlow' },
  { username: 'student1', password: 'Student1', role: 'student',      name: 'ธนาพร สุขใจ',           code: '10021', class: 'ม.1/1' },
  { username: 'parent1',  password: 'Parent01', role: 'parent',       name: 'คุณพ่อสมชาย สุขใจ',    childCode: '10021', childName: 'ธนาพร สุขใจ' },
  { username: 'schadmin', password: 'Admin001', role: 'school_admin', name: 'ผู้ดูแลโรงเรียนทดสอบ', school: 'โรงเรียนทดสอบ EduFlow' },
];

const DEFAULT_PERMISSIONS = {
  teacher:      { viewAttendance: true,  editAttendance: true,  viewReports: true,   exportData: true,  manageStudents: false },
  student:      { viewOwnHistory: true,  viewSchedule: true,    viewGrades: false },
  parent:       { viewChildStatus: true, viewHistory: true,     contactTeacher: true },
  school_admin: { manageTeachers: true,  manageStudents: true,  viewAllReports: true, exportData: true, manageParents: false },
};

const PERMISSION_LABELS = {
  teacher:      { viewAttendance: 'ดูการเช็คชื่อ', editAttendance: 'แก้ไขการเช็คชื่อ', viewReports: 'ดูรายงาน', exportData: 'Export ข้อมูล', manageStudents: 'จัดการนักเรียน' },
  student:      { viewOwnHistory: 'ดูประวัติตัวเอง', viewSchedule: 'ดูตารางเรียน', viewGrades: 'ดูเกรด' },
  parent:       { viewChildStatus: 'ดูสถานะบุตรหลาน', viewHistory: 'ดูประวัติการมาเรียน', contactTeacher: 'ติดต่อครู' },
  school_admin: { manageTeachers: 'จัดการครู', manageStudents: 'จัดการนักเรียน', viewAllReports: 'ดูรายงานทั้งหมด', exportData: 'Export ข้อมูล', manageParents: 'จัดการผู้ปกครอง' },
};

const ROLE_LABELS = { web_admin: 'ผู้ดูแลระบบเว็บ', school_admin: 'Admin โรงเรียน', teacher: 'ครู', student: 'นักเรียน', parent: 'ผู้ปกครอง' };

// ─── Init ─────────────────────────────────────────────────────────────
function initAuth() {
  if (!localStorage.getItem(AUTH_KEY)) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(SEEDED_USERS));
  } else {
    const users = getUsers();
    if (!users.some(u => u.role === 'web_admin' && u.seeded)) {
      users.unshift(SEEDED_USERS[0]);
      saveUsers(users);
    }
  }
  if (!localStorage.getItem(PERMISSIONS_KEY))
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(DEFAULT_PERMISSIONS));
  if (!localStorage.getItem(WEBADMIN_LOG_KEY))
    localStorage.setItem(WEBADMIN_LOG_KEY, JSON.stringify({
      admins: [{ username: 'webadmin', name: 'ผู้ดูแลระบบหลัก', addedAt: '2567-01-01', addedBy: 'SYSTEM' }],
      loginHistory: []
    }));
}

// ─── User store ────────────────────────────────────────────────────────
function getUsers()        { return JSON.parse(localStorage.getItem(AUTH_KEY) || '[]'); }
function saveUsers(u)      { localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }
function getPermissions()  { return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || JSON.stringify(DEFAULT_PERMISSIONS)); }
function savePermissions(p){ localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(p)); }

// ─── Session ───────────────────────────────────────────────────────────
function getSession() { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username, role: user.role, name: user.name,
    school: user.school || '', code: user.code || '',
    childName: user.childName || '', class: user.class || '',
    loginAt: Date.now()
  }));
}
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// ─── Validation ────────────────────────────────────────────────────────
function isValidFormat(str) { return /^[a-zA-Z0-9]{1,8}$/.test(str); }

// ─── Lockout ───────────────────────────────────────────────────────────
function getAttempts(username) {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  return all[username] || { count: 0, lockUntil: 0 };
}
function saveAttempts(username, rec) {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  all[username] = rec;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
}
function getLockUntil(username) {
  const rec = getAttempts(username);
  return (rec.lockUntil && Date.now() < rec.lockUntil) ? rec.lockUntil : 0;
}
function recordFail(username) {
  const rec = getAttempts(username);
  rec.count = (rec.count || 0) + 1;
  if (rec.count >= MAX_ATTEMPTS) { rec.lockUntil = Date.now() + LOCKOUT_MS; rec.count = 0; }
  saveAttempts(username, rec);
  return rec;
}
function clearAttempts(username) {
  const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  delete all[username];
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
}
function remainingAttempts(username) { return MAX_ATTEMPTS - (getAttempts(username).count || 0); }

// ─── Web admin log ─────────────────────────────────────────────────────
function logWebAdminLogin(username) {
  const log = JSON.parse(localStorage.getItem(WEBADMIN_LOG_KEY) || '{"admins":[],"loginHistory":[]}');
  log.loginHistory.push({ username, timestamp: new Date().toLocaleString('th-TH'), action: 'LOGIN' });
  localStorage.setItem(WEBADMIN_LOG_KEY, JSON.stringify(log));
}
function getWebAdminLog() {
  return JSON.parse(localStorage.getItem(WEBADMIN_LOG_KEY) || '{"admins":[],"loginHistory":[]}');
}

// ─── Lockout countdown ─────────────────────────────────────────────────
let lockoutTimer = null;
function startLockoutCountdown(username, el) {
  clearInterval(lockoutTimer);
  lockoutTimer = setInterval(() => {
    const until = getLockUntil(username);
    if (!until) {
      el.textContent = 'บัญชีถูกปลดล็อคแล้ว — สามารถเข้าสู่ระบบได้อีกครั้ง';
      el.className = 'auth-alert auth-alert-ok';
      clearInterval(lockoutTimer);
      return;
    }
    const s = Math.ceil((until - Date.now()) / 1000);
    el.textContent = `บัญชีถูกล็อค — โปรดรอ ${Math.floor(s/60)} นาที ${s%60} วินาที`;
  }, 1000);
}

// ─── Handle Login ──────────────────────────────────────────────────────
function handleLogin() {
  const username = (document.getElementById('login-username').value || '').trim();
  const password = document.getElementById('login-password').value || '';
  const errEl    = document.getElementById('login-error-msg');
  const lockEl   = document.getElementById('login-lockout-msg');
  const hintEl   = document.getElementById('login-attempts-hint');

  errEl.style.display = 'none';
  lockEl.style.display = 'none';
  hintEl.style.display = 'none';

  if (!isValidFormat(username) || !isValidFormat(password)) {
    errEl.textContent = 'รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง';
    errEl.style.display = 'flex';
    return;
  }

  const lockUntil = getLockUntil(username);
  if (lockUntil) {
    lockEl.style.display = 'flex';
    startLockoutCountdown(username, lockEl);
    return;
  }

  const user = getUsers().find(u => u.username === username && u.password === password);
  if (!user) {
    recordFail(username);
    const nowLocked = getLockUntil(username);
    if (nowLocked) {
      lockEl.style.display = 'flex';
      startLockoutCountdown(username, lockEl);
    } else {
      errEl.textContent = 'รูปแบบ Username หรือ รหัสผ่านผิด โปรดตรวจสอบแล้วทำการเข้าสู่ระบบอีกครั้ง';
      errEl.style.display = 'flex';
      hintEl.textContent = `เหลืออีก ${remainingAttempts(username)} ครั้งก่อนถูกล็อค 5 นาที`;
      hintEl.style.display = 'block';
    }
    return;
  }

  clearAttempts(username);
  setSession(user);
  if (user.role === 'web_admin') logWebAdminLogin(username);
  showToast(`ยินดีต้อนรับ ${user.name}`);

  if (user.role === 'student') {
    showOnlyPage('page-student');
    if (typeof buildStudentPage === 'function') buildStudentPage();
  } else if (user.role === 'teacher') {
    showOnlyPage('page-teacher');
    if (typeof buildTeacherPage === 'function') buildTeacherPage();
  } else {
    showOnlyPage('page-dashboard');
    buildDashboard();
  }
}

// ─── Handle Register ───────────────────────────────────────────────────
function handleRegister() {
  const role     = document.getElementById('reg-role').value;
  const name     = (document.getElementById('reg-name').value || '').trim();
  const username = (document.getElementById('reg-username').value || '').trim();
  const password = document.getElementById('reg-password').value || '';
  const confirm  = document.getElementById('reg-confirm').value || '';
  const errEl    = document.getElementById('reg-error-msg');

  errEl.style.display = 'none';

  if (!role)    { showRegError('กรุณาเลือกประเภทบัญชี'); return; }
  if (!name)    { showRegError('กรุณากรอกชื่อ-นามสกุล'); return; }
  if (!isValidFormat(username)) { showRegError('Username ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น ไม่เกิน 8 ตัว'); return; }
  if (!isValidFormat(password)) { showRegError('รหัสผ่านต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น ไม่เกิน 8 ตัว'); return; }
  if (password !== confirm)     { showRegError('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'); return; }
  if (getUsers().some(u => u.username === username)) { showRegError('Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username ใหม่'); return; }

  const users = getUsers();
  users.push({ username, password, role, name, createdAt: new Date().toLocaleString('th-TH') });
  saveUsers(users);
  showToast('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
  goToLogin();
}

function showRegError(msg) {
  const el = document.getElementById('reg-error-msg');
  el.textContent = msg;
  el.style.display = 'flex';
}

// ─── Logout ────────────────────────────────────────────────────────────
function logout() { clearSession(); showToast('ออกจากระบบแล้ว'); showOnlyPage('page-main'); }

// ─── Toggle password ───────────────────────────────────────────────────
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ─── Dashboard builder ─────────────────────────────────────────────────
function buildDashboard() {
  const user = getSession();
  if (!user) { showOnlyPage('page-login'); return; }

  const initials = user.name.replace(/\s+/g, '').substring(0, 2);
  document.getElementById('dash-user-name').textContent  = user.name;
  document.getElementById('dash-user-role').textContent  = ROLE_LABELS[user.role] || user.role;
  document.getElementById('dash-user-avatar').textContent = initials;

  const content = document.getElementById('dash-content');
  switch (user.role) {
    case 'web_admin':    content.innerHTML = buildWebAdminHTML(user);    break;
    case 'school_admin': content.innerHTML = buildSchoolAdminHTML(user); break;
    case 'teacher':      content.innerHTML = buildTeacherHTML(user);     break;
    case 'student':      content.innerHTML = buildStudentHTML(user);     break;
    case 'parent':       content.innerHTML = buildParentHTML(user);      break;
  }

  if (user.role === 'web_admin') {
    renderPermissionPanel();
    renderAdminUserList();
    renderWebAdminLog();
  }
}

// ─── Web Admin HTML ────────────────────────────────────────────────────
function buildWebAdminHTML(user) {
  const users = getUsers();
  const total = users.length;
  const log   = getWebAdminLog();
  return `
    <div class="dash-section">
      <div class="section-label">Web Admin · ระดับสูงสุด</div>
      <h2 class="dash-h2">ภาพรวม<em>ระบบทั้งหมด</em></h2>
      <div class="dash-kpi-row">
        <div class="dash-kpi"><div class="dash-kpi-num">${total}</div><div class="dash-kpi-label">บัญชีผู้ใช้</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">847</div><div class="dash-kpi-label">โรงเรียน</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">${log.loginHistory.length}</div><div class="dash-kpi-label">เข้าระบบ (Admin)</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">${log.admins.length}</div><div class="dash-kpi-label">Web Admins</div></div>
      </div>
    </div>
    <div class="dash-section">
      <div class="dash-tabs-bar">
        <button class="dash-tab-btn active" onclick="switchDashTab(this,'dtab-users')">จัดการผู้ใช้</button>
        <button class="dash-tab-btn" onclick="switchDashTab(this,'dtab-perms')">สิทธิ์การเข้าถึง</button>
        <button class="dash-tab-btn" onclick="switchDashTab(this,'dtab-log')">Web Admin Log</button>
      </div>
      <div id="dtab-users" class="dash-tab-pane"><div id="admin-user-list" class="dash-list"></div></div>
      <div id="dtab-perms" class="dash-tab-pane" style="display:none;"><div id="permission-panel" class="perm-grid"></div></div>
      <div id="dtab-log"   class="dash-tab-pane" style="display:none;"><div id="webadmin-log"   class="log-wrap"></div></div>
    </div>`;
}

// ─── School Admin HTML ─────────────────────────────────────────────────
function buildSchoolAdminHTML(user) {
  return `
    <div class="dash-section">
      <div class="section-label">Admin โรงเรียน</div>
      <h2 class="dash-h2"><em>${user.school || 'โรงเรียนของคุณ'}</em></h2>
      <div class="dash-kpi-row">
        <div class="dash-kpi"><div class="dash-kpi-num">42</div><div class="dash-kpi-label">ครู</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">1,240</div><div class="dash-kpi-label">นักเรียน</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">71%</div><div class="dash-kpi-label">มาทันวันนี้</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">8%</div><div class="dash-kpi-label">ขาดเรียน</div></div>
      </div>
    </div>
    <div class="dash-section">
      <div class="dash-section-title">สรุปการเข้าเรียนวันนี้</div>
      <div class="dash-attendance-bars">
        ${[['มาทัน','#5C8A5C',71],['มาสาย','#C4804A',21],['ขาดเรียน','#A05050',8]].map(([l,c,v])=>`
          <div class="dash-bar-row">
            <span class="dash-bar-label">${l}</span>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${v}%;background:${c}"></div></div>
            <span class="dash-bar-val" style="color:${c}">${v}%</span>
          </div>`).join('')}
      </div>
      <div class="dash-actions-row">
        <button class="dash-action-btn" onclick="showToast('กำลังสร้างรายงาน...')">📊 Export รายงาน</button>
        <button class="dash-action-btn" onclick="showToast('กำลังส่งแจ้งเตือน...')">📩 แจ้งผู้ปกครอง</button>
      </div>
    </div>`;
}

// ─── Teacher HTML ──────────────────────────────────────────────────────
function buildTeacherHTML(user) {
  const schedule = [
    { period:'คาบ 1 (08:00–09:00)', subject:'คณิตศาสตร์', room:'ห้อง 201', class:'ม.1/1' },
    { period:'คาบ 2 (09:00–10:00)', subject:'คณิตศาสตร์', room:'ห้อง 204', class:'ม.2/2' },
    { period:'คาบ 4 (11:00–12:00)', subject:'สถิติ',       room:'ห้อง 201', class:'ม.3/1' },
  ];
  return `
    <div class="dash-section">
      <div class="section-label">ครู · ${user.school || 'โรงเรียนของคุณ'}</div>
      <h2 class="dash-h2">สวัสดี คุณครู<em>${user.name.replace('ครู','').trim()}</em></h2>
      <div class="dash-kpi-row">
        <div class="dash-kpi"><div class="dash-kpi-num">3</div><div class="dash-kpi-label">คาบวันนี้</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">85</div><div class="dash-kpi-label">นักเรียนทั้งหมด</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">3</div><div class="dash-kpi-label">ขาดเรียนวันนี้</div></div>
      </div>
    </div>
    <div class="dash-section">
      <div class="dash-section-title">ตารางสอนวันนี้</div>
      <div class="dash-schedule">
        ${schedule.map(s=>`
          <div class="dash-schedule-row">
            <div class="dash-period-badge">${s.period}</div>
            <div class="dash-subject">${s.subject} — ${s.class}</div>
            <div class="dash-room">${s.room}</div>
            <button class="dash-check-btn" onclick="showToast('เปิดหน้าเช็คชื่อ ${s.class}...')">เช็คชื่อ</button>
          </div>`).join('')}
      </div>
      <div class="dash-actions-row" style="margin-top:1.5rem;">
        <button class="dash-action-btn" onclick="showToast('กำลังสร้าง QR Code...')">🔲 สร้าง QR Code</button>
        <button class="dash-action-btn" onclick="showToast('กำลังสร้างรายงาน...')">📊 ดูรายงาน</button>
      </div>
    </div>`;
}

// ─── Student HTML ──────────────────────────────────────────────────────
function buildStudentHTML(user) {
  const week = [
    { day:'จ', status:'on-time' }, { day:'อ', status:'on-time' },
    { day:'พ', status:'late' },    { day:'พฤ', status:'on-time' },
    { day:'ศ', status:'absent' },
  ];
  const dotClass = { 'on-time': 'dot-ok', late: 'dot-late', absent: 'dot-absent' };
  const dotLabel = { 'on-time': 'มาทัน',  late: 'มาสาย',    absent: 'ขาด' };
  return `
    <div class="dash-section">
      <div class="section-label">นักเรียน · ${user.class || 'ม.1/1'} · รหัส ${user.code || '—'}</div>
      <h2 class="dash-h2">สวัสดี<em>${user.name}</em></h2>
      <button onclick="showOnlyPage('page-student');if(typeof buildStudentPage==='function')buildStudentPage();"
        style="display:inline-flex;align-items:center;gap:0.5rem;background:var(--brown-dark);color:var(--cream);
        border:none;border-radius:50px;padding:0.75rem 1.75rem;font-family:'DM Sans',sans-serif;
        font-size:0.9rem;font-weight:500;cursor:pointer;letter-spacing:0.03em;
        box-shadow:0 4px 16px rgba(61,43,26,0.2);transition:all 0.2s;"
        onmouseover="this.style.background='var(--brown-deep)';this.style.transform='translateY(-1px)'"
        onmouseout="this.style.background='var(--brown-dark)';this.style.transform=''">
        เข้าสู่หน้าหลักนักเรียน →
      </button>
    </div>
    <div class="dash-section">
      <div class="dash-section-title">การมาเรียนสัปดาห์นี้</div>
      <div class="dash-week-row">
        ${week.map(w=>`
          <div class="dash-day-box">
            <div class="dash-day-label">${w.day}</div>
            <div class="dash-day-dot ${dotClass[w.status]}"></div>
            <div class="dash-day-status">${dotLabel[w.status]}</div>
          </div>`).join('')}
      </div>
      <div class="dash-attendance-bars" style="margin-top:1.5rem;">
        ${[['มาทัน','#5C8A5C',80],['มาสาย','#C4804A',13],['ขาดเรียน','#A05050',7]].map(([l,c,v])=>`
          <div class="dash-bar-row">
            <span class="dash-bar-label">${l}</span>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${v}%;background:${c}"></div></div>
            <span class="dash-bar-val" style="color:${c}">${v}%</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ─── Parent HTML ───────────────────────────────────────────────────────
function buildParentHTML(user) {
  return `
    <div class="dash-section">
      <div class="section-label">ผู้ปกครอง</div>
      <h2 class="dash-h2">สถานะบุตรหลาน<em>${user.childName || 'ของคุณ'}</em></h2>
      <div class="dash-kpi-row">
        <div class="dash-kpi"><div class="dash-kpi-num" style="color:#5C8A5C;">มาทัน</div><div class="dash-kpi-label">สถานะวันนี้ (08:02)</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">80%</div><div class="dash-kpi-label">มาทันเดือนนี้</div></div>
        <div class="dash-kpi"><div class="dash-kpi-num">2</div><div class="dash-kpi-label">ขาดเรียนเดือนนี้</div></div>
      </div>
    </div>
    <div class="dash-section">
      <div class="dash-section-title">แจ้งเตือนล่าสุด</div>
      <div class="dash-notif-list">
        <div class="dash-notif dash-notif-ok">🟢 วันนี้ ${user.childName||'บุตรหลาน'} มาโรงเรียนทัน เวลา 08:02 น.</div>
        <div class="dash-notif dash-notif-late">🟡 เมื่อวาน มาสาย 12 นาที — คาบ 1 วิทย์ฯ</div>
        <div class="dash-notif">📩 รายงานประจำเดือน พ.ค. 2567 พร้อมให้ดาวน์โหลด</div>
      </div>
      <div class="dash-actions-row" style="margin-top:1.5rem;">
        <button class="dash-action-btn" onclick="showToast('กำลังโหลดรายงาน...')">📋 ดูรายงานทั้งหมด</button>
        <button class="dash-action-btn" onclick="showToast('กำลังติดต่อครู...')">💬 ติดต่อครู</button>
      </div>
    </div>`;
}

// ─── Dashboard tab switcher ────────────────────────────────────────────
function switchDashTab(btn, tabId) {
  btn.closest('.dash-section').querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.dash-section').querySelectorAll('.dash-tab-pane').forEach(p => p.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}

// ─── Permission panel ──────────────────────────────────────────────────
function renderPermissionPanel() {
  const container = document.getElementById('permission-panel');
  if (!container) return;
  const perms = getPermissions();
  const roleNames = { teacher: 'ครู', student: 'นักเรียน', parent: 'ผู้ปกครอง', school_admin: 'Admin โรงเรียน' };
  container.innerHTML = Object.keys(roleNames).map(role => {
    const rp = perms[role] || {};
    const rl = PERMISSION_LABELS[role] || {};
    return `<div class="perm-group">
      <div class="perm-group-title">${roleNames[role]}</div>
      ${Object.keys(rp).map(perm => `
        <label class="perm-row">
          <input type="checkbox" ${rp[perm]?'checked':''} onchange="togglePermission('${role}','${perm}',this.checked)">
          <span>${rl[perm]||perm}</span>
        </label>`).join('')}
    </div>`;
  }).join('');
}

function togglePermission(role, perm, val) {
  const perms = getPermissions();
  if (!perms[role]) perms[role] = {};
  perms[role][perm] = val;
  savePermissions(perms);
  showToast(`อัปเดตสิทธิ์ ${PERMISSION_LABELS[role]?.[perm]||perm} → ${val?'เปิด':'ปิด'}`);
}

// ─── Admin user list ───────────────────────────────────────────────────
function renderAdminUserList() {
  const container = document.getElementById('admin-user-list');
  if (!container) return;
  const users = getUsers();
  container.innerHTML = `
    <div class="admin-list-header">
      <span>บัญชีผู้ใช้ทั้งหมด (${users.length})</span>
      <span class="admin-list-hint">* web_admin ไม่สามารถลบได้ ต้องแก้ไขในโค้ด</span>
    </div>` +
    users.map(u => `
      <div class="admin-user-row">
        <span class="admin-role-pill role-${u.role}">${ROLE_LABELS[u.role]||u.role}</span>
        <span class="admin-uname">${u.username}</span>
        <span class="admin-uname-full">${u.name}</span>
        ${u.role !== 'web_admin'
          ? `<button class="admin-del-btn" onclick="deleteUser('${u.username}')">ลบ</button>`
          : `<span class="admin-protected">🔒</span>`}
      </div>`).join('');
}

function deleteUser(username) {
  if (!confirm(`ยืนยันการลบบัญชี "${username}" ออกจากระบบ?`)) return;
  saveUsers(getUsers().filter(u => u.username !== username));
  renderAdminUserList();
  showToast(`ลบบัญชี ${username} แล้ว`);
}

// ─── Web Admin Log ─────────────────────────────────────────────────────
function renderWebAdminLog() {
  const container = document.getElementById('webadmin-log');
  if (!container) return;
  const log = getWebAdminLog();
  const adminsHtml = log.admins.map(a =>
    `<div class="log-row"><span class="log-badge">Admin</span> <strong>${a.username}</strong> (${a.name}) — เพิ่มโดย ${a.addedBy} เมื่อ ${a.addedAt}</div>`
  ).join('');
  const history = (log.loginHistory || []).slice(-20).reverse();
  const histHtml = history.length
    ? history.map(h => `<div class="log-row"><span class="log-badge log-badge-login">LOGIN</span> ${h.username} — ${h.timestamp}</div>`).join('')
    : `<div class="log-empty">ยังไม่มีประวัติการเข้าสู่ระบบ</div>`;
  container.innerHTML = `
    <div class="log-section"><div class="log-section-title">Web Admins ที่มีในระบบ</div>${adminsHtml}</div>
    <div class="log-section"><div class="log-section-title">ประวัติการเข้าสู่ระบบ (20 รายการล่าสุด)</div>${histHtml}</div>
    <div class="log-note">* เพิ่ม Web Admin ใหม่ต้องแก้ไขที่ SEEDED_USERS ใน auth.js และ deploy ใหม่เท่านั้น</div>`;
}

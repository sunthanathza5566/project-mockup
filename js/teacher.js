// ─── TEACHER DASHBOARD ───

const TCH_COLORS = {
  math:  { bg:'rgba(196,128,74,0.13)',  border:'rgba(196,128,74,0.35)',  text:'#7A4A20', dot:'#C4804A' },
  thai:  { bg:'rgba(92,138,92,0.13)',   border:'rgba(92,138,92,0.35)',   text:'#2E5C2E', dot:'#5C8A5C' },
  sci:   { bg:'rgba(107,79,47,0.13)',   border:'rgba(107,79,47,0.35)',   text:'#5A3820', dot:'#8B6040' },
  eng:   { bg:'rgba(100,130,196,0.13)', border:'rgba(100,130,196,0.35)', text:'#2A4070', dot:'#6B80C8' },
  stats: { bg:'rgba(138,158,126,0.13)', border:'rgba(138,158,126,0.35)', text:'#3D5C35', dot:'#8A9E7E' },
};
function tchColor(key) { return TCH_COLORS[key] || TCH_COLORS.math; }

// ── Mock Data (ขยายให้สอดคล้องความเป็นจริง) ──
const TEACHER_DATA = {
  profile: {
    name:'ครูสมชาย ใจดี', teacherId:'T001',
    school:'โรงเรียนทดสอบ EduFlow', subject:'คณิตศาสตร์', academicYear:'2567',
  },
  classes: [
    { id:'c1', grade:'ม.1', room:'1', subject:'คณิตศาสตร์', key:'math',  icon:'📐', color:'#C4804A' },
    { id:'c2', grade:'ม.2', room:'2', subject:'คณิตศาสตร์', key:'math',  icon:'📐', color:'#C4804A' },
    { id:'c3', grade:'ม.3', room:'1', subject:'สถิติ',       key:'stats', icon:'📊', color:'#8A9E7E' },
  ],
  students: [
    { id:'S001', code:'10021', name:'ธนาพร สุขใจ',     classId:'c1' },
    { id:'S002', code:'10022', name:'สมศักดิ์ มีสุข',   classId:'c1' },
    { id:'S003', code:'10023', name:'มาลี วาดเก่ง',     classId:'c1' },
    { id:'S004', code:'10024', name:'อนุชา ดีมาก',      classId:'c1' },
    { id:'S005', code:'10025', name:'สุภา ใจดี',        classId:'c1' },
    { id:'S006', code:'20021', name:'วิชัย รักเรียน',   classId:'c2' },
    { id:'S007', code:'20022', name:'นาตยา สวยงาม',     classId:'c2' },
    { id:'S008', code:'20023', name:'ประเสริฐ เก่งมาก', classId:'c2' },
    { id:'S009', code:'30021', name:'ทวีศักดิ์ มั่นคง', classId:'c3' },
    { id:'S010', code:'30022', name:'ปริญญา ดีงาม',     classId:'c3' },
    { id:'S011', code:'30023', name:'วรรณา ขยันดี',     classId:'c3' },
  ],
  schedule: {
    mon: [
      { period:1, time:'08:00–09:00', subject:'คณิตศาสตร์', classId:'c1', room:'ห้อง 201', key:'math' },
      { period:2, time:'09:00–10:00', subject:'คณิตศาสตร์', classId:'c2', room:'ห้อง 204', key:'math' },
      { period:4, time:'11:00–12:00', subject:'สถิติ',       classId:'c3', room:'ห้อง 201', key:'stats' },
    ],
    tue: [
      { period:2, time:'09:00–10:00', subject:'คณิตศาสตร์', classId:'c1', room:'ห้อง 204', key:'math' },
      { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', classId:'c2', room:'ห้อง 204', key:'math' },
    ],
    wed: [
      { period:3, time:'10:00–11:00', subject:'คณิตศาสตร์', classId:'c1', room:'ห้อง 201', key:'math' },
      { period:6, time:'14:00–15:00', subject:'สถิติ',       classId:'c3', room:'ห้อง 201', key:'stats' },
    ],
    thu: [
      { period:1, time:'08:00–09:00', subject:'คณิตศาสตร์', classId:'c2', room:'ห้อง 201', key:'math' },
      { period:4, time:'11:00–12:00', subject:'คณิตศาสตร์', classId:'c1', room:'ห้อง 201', key:'math' },
    ],
    fri: [
      { period:2, time:'09:00–10:00', subject:'สถิติ',       classId:'c3', room:'ห้อง 201', key:'stats' },
      { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', classId:'c1', room:'ห้อง 201', key:'math' },
    ],
  },

  // ── 13 งาน (6 ม.1 / 4 ม.2 / 3 ม.3) ──
  assignments: [
    // ── ม.1/1 (c1) ──
    {
      id:1, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'แบบฝึกหัด บท.1: จำนวนและพีชคณิตเบื้องต้น',
      description:'ทำแบบฝึกหัดหน้า 10–18 ข้อ 1–15 ส่งในสมุด',
      maxScore:5, dueDate:'05/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S001', submittedAt:'04/06/2567 20:10', score:5,    status:'graded',    teacherNote:'เยี่ยม', studentNote:'ส่งครบแล้วครับ',                files:['hw1_thanapon.pdf'],   fileCount:1 },
        { studentId:'S002', submittedAt:'05/06/2567 07:55', score:4,    status:'graded',    teacherNote:'',       studentNote:'',                              files:['hw1_somsak.pdf'],     fileCount:1 },
        { studentId:'S003', submittedAt:'04/06/2567 18:30', score:5,    status:'graded',    teacherNote:'ดีมาก', studentNote:'ทำเองทุกข้อค่ะ',              files:['hw1_malee.pdf'],      fileCount:1 },
        { studentId:'S004', submittedAt:'05/06/2567 08:00', score:3,    status:'graded',    teacherNote:'',       studentNote:'',                              files:['hw1_anucha.pdf'],     fileCount:1 },
        { studentId:'S005', submittedAt:'04/06/2567 22:00', score:4,    status:'graded',    teacherNote:'',       studentNote:'',                              files:['hw1_supa.pdf'],       fileCount:1 },
      ]
    },
    {
      id:2, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'แบบฝึกหัด บท.2: สมการและอสมการ',
      description:'ทำแบบฝึกหัดหน้า 35–42 ข้อ 1–20 ส่งในสมุด พร้อมแสดงวิธีคิด',
      maxScore:10, dueDate:'12/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S001', submittedAt:'11/06/2567 21:00', score:9,    status:'graded',    teacherNote:'ดีมาก แสดงวิธีทำชัดเจน', studentNote:'', files:['hw2_thanapon.pdf'], fileCount:1 },
        { studentId:'S002', submittedAt:'12/06/2567 08:00', score:7,    status:'graded',    teacherNote:'',       studentNote:'',                              files:['hw2_somsak.pdf'],     fileCount:1 },
        { studentId:'S003', submittedAt:'11/06/2567 19:30', score:10,   status:'graded',    teacherNote:'เยี่ยมมาก', studentNote:'',                          files:['hw2_malee.pdf'],      fileCount:1 },
        { studentId:'S004', submittedAt:'12/06/2567 07:50', score:6,    status:'graded',    teacherNote:'',       studentNote:'ทำไม่เสร็จข้อสุดท้ายค่ะ',     files:['hw2_anucha.pdf'],     fileCount:1 },
        { studentId:'S005', submittedAt:'11/06/2567 23:15', score:8,    status:'graded',    teacherNote:'',       studentNote:'',                              files:['hw2_supa.pdf'],       fileCount:1 },
      ]
    },
    {
      id:3, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'Quiz บท.2: สมการเชิงเส้นตัวแปรเดียว (ข้อสอบในชั้น)',
      description:'ข้อสอบ 10 ข้อ ใช้เวลา 30 นาที ไม่อนุญาตให้เปิดหนังสือ',
      maxScore:20, dueDate:'10/06/2567', fileRequired:0,
      submissions: [
        { studentId:'S001', submittedAt:'10/06/2567 09:30', score:17, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S002', submittedAt:'10/06/2567 09:30', score:15, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S003', submittedAt:'10/06/2567 09:30', score:18, status:'graded', teacherNote:'เยี่ยมมาก', studentNote:'', files:[], fileCount:0 },
        { studentId:'S004', submittedAt:'10/06/2567 09:30', score:12, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S005', submittedAt:'10/06/2567 09:30', score:14, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:4, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'แบบฝึกหัด บท.3: สมการเชิงเส้นสองตัวแปร',
      description:'ทำแบบฝึกหัดหน้า 45–50 ข้อ 1–20 ส่งในสมุดแบบฝึกหัด',
      maxScore:10, dueDate:'17/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S001', submittedAt:'16/06/2567 09:32', score:null, status:'submitted', teacherNote:'', studentNote:'ส่งงานครบแล้วนะครับ มีข้อที่ไม่แน่ใจอยู่บ้าง', files:['hw3_thanapon.pdf'], fileCount:1 },
        { studentId:'S002', submittedAt:'15/06/2567 14:20', score:8,    status:'graded',    teacherNote:'ดีมาก', studentNote:'',                              files:['hw3_somsak.pdf'],     fileCount:1 },
        { studentId:'S003', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S004', submittedAt:'16/06/2567 11:15', score:null, status:'submitted', teacherNote:'', studentNote:'ทำไม่ค่อยมั่นใจข้อ 15-20 ค่ะ',       files:['hw3_anucha.pdf'],     fileCount:1 },
        { studentId:'S005', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:5, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'โปรเจกต์กลุ่ม: คณิตศาสตร์ในชีวิตประจำวัน',
      description:'สำรวจการใช้คณิตศาสตร์ในชีวิตประจำวัน ทำรายงาน A4 ไม่น้อยกว่า 5 หน้า พร้อม Presentation',
      maxScore:20, dueDate:'20/06/2567', fileRequired:2,
      submissions: [
        { studentId:'S001', submittedAt:'19/06/2567 20:00', score:null, status:'submitted', teacherNote:'', studentNote:'รายงานและ slide พร้อมแล้วครับ', files:['project_g1_report.pdf','project_g1_slide.pptx'], fileCount:2 },
        { studentId:'S002', submittedAt:'19/06/2567 20:00', score:null, status:'submitted', teacherNote:'', studentNote:'',                              files:['project_g1_report.pdf','project_g1_slide.pptx'], fileCount:2 },
        { studentId:'S003', submittedAt:'19/06/2567 20:00', score:null, status:'submitted', teacherNote:'', studentNote:'กลุ่มทำเสร็จแล้วนะคะครู',       files:['project_g2_report.pdf','project_g2_slide.pptx'], fileCount:2 },
        { studentId:'S004', submittedAt:'19/06/2567 20:00', score:null, status:'submitted', teacherNote:'', studentNote:'',                              files:['project_g2_report.pdf','project_g2_slide.pptx'], fileCount:2 },
        { studentId:'S005', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:6, classId:'c1', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'Quiz บท.3: ระบบสมการ (ข้อสอบในชั้น)',
      description:'ข้อสอบ 5 ข้อ ใช้เวลา 20 นาที',
      maxScore:10, dueDate:'21/06/2567', fileRequired:0,
      submissions: [
        { studentId:'S001', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S002', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S003', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S004', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S005', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    // ── ม.2/2 (c2) ──
    {
      id:7, classId:'c2', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'แบบฝึกหัดพีชคณิต บท.1: พหุนาม',
      description:'ทำแบบฝึกหัดหน้า 20–28 ส่งในสมุด',
      maxScore:15, dueDate:'18/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S006', submittedAt:'17/06/2567 15:00', score:null, status:'submitted', teacherNote:'', studentNote:'ส่งมาให้แล้วนะครับ', files:['alg1_vichai.pdf'], fileCount:1 },
        { studentId:'S007', submittedAt:'17/06/2567 13:30', score:13,   status:'graded',    teacherNote:'สวยงาม', studentNote:'',           files:['alg1_nataya.pdf'], fileCount:1 },
        { studentId:'S008', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:8, classId:'c2', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'Quiz บท.1: การบวก-ลบพหุนาม',
      description:'ข้อสอบ Quiz 10 ข้อ',
      maxScore:20, dueDate:'10/06/2567', fileRequired:0,
      submissions: [
        { studentId:'S006', submittedAt:'10/06/2567 09:30', score:16, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S007', submittedAt:'10/06/2567 09:30', score:18, status:'graded', teacherNote:'เยี่ยม', studentNote:'', files:[], fileCount:0 },
        { studentId:'S008', submittedAt:'10/06/2567 09:30', score:14, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:9, classId:'c2', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'แบบฝึกหัด บท.2: สมการกำลังสอง',
      description:'ทำแบบฝึกหัดหน้า 55–65 ข้อ 1–15',
      maxScore:15, dueDate:'22/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S006', submittedAt:'21/06/2567 21:00', score:null, status:'submitted', teacherNote:'', studentNote:'', files:['quad_vichai.pdf'], fileCount:1 },
        { studentId:'S007', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S008', submittedAt:'21/06/2567 19:30', score:null, status:'submitted', teacherNote:'', studentNote:'ทำได้บางข้อนะครับ', files:['quad_prasert.pdf'], fileCount:1 },
      ]
    },
    {
      id:10, classId:'c2', subject:'คณิตศาสตร์', key:'math', semester:1, academicYear:'2567',
      title:'โปรเจกต์: การแก้สมการในชีวิตจริง',
      description:'หาตัวอย่างการใช้สมการในชีวิตจริง ทำรายงาน 3 หน้า',
      maxScore:20, dueDate:'25/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S006', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S007', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S008', submittedAt:null, score:null, status:'missing', teacherNote:'', studentNote:'', files:[], fileCount:0 },
      ]
    },
    // ── ม.3/1 (c3) ──
    {
      id:11, classId:'c3', subject:'สถิติ', key:'stats', semester:1, academicYear:'2567',
      title:'แบบฝึกหัด บท.1: ความน่าจะเป็นเบื้องต้น',
      description:'ทำแบบฝึกหัดหน้า 8–15',
      maxScore:10, dueDate:'08/06/2567', fileRequired:1,
      submissions: [
        { studentId:'S009', submittedAt:'07/06/2567 20:00', score:9,  status:'graded',    teacherNote:'ดีมาก', studentNote:'', files:['stat1_tawee.pdf'], fileCount:1 },
        { studentId:'S010', submittedAt:'08/06/2567 07:00', score:7,  status:'graded',    teacherNote:'',       studentNote:'', files:['stat1_parinya.pdf'], fileCount:1 },
        { studentId:'S011', submittedAt:'07/06/2567 22:00', score:10, status:'graded',    teacherNote:'เยี่ยม', studentNote:'', files:['stat1_wanna.pdf'], fileCount:1 },
      ]
    },
    {
      id:12, classId:'c3', subject:'สถิติ', key:'stats', semester:1, academicYear:'2567',
      title:'Quiz: สถิติเบื้องต้นและการแจกแจง',
      description:'ข้อสอบ Quiz 10 ข้อ ใช้เวลา 25 นาที',
      maxScore:20, dueDate:'14/06/2567', fileRequired:0,
      submissions: [
        { studentId:'S009', submittedAt:'14/06/2567 09:30', score:16, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S010', submittedAt:'14/06/2567 09:30', score:14, status:'graded', teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S011', submittedAt:'14/06/2567 09:30', score:18, status:'graded', teacherNote:'ดีเยี่ยม', studentNote:'', files:[], fileCount:0 },
      ]
    },
    {
      id:13, classId:'c3', subject:'สถิติ', key:'stats', semester:1, academicYear:'2567',
      title:'รายงาน: การวิเคราะห์ข้อมูลเบื้องต้น',
      description:'เก็บข้อมูลสำรวจในชั้นเรียน วิเคราะห์ทางสถิติ ส่งรายงาน A4 ไม่น้อยกว่า 3 หน้า',
      maxScore:25, dueDate:'20/06/2567', fileRequired:2,
      submissions: [
        { studentId:'S009', submittedAt:'19/06/2567 20:00', score:null, status:'submitted', teacherNote:'', studentNote:'ส่งรายงานครบแล้วครับ', files:['stat_report_tawee.pdf','stat_data_tawee.xlsx'], fileCount:2 },
        { studentId:'S010', submittedAt:null,                score:null, status:'missing',   teacherNote:'', studentNote:'', files:[], fileCount:0 },
        { studentId:'S011', submittedAt:'19/06/2567 22:30', score:null, status:'submitted', teacherNote:'', studentNote:'งานเสร็จแล้วนะคะ',  files:['stat_report_wanna.pdf','stat_data_wanna.xlsx'], fileCount:2 },
      ]
    },
  ],

  // ── คะแนนรายหมวด (กลางภาค จิตพิสัย ปลายภาค ฯลฯ) ──
  manualCategories: [
    // ม.1/1
    { id:'mc1_act', classId:'c1', semester:1, label:'กิจกรรมชั้นเรียน', maxScore:10, type:'activity', scores:{ S001:8, S002:9, S003:10, S004:7, S005:8 } },
    { id:'mc1_beh', classId:'c1', semester:1, label:'จิตพิสัย',         maxScore:10, type:'behavior', scores:{ S001:9, S002:8, S003:10, S004:8, S005:7 } },
    { id:'mc1_mid', classId:'c1', semester:1, label:'สอบกลางภาค',       maxScore:30, type:'midterm',  scores:{ S001:25, S002:22, S003:28, S004:18, S005:20 } },
    { id:'mc1_fin', classId:'c1', semester:1, label:'สอบปลายภาค',       maxScore:30, type:'final',    scores:{} },
    // ม.2/2
    { id:'mc2_act', classId:'c2', semester:1, label:'กิจกรรมชั้นเรียน', maxScore:10, type:'activity', scores:{ S006:9, S007:10, S008:7 } },
    { id:'mc2_beh', classId:'c2', semester:1, label:'จิตพิสัย',         maxScore:10, type:'behavior', scores:{ S006:8, S007:10, S008:7 } },
    { id:'mc2_mid', classId:'c2', semester:1, label:'สอบกลางภาค',       maxScore:30, type:'midterm',  scores:{ S006:24, S007:27, S008:19 } },
    { id:'mc2_fin', classId:'c2', semester:1, label:'สอบปลายภาค',       maxScore:30, type:'final',    scores:{} },
    // ม.3/1
    { id:'mc3_act', classId:'c3', semester:1, label:'กิจกรรมชั้นเรียน', maxScore:10, type:'activity', scores:{ S009:9, S010:8, S011:10 } },
    { id:'mc3_beh', classId:'c3', semester:1, label:'จิตพิสัย',         maxScore:10, type:'behavior', scores:{ S009:8, S010:7, S011:9 } },
    { id:'mc3_mid', classId:'c3', semester:1, label:'สอบกลางภาค',       maxScore:30, type:'midterm',  scores:{ S009:22, S010:19, S011:26 } },
    { id:'mc3_fin', classId:'c3', semester:1, label:'สอบปลายภาค',       maxScore:30, type:'final',    scores:{} },
  ],

  scoreRecords: [],
};

function tchInitScoreRecords() {
  TEACHER_DATA.scoreRecords = [];
  TEACHER_DATA.assignments.forEach(a => {
    a.submissions.forEach(sub => {
      if (sub.status==='graded' && sub.score!==null) tchRecordScore(a, sub);
    });
  });
}

// ── State ──
let tchCurrentView  = 'dashboard';
let tchCurrentDay   = '';
let tchGradingId    = null;
let tchGDAssignId   = null;
let tchGDStudentId  = null;
let tchAssignFilter = { semester:1, classId:'all' };
let tchScoreFilter  = { semester:1, classId:'c1' };

// ── Init ──────────────────────────────────────────────────────
function buildTeacherPage() {
  const user = getSession();
  if (!user) return;
  TEACHER_DATA.profile.name   = user.name;
  TEACHER_DATA.profile.school = user.school || TEACHER_DATA.profile.school;
  tchInitScoreRecords();
  const initials = user.name.replace(/ครู/g,'').trim().substring(0,2);
  document.getElementById('tch-bm-avatar').textContent  = initials;
  document.getElementById('tch-bm-pname').textContent   = user.name;
  document.getElementById('tch-bm-pclass').textContent  = `ครูผู้สอน · ${TEACHER_DATA.profile.school}`;
  const dayMap = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' };
  tchCurrentDay = dayMap[new Date().getDay()] || 'mon';
  tchSetView('dashboard');
  tchUpdatePendingBadge();
}

function tchSetView(view) {
  tchCurrentView = view;
  document.querySelectorAll('.tch-bm-item[data-bmview]').forEach(btn => {
    btn.classList.toggle('bm-active', btn.dataset.bmview === view);
  });
  const main = document.getElementById('tch-main');
  switch (view) {
    case 'dashboard':   main.innerHTML = tchBuildDashboard();   break;
    case 'schedule':    main.innerHTML = tchBuildSchedule();    break;
    case 'assignments': main.innerHTML = tchBuildAssignments(); break;
    case 'grading':     main.innerHTML = tchBuildGrading();     break;
    case 'scores':      main.innerHTML = tchBuildScores();      break;
    case 'subject':     main.innerHTML = tchBuildSubject();     break;
  }
  main.scrollTop = 0;
}

function tchUpdatePendingBadge() {
  const n = TEACHER_DATA.assignments.reduce((c,a) =>
    c + a.submissions.filter(s => s.status==='submitted').length, 0);
  const b = document.getElementById('tch-bm-pending-badge');
  if (b) { b.textContent=n; b.style.display=n>0?'':'none'; }
}

// ── Burger ──
function tchToggleBurgerMenu() {
  const p=document.getElementById('tch-bm-panel'), o=document.getElementById('tch-bm-overlay');
  p.classList.contains('open') ? (p.classList.remove('open'),o.classList.remove('show')) : (p.classList.add('open'),o.classList.add('show'));
}
function tchCloseBurgerMenu() {
  document.getElementById('tch-bm-panel').classList.remove('open');
  document.getElementById('tch-bm-overlay').classList.remove('show');
}
function tchBurgerNav(v) { tchCloseBurgerMenu(); tchSetView(v); }

// ════════════════════════════════════════════════════════════════
// VIEW: DASHBOARD
// ════════════════════════════════════════════════════════════════
function tchBuildDashboard() {
  const p=TEACHER_DATA.profile, now=new Date();
  const greeting=now.getHours()<12?'อรุณสวัสดิ์ 🌅':now.getHours()<17?'สวัสดีตอนบ่าย ☀️':'สวัสดีตอนเย็น 🌆';
  const dateStr=now.toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const thaiDays={mon:'วันจันทร์',tue:'วันอังคาร',wed:'วันพุธ',thu:'วันพฤหัสบดี',fri:'วันศุกร์'};
  const todaySched=TEACHER_DATA.schedule[tchCurrentDay]||[];
  const pendingCount=TEACHER_DATA.assignments.reduce((n,a)=>n+a.submissions.filter(s=>s.status==='submitted').length,0);

  const schedHtml=todaySched.map(s=>{
    const c=tchColor(s.key),cl=TEACHER_DATA.classes.find(x=>x.id===s.classId);
    return `<div class="tch-sched-item" style="border-left:3px solid ${c.dot};background:${c.bg};cursor:pointer;" onclick="tchOpenSubjectPage('${s.classId}','${s.key}')">
      <div class="tch-sched-period" style="color:${c.dot};">คาบ ${s.period}</div>
      <div class="tch-sched-subj" style="color:${c.text};">${s.subject}</div>
      <div class="tch-sched-meta">${s.time} · ${cl?cl.grade+'/'+cl.room:''} · ${s.room}</div>
    </div>`;
  }).join('')||'<div class="tch-empty">ไม่มีคาบสอนวันนี้ 🎉</div>';

  const pendingItems=[];
  TEACHER_DATA.assignments.forEach(a=>a.submissions.filter(s=>s.status==='submitted').forEach(sub=>{
    const student=TEACHER_DATA.students.find(x=>x.id===sub.studentId);
    const cls=TEACHER_DATA.classes.find(x=>x.id===a.classId);
    pendingItems.push({a,sub,student,cls});
  }));
  const pendingHtml=pendingItems.slice(0,4).map(({a,student,cls})=>{
    const c=tchColor(a.key);
    return `<div class="tch-pending-row" onclick="tchOpenGrading(${a.id})">
      <div class="tch-pending-dot" style="background:${c.dot};"></div>
      <div class="tch-pending-info">
        <div class="tch-pending-title">${a.title}</div>
        <div class="tch-pending-meta">${student?.name||'—'} · ${cls?cls.grade+'/'+cls.room:''}</div>
      </div>
      <span class="tch-badge-submitted">รอตรวจ</span>
    </div>`;
  }).join('')||'<div class="tch-empty">ไม่มีงานรอตรวจ 🎉</div>';

  return `<div class="tch-view-wrap">
    <div class="tch-greeting-bar">
      <div>
        <div class="tch-greeting-sub">${greeting}</div>
        <h1 class="tch-greeting-name">${p.name}</h1>
        <div class="tch-greeting-date">${dateStr} · ${thaiDays[tchCurrentDay]||''}</div>
      </div>
      <div class="tch-greeting-badge">
        <div class="tch-gbadge-icon">👩‍🏫</div>
        <div class="tch-gbadge-role">ครูผู้สอน</div>
        <div class="tch-gbadge-school">${p.school}</div>
      </div>
    </div>
    <div class="tch-kpi-grid">
      <div class="tch-kpi-card" onclick="tchSetView('schedule')"><div class="tch-kpi-icon">📅</div><div class="tch-kpi-val">${todaySched.length}</div><div class="tch-kpi-lbl">คาบสอนวันนี้</div></div>
      <div class="tch-kpi-card"><div class="tch-kpi-icon">👨‍🎓</div><div class="tch-kpi-val">${TEACHER_DATA.students.length}</div><div class="tch-kpi-lbl">นักเรียนทั้งหมด</div></div>
      <div class="tch-kpi-card ${pendingCount>0?'tch-kpi-alert':''}" onclick="tchSetView('assignments')"><div class="tch-kpi-icon">📋</div><div class="tch-kpi-val">${pendingCount}</div><div class="tch-kpi-lbl">งานรอตรวจ</div></div>
      <div class="tch-kpi-card" onclick="tchSetView('scores')"><div class="tch-kpi-icon">✅</div><div class="tch-kpi-val">${TEACHER_DATA.scoreRecords.length}</div><div class="tch-kpi-lbl">คะแนนบันทึกแล้ว</div></div>
      <div class="tch-kpi-card" onclick="tchSetView('assignments')"><div class="tch-kpi-icon">📚</div><div class="tch-kpi-val">${TEACHER_DATA.assignments.length}</div><div class="tch-kpi-lbl">งานทั้งหมด</div></div>
    </div>
    <div class="tch-section">
      <div class="tch-section-header">
        <div class="tch-section-title">ตารางสอน${thaiDays[tchCurrentDay]||''}นี้</div>
        <button class="tch-link-btn" onclick="tchSetView('schedule')">ดูทั้งหมด →</button>
      </div>
      <div class="tch-sched-list">${schedHtml}</div>
    </div>
    <div class="tch-section">
      <div class="tch-section-header">
        <div class="tch-section-title">งานที่รอตรวจ</div>
        <button class="tch-link-btn" onclick="tchSetView('assignments')">ดูทั้งหมด →</button>
      </div>
      <div class="tch-pending-list">${pendingHtml}</div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// VIEW: SCHEDULE
// ════════════════════════════════════════════════════════════════
function tchBuildSchedule() {
  const dayKeys=['mon','tue','wed','thu','fri'];
  const dayThai={mon:'จันทร์',tue:'อังคาร',wed:'พุธ',thu:'พฤหัสบดี',fri:'ศุกร์'};
  const dayShort={mon:'จ',tue:'อ',wed:'พ',thu:'พฤ',fri:'ศ'};
  const tabs=dayKeys.map(d=>`<button class="tch-day-tab ${d===tchCurrentDay?'active':''}" onclick="tchChangeDay('${d}')"><span class="tch-day-short">${dayShort[d]}</span><span class="tch-day-full">${dayThai[d]}</span></button>`).join('');
  const sched=TEACHER_DATA.schedule[tchCurrentDay]||[];
  const periodsHtml=sched.map(s=>{
    const c=tchColor(s.key),cl=TEACHER_DATA.classes.find(x=>x.id===s.classId);
    return `<div class="tch-period-card tch-period-clickable" onclick="tchOpenSubjectPage('${s.classId}','${s.key}')" style="background:${c.bg};border:1px solid ${c.border};">
      <div class="tch-period-num" style="color:${c.dot};">คาบ ${s.period}</div>
      <div class="tch-period-time">${s.time}</div>
      <div class="tch-period-subj" style="color:${c.text};">${s.subject}</div>
      <div class="tch-period-class">${cl?cl.grade+'/'+cl.room:''}</div>
      <div class="tch-period-room">📍 ${s.room}</div>
      <div class="tch-period-enter-hint">แตะเพื่อจัดการวิชา →</div>
    </div>`;
  }).join('')||'<div class="tch-empty">ไม่มีคาบสอน 🎉</div>';
  return `<div class="tch-view-wrap">
    <div class="tch-page-header"><h2 class="tch-page-title">📅 ตารางสอน</h2><p class="tch-page-sub">ปีการศึกษา ${TEACHER_DATA.profile.academicYear}</p></div>
    <div class="tch-day-tabs">${tabs}</div>
    <div class="tch-periods-grid">${periodsHtml}</div>
  </div>`;
}
function tchChangeDay(d) { tchCurrentDay=d; tchSetView('schedule'); }

// ════════════════════════════════════════════════════════════════
// VIEW: ASSIGNMENTS
// ════════════════════════════════════════════════════════════════
function tchBuildAssignments() {
  const {semester,classId}=tchAssignFilter;
  const semChips=[1,2].map(s=>`<button class="tch-filter-chip ${semester===s?'active':''}" onclick="tchSetAssignFilter('semester',${s})">เทอม ${s}</button>`).join('');
  const classChips=[{id:'all',label:'ทุกชั้น'},...TEACHER_DATA.classes.map(c=>({id:c.id,label:`${c.grade}/${c.room} ${c.subject}`}))].map(o=>`<button class="tch-filter-chip ${classId===o.id?'active':''}" onclick="tchSetAssignFilter('classId','${o.id}')">${o.label}</button>`).join('');
  let list=TEACHER_DATA.assignments.filter(a=>a.semester===semester);
  if(classId!=='all') list=list.filter(a=>a.classId===classId);
  const cards=list.map(a=>{
    const c=tchColor(a.key),cl=TEACHER_DATA.classes.find(x=>x.id===a.classId);
    const submitted=a.submissions.filter(s=>s.status==='submitted').length;
    const graded=a.submissions.filter(s=>s.status==='graded').length;
    const missing=a.submissions.filter(s=>s.status==='missing').length;
    const total=a.submissions.length;
    const progress=total>0?Math.round(graded/total*100):0;
    return `<div class="tch-assign-card" style="border-top:3px solid ${c.dot};">
      <div class="tch-assign-card-top">
        <span class="tch-assign-class-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">${cl?cl.grade+'/'+cl.room:''} · ${a.subject}</span>
        ${submitted>0?`<span class="tch-badge-submitted">${submitted} รอตรวจ</span>`:''}
        ${graded===total&&total>0?`<span class="tch-badge-done">ตรวจครบ ✓</span>`:''}
      </div>
      <div class="tch-assign-title">${a.title}</div>
      <div class="tch-assign-meta"><span>📅 ${a.dueDate}</span><span>📊 /${a.maxScore} คะแนน</span>${a.fileRequired?`<span>📎 แนบ ${a.fileRequired} ไฟล์</span>`:''}</div>
      <div class="tch-assign-progress-wrap">
        <div class="tch-assign-prog-bar"><div class="tch-assign-prog-fill" style="width:${progress}%;background:${c.dot};"></div></div>
        <span class="tch-assign-prog-label">${graded}/${total} คน ตรวจแล้ว</span>
      </div>
      <div class="tch-assign-stats">
        <span style="color:var(--success);">✅ ${graded}</span>
        <span style="color:var(--late);">📋 ${submitted}</span>
        <span style="color:var(--text-muted);">⭕ ${missing}</span>
      </div>
      <button class="tch-assign-btn" onclick="tchOpenGrading(${a.id})">${submitted>0?'🔍 ตรวจงาน':'👁 ดูคะแนน'}</button>
    </div>`;
  }).join('')||'<div class="tch-empty">ไม่มีงานในเงื่อนไขนี้</div>';
  return `<div class="tch-view-wrap">
    <div class="tch-page-header"><h2 class="tch-page-title">📋 รายการงานที่มอบหมาย</h2><p class="tch-page-sub">ปีการศึกษา ${TEACHER_DATA.profile.academicYear} · แบ่งตามเทอมและชั้นเรียน</p></div>
    <div class="tch-filter-row"><div class="tch-filters">${semChips}</div><div class="tch-filters">${classChips}</div></div>
    <div class="tch-assign-grid">${cards}</div>
  </div>`;
}
function tchSetAssignFilter(k,v) { if(k==='semester')tchAssignFilter.semester=Number(v);else tchAssignFilter.classId=v; tchSetView('assignments'); }

// ════════════════════════════════════════════════════════════════
// VIEW: GRADING TABLE
// ════════════════════════════════════════════════════════════════
function tchOpenGrading(id) { tchGradingId=id; tchSetView('grading'); }

function tchBuildGrading() {
  const a=TEACHER_DATA.assignments.find(x=>x.id===tchGradingId);
  if(!a) return '<div class="tch-view-wrap"><div class="tch-empty">ไม่พบงานที่เลือก</div></div>';
  const c=tchColor(a.key),cl=TEACHER_DATA.classes.find(x=>x.id===a.classId);
  const pendingCount=a.submissions.filter(s=>s.status==='submitted').length;

  const rows=a.submissions.map(sub=>{
    const student=TEACHER_DATA.students.find(s=>s.id===sub.studentId);
    if(!student) return '';
    const isGraded=sub.status==='graded', isSubmitted=sub.status==='submitted', isMissing=sub.status==='missing';
    const badge=isGraded?`<span class="tch-grade-badge-done">✅ ตรวจแล้ว</span>`:isSubmitted?`<span class="tch-grade-badge-pending">📋 รอตรวจ</span>`:`<span class="tch-grade-badge-missing">⭕ ไม่ส่ง</span>`;
    const timeLabel=sub.submittedAt?`<div class="tch-grade-time">ส่ง ${sub.submittedAt}</div>`:`<div class="tch-grade-time" style="color:var(--text-muted);">ไม่ได้ส่ง</div>`;
    const fileLabel=sub.fileCount>0?`<div class="tch-grade-time" style="color:var(--brown-mid);">📎 ${sub.fileCount} ไฟล์</div>`:'';
    const scoreCell=isMissing?`<span style="color:var(--text-muted);">—</span>`:`<div class="tch-score-input-wrap"><input type="number" id="score-inp-${sub.studentId}" class="tch-score-inp" value="${sub.score!==null?sub.score:''}" min="0" max="${a.maxScore}" placeholder="0"><span class="tch-score-max">/ ${a.maxScore}</span></div>`;
    const noteCell=isMissing?'':`<input type="text" id="note-inp-${sub.studentId}" class="tch-note-inp" value="${sub.teacherNote||''}" placeholder="หมายเหตุ...">`;
    const btns=isMissing?'':`<div style="display:flex;gap:0.4rem;flex-direction:column;">
      ${(isSubmitted&&sub.fileCount>0)||isGraded?`<button class="tch-view-detail-btn" onclick="tchOpenGradeDetail(${a.id},'${sub.studentId}')">📄 รายละเอียด</button>`:''}
      <button class="tch-confirm-btn ${isGraded?'tch-confirm-edit':''}" onclick="tchSaveScore(${a.id},'${sub.studentId}')">${isGraded?'✏️ แก้ไข':'✅ ยืนยัน'}</button>
    </div>`;
    return `<tr class="tch-grade-row ${isGraded?'row-graded':isSubmitted?'row-submitted':'row-missing'}">
      <td class="tch-grade-name">${student.name}<div class="tch-grade-code">${student.code}</div></td>
      <td>${badge}${timeLabel}${fileLabel}</td>
      <td>${scoreCell}</td>
      <td>${noteCell}</td>
      <td>${btns}</td>
    </tr>`;
  }).join('');

  return `<div class="tch-view-wrap">
    <div class="tch-back-row"><button class="tch-back-btn" onclick="tchSetView('assignments')">← กลับรายการงาน</button></div>
    <div class="tch-page-header">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.4rem;">
        <span class="tch-assign-class-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">${cl?cl.grade+'/'+cl.room:''} · ${a.subject}</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">เทอม ${a.semester} · ปี ${a.academicYear}</span>
      </div>
      <h2 class="tch-page-title">${a.title}</h2>
      <p class="tch-page-sub">คะแนนเต็ม ${a.maxScore} คะแนน · ครบกำหนด ${a.dueDate}</p>
    </div>
    ${pendingCount>0?`<button class="tch-confirm-all-btn" onclick="tchConfirmAll(${a.id})">✅ ยืนยันคะแนนที่กรอกทั้งหมด (${pendingCount} คน)</button>`:''}
    <div class="tch-grade-table-wrap">
      <table class="tch-grade-table">
        <thead><tr><th>ชื่อ–นามสกุล</th><th>สถานะ / เวลาส่ง</th><th>คะแนน</th><th>หมายเหตุครู</th><th>ดำเนินการ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="tch-grade-legend">
      <span class="tch-grade-badge-done">✅ ตรวจแล้ว</span>
      <span class="tch-grade-badge-pending">📋 รอตรวจ</span>
      <span class="tch-grade-badge-missing">⭕ ไม่ส่ง</span>
      <span style="font-size:0.7rem;color:var(--text-muted);margin-left:0.5rem;">คะแนนบันทึกอัตโนมัติเมื่อกดยืนยัน · กด "รายละเอียด" เพื่อดูงานที่ส่ง</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// GRADE DETAIL MODAL — ตรวจงาน (clone จาก student submit + teacher mode)
// ════════════════════════════════════════════════════════════════
function tchOpenGradeDetail(assignId, studentId) {
  tchGDAssignId  = assignId;
  tchGDStudentId = studentId;
  const a       = TEACHER_DATA.assignments.find(x=>x.id===assignId);
  const sub     = a?.submissions.find(s=>s.studentId===studentId);
  const student = TEACHER_DATA.students.find(s=>s.id===studentId);
  const cls     = TEACHER_DATA.classes.find(c=>c.id===a?.classId);
  if (!a||!sub||!student) return;

  document.getElementById('tch-gd-htitle').textContent = `ตรวจงาน — ${a.subject}`;
  document.getElementById('tch-gd-body').innerHTML = tchBuildGradeDetailBody(a, sub, student, cls);
  document.getElementById('tch-gd-overlay').classList.add('open');
}
function tchCloseGradeDetail() {
  document.getElementById('tch-gd-overlay').classList.remove('open');
}

function tchBuildGradeDetailBody(a, sub, student, cls) {
  const c = tchColor(a.key);
  const isGraded = sub.status==='graded';
  const isOverdue = false;

  // Score panel
  const scoreNum  = isGraded ? `${sub.score}/${a.maxScore}` : `—/${a.maxScore}`;
  const scoreCls  = isGraded ? 'score-graded' : 'score-ok';
  const statusTxt = isGraded ? 'ตรวจแล้ว' : sub.status==='submitted' ? 'รอตรวจ' : 'ไม่ส่ง';
  const statusCls = isGraded ? 'score-status-graded' : sub.status==='submitted' ? 'score-status-ok' : 'score-status-overdue';

  // Files
  const filesHtml = sub.fileCount>0
    ? (sub.files||[]).map(f=>`<div class="tch-gd-file"><span class="tch-gd-file-icon">📄</span><span class="tch-gd-file-name">${f}</span><button class="tch-gd-file-dl" onclick="showToast('จำลองการดาวน์โหลด: '+this.dataset.f)" data-f="${f}">ดาวน์โหลด</button></div>`).join('')
    : `<div style="font-size:0.82rem;color:var(--text-muted);">ไม่มีไฟล์แนบ</div>`;

  // Score input area
  const scoreArea = sub.status==='missing'
    ? `<div class="stu-submit-overdue-note">⭕ นักเรียนไม่ได้ส่งงาน ไม่สามารถให้คะแนนได้</div>`
    : `<div class="tch-gd-score-inputs">
        <div style="margin-bottom:0.75rem;">
          <label class="stu-submit-meta-lbl">คะแนน (/ ${a.maxScore})</label>
          <div class="tch-score-input-wrap" style="margin-top:0.35rem;">
            <input type="number" id="tch-gd-score" class="tch-score-inp" style="width:80px;font-size:1.1rem;"
              value="${sub.score!==null?sub.score:''}" min="0" max="${a.maxScore}" placeholder="0">
            <span class="tch-score-max" style="font-size:1rem;">/ ${a.maxScore}</span>
          </div>
        </div>
        <div style="margin-bottom:1rem;">
          <label class="stu-submit-meta-lbl">หมายเหตุถึงนักเรียน</label>
          <textarea id="tch-gd-note" style="width:100%;margin-top:0.35rem;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.82rem;resize:vertical;min-height:60px;outline:none;" placeholder="ความเห็นของครู...">${sub.teacherNote||''}</textarea>
        </div>
        <button class="stu-submit-send-btn" onclick="tchSaveFromModal()">✅ ยืนยันคะแนน</button>
      </div>`;

  // Settings accordion
  const settings = `
    <details class="tch-settings-details">
      <summary class="tch-settings-summary">⚙️ ตั้งค่างาน (แก้ไขรายละเอียด)</summary>
      <div class="tch-settings-body">
        <div class="tch-settings-grid">
          <div class="tch-settings-field">
            <label class="stu-submit-meta-lbl">ชื่องาน</label>
            <input type="text" id="tch-edit-title" class="tch-settings-inp" value="${a.title}">
          </div>
          <div class="tch-settings-field">
            <label class="stu-submit-meta-lbl">คะแนนเต็ม</label>
            <input type="number" id="tch-edit-maxscore" class="tch-settings-inp" value="${a.maxScore}" min="1">
          </div>
          <div class="tch-settings-field">
            <label class="stu-submit-meta-lbl">วันครบกำหนด</label>
            <input type="text" id="tch-edit-due" class="tch-settings-inp" value="${a.dueDate}" placeholder="วว/ดด/ปปปป">
          </div>
          <div class="tch-settings-field">
            <label class="stu-submit-meta-lbl">ขยายเวลา (วัน)</label>
            <input type="number" id="tch-edit-extend" class="tch-settings-inp" value="0" min="0" max="30" placeholder="0">
          </div>
          <div class="tch-settings-field" style="grid-column:1/-1;">
            <label class="stu-submit-meta-lbl">คำอธิบายงาน</label>
            <textarea id="tch-edit-desc" class="tch-settings-inp" style="min-height:70px;resize:vertical;">${a.description||''}</textarea>
          </div>
          <div class="tch-settings-field" style="grid-column:1/-1;">
            <label class="stu-submit-meta-lbl">จำนวนไฟล์ที่กำหนดให้ส่ง</label>
            <input type="number" id="tch-edit-files" class="tch-settings-inp" value="${a.fileRequired||0}" min="0" max="10">
          </div>
        </div>
        <button class="tch-settings-save-btn" onclick="tchSaveAssignmentSettings(${a.id})">💾 บันทึกการตั้งค่า</button>
      </div>
    </details>`;

  return `
    <div class="stu-submit-main" style="flex:1;min-width:0;">
      <div class="stu-submit-title">${a.title}</div>
      <div class="stu-submit-meta-grid">
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">วิชา / ชั้น</span>
          <span class="stu-submit-meta-val"><span style="background:${c.bg};color:${c.text};border:1px solid ${c.border};padding:0.1rem 0.5rem;border-radius:50px;font-size:0.78rem;">${a.subject}</span> ${cls?cls.grade+'/'+cls.room:''}</span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">นักเรียน</span>
          <span class="stu-submit-meta-val">👤 ${student.name} (${student.code})</span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">เวลาที่ส่ง</span>
          <span class="stu-submit-meta-val">${sub.submittedAt?'📅 '+sub.submittedAt:'<span style="color:var(--text-muted);">ยังไม่ส่ง</span>'}</span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">ครบกำหนด</span>
          <span class="stu-submit-meta-val">📅 ${a.dueDate}</span>
        </div>
        ${sub.studentNote?`<div class="stu-submit-meta-row" style="grid-column:1/-1;">
          <span class="stu-submit-meta-lbl">หมายเหตุนักเรียน</span>
          <span class="stu-submit-meta-val">"${sub.studentNote}"</span>
        </div>`:''}
      </div>
      <div class="stu-submit-desc-lbl">คำอธิบายงาน</div>
      <div class="stu-submit-desc">${a.description||'—'}</div>
      <div class="stu-submit-desc-lbl" style="margin-top:0.75rem;">ไฟล์ที่นักเรียนส่ง (${sub.fileCount} ไฟล์)</div>
      <div class="tch-gd-files">${filesHtml}</div>
      ${settings}
    </div>

    <div class="stu-submit-score tch-gd-score-panel">
      <div class="stu-submit-score-num ${scoreCls}">${scoreNum}</div>
      <div class="stu-submit-score-max">คะแนนเต็ม ${a.maxScore}</div>
      <div class="stu-submit-score-status ${statusCls}">${statusTxt}</div>
      <div style="height:1px;background:var(--border);margin:0.75rem 0;width:100%;"></div>
      ${scoreArea}
    </div>`;
}

function tchSaveFromModal() {
  const a       = TEACHER_DATA.assignments.find(x=>x.id===tchGDAssignId);
  const sub     = a?.submissions.find(s=>s.studentId===tchGDStudentId);
  const inp     = document.getElementById('tch-gd-score');
  const noteInp = document.getElementById('tch-gd-note');
  if (!a||!sub||!inp) return;
  if (inp.value.trim()==='') { showToast('⚠️ กรุณากรอกคะแนน'); return; }
  const score = parseFloat(inp.value);
  if (isNaN(score)||score<0||score>a.maxScore) { showToast(`⚠️ คะแนนต้องอยู่ระหว่าง 0–${a.maxScore}`); return; }
  sub.score = score;
  sub.status = 'graded';
  sub.teacherNote = noteInp ? noteInp.value.trim() : '';
  tchRecordScore(a, sub);
  tchUpdatePendingBadge();
  const student = TEACHER_DATA.students.find(s=>s.id===tchGDStudentId);
  showToast(`✅ บันทึกคะแนน ${student?.name||''} — ${score}/${a.maxScore} แล้ว`);
  tchCloseGradeDetail();
  tchSetView('grading');
}

function tchSaveAssignmentSettings(assignId) {
  const a = TEACHER_DATA.assignments.find(x=>x.id===assignId);
  if (!a) return;
  const titleEl   = document.getElementById('tch-edit-title');
  const maxEl     = document.getElementById('tch-edit-maxscore');
  const dueEl     = document.getElementById('tch-edit-due');
  const descEl    = document.getElementById('tch-edit-desc');
  const filesEl   = document.getElementById('tch-edit-files');
  const extendEl  = document.getElementById('tch-edit-extend');
  if (titleEl  && titleEl.value.trim())   a.title       = titleEl.value.trim();
  if (maxEl    && parseFloat(maxEl.value)>0) a.maxScore = parseFloat(maxEl.value);
  if (dueEl    && dueEl.value.trim())     a.dueDate     = dueEl.value.trim();
  if (descEl)  a.description  = descEl.value.trim();
  if (filesEl) a.fileRequired = parseInt(filesEl.value)||0;
  if (extendEl && parseInt(extendEl.value)>0) {
    showToast(`🕐 ขยายเวลาส่ง +${extendEl.value} วัน สำเร็จ`);
  }
  showToast('💾 บันทึกการตั้งค่าเรียบร้อยแล้ว');
}

// ════════════════════════════════════════════════════════════════
// VIEW: SCORE RECORDS (10+ คอลัมน์ สอดคล้องความเป็นจริง)
// ════════════════════════════════════════════════════════════════
function tchBuildScores() {
  const {semester,classId}=tchScoreFilter;
  const semChips=[1,2].map(s=>`<button class="tch-filter-chip ${semester===s?'active':''}" onclick="tchSetScoreFilter('semester',${s})">เทอม ${s}</button>`).join('');
  const classChips=TEACHER_DATA.classes.map(c=>`<button class="tch-filter-chip ${classId===c.id?'active':''}" onclick="tchSetScoreFilter('classId','${c.id}')">${c.grade}/${c.room} ${c.subject}</button>`).join('');
  const cls       = TEACHER_DATA.classes.find(c=>c.id===classId);
  const students  = TEACHER_DATA.students.filter(s=>s.classId===classId);
  const hwAssigns = TEACHER_DATA.assignments.filter(a=>a.classId===classId&&a.semester===semester);
  const manuals   = TEACHER_DATA.manualCategories.filter(m=>m.classId===classId&&m.semester===semester);

  const header=`<div class="tch-page-header"><h2 class="tch-page-title">📊 บันทึกคะแนน</h2><p class="tch-page-sub">ฐานข้อมูลคะแนน · รองรับการออกเอกสาร ปพ และใบประกาศนียบัตร</p></div>
    <div class="tch-filter-row"><div class="tch-filters">${semChips}</div><div class="tch-filters">${classChips}</div></div>`;

  if (!cls||hwAssigns.length===0&&manuals.length===0) {
    return `<div class="tch-view-wrap">${header}<div class="tch-empty">ยังไม่มีข้อมูลคะแนนในเงื่อนไขนี้</div></div>`;
  }

  // score map from scoreRecords (homework)
  const hwMap={};
  students.forEach(s=>{hwMap[s.id]={};});
  TEACHER_DATA.scoreRecords.forEach(r=>{
    if(r.classId===classId&&r.semester===semester&&hwMap[r.studentId]!==undefined)
      hwMap[r.studentId][r.assignmentId]=r.score;
  });

  const clsColor=tchColor(cls.key);
  const hwMaxTotal=hwAssigns.reduce((s,a)=>s+a.maxScore,0);
  const manMaxTotal=manuals.reduce((s,m)=>s+m.maxScore,0);
  const grandMax=hwMaxTotal+manMaxTotal;

  // TH columns
  const hwThs=hwAssigns.map((a,i)=>`<th class="tch-score-th">
    <div class="tch-th-title" title="${a.title}">งาน ${i+1}${a.title.includes('Quiz')||a.title.includes('quiz')?'*':''}</div>
    <div class="tch-th-sub" title="${a.title}">${a.title.length>14?a.title.substring(0,13)+'…':a.title}</div>
    <div class="tch-th-max">/ ${a.maxScore}</div>
  </th>`).join('');
  const manThs=manuals.map(m=>`<th class="tch-score-th tch-th-manual">
    <div class="tch-th-title">${m.label}</div>
    <div class="tch-th-max">/ ${m.maxScore}</div>
  </th>`).join('');

  // body rows
  const tbody=students.map(s=>{
    const hwScores=hwMap[s.id]||{};
    const hwTotal=hwAssigns.reduce((sum,a)=>sum+(hwScores[a.id]??0),0);
    const manTotal=manuals.reduce((sum,m)=>sum+(m.scores[s.id]??0),0);
    const grand=hwTotal+manTotal;
    const pct=grandMax>0?(grand/grandMax*100).toFixed(1):'0.0';
    const grade=parseFloat(pct)>=80?'A':parseFloat(pct)>=75?'B+':parseFloat(pct)>=70?'B':parseFloat(pct)>=65?'C+':parseFloat(pct)>=60?'C':parseFloat(pct)>=55?'D+':parseFloat(pct)>=50?'D':'F';
    const gradeCls=parseFloat(pct)>=80?'grade-a':parseFloat(pct)>=60?'grade-b':parseFloat(pct)>=50?'grade-c':'grade-f';

    const hwCells=hwAssigns.map(a=>{
      const sc=hwScores[a.id];
      return sc!==undefined
        ? `<td class="tch-score-cell score-filled" onclick="tchOpenGrading(${a.id})" style="cursor:pointer;" title="คลิกเพื่อดูรายละเอียดงาน">${sc}<small>/${a.maxScore}</small></td>`
        : `<td class="tch-score-cell score-empty" onclick="tchOpenGrading(${a.id})" style="cursor:pointer;" title="คลิกเพื่อตรวจงาน">—</td>`;
    }).join('');

    const manCells=manuals.map(m=>{
      const cur=m.scores[s.id];
      return `<td class="tch-score-cell tch-manual-cell">
        <input type="number" class="tch-inline-score" value="${cur!==undefined?cur:''}"
          min="0" max="${m.maxScore}" placeholder="—"
          onchange="tchSaveManualScore('${m.id}','${s.id}',this.value)"
          onclick="event.stopPropagation()"
          title="คลิกเพื่อกรอก/แก้ไขคะแนน ${m.label}">
        <small>/${m.maxScore}</small>
      </td>`;
    }).join('');

    return `<tr>
      <td class="tch-score-student">${s.name}<div class="tch-grade-code">${s.code}</div></td>
      ${hwCells}${manCells}
      <td class="tch-score-total">${grand}<small>/${grandMax}</small></td>
      <td class="tch-score-pct ${gradeCls}">${pct}%</td>
      <td class="tch-score-grade ${gradeCls}">${grade}</td>
    </tr>`;
  }).join('');

  // avg row
  const hwAvgs=hwAssigns.map(a=>{
    const vals=students.map(s=>hwMap[s.id]?.[a.id]).filter(v=>v!==undefined);
    return vals.length?(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1):'—';
  });
  const manAvgs=manuals.map(m=>{
    const vals=students.map(s=>m.scores[s.id]).filter(v=>v!==undefined);
    return vals.length?(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1):'—';
  });
  const allGrand=students.map(s=>{
    const hw=hwAssigns.reduce((sum,a)=>sum+(hwMap[s.id]?.[a.id]??0),0);
    const mn=manuals.reduce((sum,m)=>sum+(m.scores[s.id]??0),0);
    return hw+mn;
  });
  const avgGrand=allGrand.length?(allGrand.reduce((s,v)=>s+v,0)/allGrand.length).toFixed(1):'—';
  const avgPct=grandMax>0&&avgGrand!=='—'?(parseFloat(avgGrand)/grandMax*100).toFixed(1)+'%':'—';
  const avgRow=`<tr class="tch-avg-row">
    <td><em>เฉลี่ยทั้งชั้น</em></td>
    ${hwAvgs.map(v=>`<td class="tch-score-cell">${v}</td>`).join('')}
    ${manAvgs.map(v=>`<td class="tch-score-cell">${v}</td>`).join('')}
    <td class="tch-score-total">${avgGrand}</td>
    <td class="tch-score-pct">${avgPct}</td>
    <td class="tch-score-grade">—</td>
  </tr>`;

  return `<div class="tch-view-wrap">
    ${header}
    <div class="tch-score-header-card" style="border-left:4px solid ${clsColor.dot};">
      <div class="tch-score-hc-main">
        <span class="tch-score-hc-class" style="color:${clsColor.text};">${cls.grade}/${cls.room} ${cls.subject}</span>
        <span class="tch-score-hc-term">เทอม ${semester} · ปี ${TEACHER_DATA.profile.academicYear}</span>
      </div>
      <div class="tch-score-hc-stats">
        <span>${students.length} คน</span>
        <span>${hwAssigns.length} งาน</span>
        <span>${manuals.length} หมวดคะแนน</span>
        <span>คะแนนเต็มรวม ${grandMax}</span>
      </div>
      <button class="tch-export-btn" onclick="showToast('ฟีเจอร์ออก ปพ กำลังพัฒนา...')">📄 Export ปพ</button>
    </div>
    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.75rem;">
      💡 คลิกเซลล์คะแนนงาน → ไปหน้าตรวจงาน · คลิกช่องหมวดคะแนน (พื้นเขียว) → กรอก/แก้ไขคะแนนได้เลย · * = Quiz
    </div>
    <div class="tch-score-table-wrap">
      <table class="tch-score-table">
        <thead><tr>
          <th class="tch-score-th-name">ชื่อ-นามสกุล</th>
          ${hwThs}${manThs}
          <th style="min-width:80px;">รวม /${grandMax}</th>
          <th style="min-width:60px;">%</th>
          <th style="min-width:50px;">เกรด</th>
        </tr></thead>
        <tbody>${tbody}${avgRow}</tbody>
      </table>
    </div>
  </div>`;
}

function tchSetScoreFilter(k,v) {
  if(k==='semester')tchScoreFilter.semester=Number(v);
  else tchScoreFilter.classId=v;
  tchSetView('scores');
}

function tchSaveManualScore(catId, studentId, value) {
  const cat = TEACHER_DATA.manualCategories.find(m=>m.id===catId);
  if (!cat) return;
  const v = parseFloat(value);
  if (value.trim()===''||isNaN(v)) { delete cat.scores[studentId]; return; }
  if (v<0||v>cat.maxScore) { showToast(`⚠️ คะแนนต้องอยู่ระหว่าง 0–${cat.maxScore}`); return; }
  cat.scores[studentId] = v;
  const student = TEACHER_DATA.students.find(s=>s.id===studentId);
  showToast(`💾 บันทึก ${cat.label} — ${student?.name||''}: ${v}/${cat.maxScore}`);
}

// ════════════════════════════════════════════════════════════════
// GRADING LOGIC — บันทึกคะแนนอัตโนมัติ
// ════════════════════════════════════════════════════════════════
function tchSaveScore(assignmentId, studentId) {
  const a=TEACHER_DATA.assignments.find(x=>x.id===assignmentId);
  if (!a) return;
  const inp=document.getElementById(`score-inp-${studentId}`);
  const note=document.getElementById(`note-inp-${studentId}`);
  if (!inp||inp.value.trim()==='') { showToast('⚠️ กรุณากรอกคะแนนก่อนยืนยัน'); return; }
  const score=parseFloat(inp.value);
  if (isNaN(score)||score<0||score>a.maxScore) { showToast(`⚠️ คะแนนต้องอยู่ระหว่าง 0–${a.maxScore}`); return; }
  const sub=a.submissions.find(s=>s.studentId===studentId);
  if (!sub) return;
  sub.score=score; sub.status='graded'; sub.teacherNote=note?note.value.trim():'';
  tchRecordScore(a, sub);
  tchUpdatePendingBadge();
  const student=TEACHER_DATA.students.find(s=>s.id===studentId);
  showToast(`✅ บันทึกคะแนน ${student?.name||''} — ${score}/${a.maxScore} แล้ว`);
  tchSetView('grading');
}

function tchRecordScore(assignment, sub) {
  const student=TEACHER_DATA.students.find(s=>s.id===sub.studentId);
  const cls=TEACHER_DATA.classes.find(c=>c.id===assignment.classId);
  if (!student||!cls) return;
  const recordId=`${assignment.id}_${sub.studentId}`;
  const record={
    id:recordId, studentId:sub.studentId, studentName:student.name, studentCode:student.code,
    classId:assignment.classId, classLabel:`${cls.grade}/${cls.room}`,
    assignmentId:assignment.id, assignmentTitle:assignment.title,
    subject:assignment.subject, maxScore:assignment.maxScore, score:sub.score,
    semester:assignment.semester, academicYear:assignment.academicYear,
    gradedAt:new Date().toLocaleString('th-TH'), teacherNote:sub.teacherNote,
  };
  const idx=TEACHER_DATA.scoreRecords.findIndex(r=>r.id===recordId);
  if(idx>=0) TEACHER_DATA.scoreRecords[idx]=record; else TEACHER_DATA.scoreRecords.push(record);
}

function tchConfirmAll(assignmentId) {
  const a=TEACHER_DATA.assignments.find(x=>x.id===assignmentId);
  if (!a) return;
  let saved=0;
  a.submissions.filter(s=>s.status==='submitted').forEach(sub=>{
    const inp=document.getElementById(`score-inp-${sub.studentId}`);
    if(!inp||inp.value.trim()==='') return;
    const score=parseFloat(inp.value);
    if(isNaN(score)||score<0||score>a.maxScore) return;
    const note=document.getElementById(`note-inp-${sub.studentId}`);
    sub.score=score; sub.status='graded'; sub.teacherNote=note?note.value.trim():'';
    tchRecordScore(a, sub); saved++;
  });
  if(saved===0) { showToast('⚠️ กรุณากรอกคะแนนอย่างน้อย 1 คนก่อนยืนยัน'); return; }
  tchUpdatePendingBadge();
  showToast(`✅ บันทึกคะแนน ${saved} คนสำเร็จแล้ว`);
  tchSetView('grading');
}

// ════════════════════════════════════════════════════════════════
// SUBJECT MATERIALS DATA — สื่อการเรียนรู้ประจำวิชา
// ════════════════════════════════════════════════════════════════
const SUBJECT_MATERIALS = {
  c1_math: [
    { id:'m1', type:'video', title:'บทที่ 1: จำนวนจริงและพีชคณิตเบื้องต้น — วิดีโอย้อนหลัง',
      url:'https://www.youtube.com/embed/KVuAd6b5k1o',
      description:'บันทึกการสอนสดบทที่ 1 ครอบคลุมจำนวนจริง การดำเนินการ และสมบัติของจำนวน เหมาะสำหรับนักเรียนที่ขาดเรียนหรือต้องการทบทวน',
      uploadedAt:'03/06/2567', postedBy:'ครูสมชาย ใจดี' },
    { id:'m2', type:'file', title:'สไลด์ประกอบการสอน บท.1 — พีชคณิต',
      filename:'slide_ch1_algebra_m1.pdf',
      description:'สไลด์ PowerPoint ที่ใช้สอนในชั้นเรียน สามารถดาวน์โหลดศึกษาที่บ้านได้',
      uploadedAt:'03/06/2567', postedBy:'ครูสมชาย ใจดี', fileType:'pdf', fileSize:'2.4 MB' },
    { id:'m3', type:'video', title:'บทที่ 2: สมการและอสมการ — วิดีโอย้อนหลัง',
      url:'https://www.youtube.com/embed/wmaJqn3FE4I',
      description:'การแก้สมการเชิงเส้นหนึ่งตัวแปรและอสมการ พร้อมโจทย์ตัวอย่าง 15 ข้อ',
      uploadedAt:'10/06/2567', postedBy:'ครูสมชาย ใจดี' },
    { id:'m4', type:'file', title:'ใบงานเพิ่มเติม บท.2: สมการและอสมการ',
      filename:'worksheet_ch2_equations.pdf',
      description:'แบบฝึกหัดเพิ่มเติมสำหรับนักเรียนที่ต้องการฝึกเพิ่ม 20 ข้อ พร้อมเฉลย',
      uploadedAt:'11/06/2567', postedBy:'ครูสมชาย ใจดี', fileType:'pdf', fileSize:'1.1 MB' },
    { id:'m5', type:'link', title:'แหล่งเรียนรู้เพิ่มเติม: Khan Academy ภาษาไทย',
      url:'https://th.khanacademy.org/math/algebra',
      description:'บทเรียนออนไลน์ฟรีพร้อมแบบทดสอบ สามารถเรียนซ้ำได้ไม่จำกัด',
      uploadedAt:'01/06/2567', postedBy:'ครูสมชาย ใจดี' },
    { id:'m6', type:'video', title:'บทที่ 3: ระบบสมการสองตัวแปร',
      url:'https://www.youtube.com/embed/xTpnd7oXTCY',
      description:'วิธีแก้ระบบสมการด้วยการแทนค่า การกำจัด และกราฟ พร้อมตัวอย่างโจทย์ปัญหา',
      uploadedAt:'14/06/2567', postedBy:'ครูสมชาย ใจดี' },
  ],
  c2_math: [
    { id:'m7', type:'video', title:'พหุนาม บท.1: นิยามและการดำเนินการ',
      url:'https://www.youtube.com/embed/KVuAd6b5k1o',
      description:'การบวก ลบ คูณ พหุนาม และสมบัติต่างๆ พร้อมตัวอย่างการแก้โจทย์',
      uploadedAt:'12/06/2567', postedBy:'ครูสมชาย ใจดี' },
    { id:'m8', type:'file', title:'สรุปสูตรพหุนาม ม.2',
      filename:'formula_polynomial_m2.pdf',
      description:'สรุปสูตรและทฤษฎีบทที่ต้องจำสำหรับบทพหุนาม',
      uploadedAt:'13/06/2567', postedBy:'ครูสมชาย ใจดี', fileType:'pdf', fileSize:'0.8 MB' },
    { id:'m9', type:'video', title:'สมการกำลังสอง: วิธีแยกตัวประกอบ',
      url:'https://www.youtube.com/embed/wmaJqn3FE4I',
      description:'วิดีโอย้อนหลังการสอนเรื่องสมการกำลังสองและการแก้ด้วยหลายวิธี',
      uploadedAt:'19/06/2567', postedBy:'ครูสมชาย ใจดี' },
  ],
  c3_stats: [
    { id:'m10', type:'video', title:'ความน่าจะเป็นเบื้องต้น',
      url:'https://www.youtube.com/embed/xTpnd7oXTCY',
      description:'นิยาม การทดลอง เหตุการณ์ และการคำนวณความน่าจะเป็น พร้อมตัวอย่างในชีวิตจริง',
      uploadedAt:'04/06/2567', postedBy:'ครูสมชาย ใจดี' },
    { id:'m11', type:'file', title:'สไลด์สถิติและการวิเคราะห์ข้อมูล',
      filename:'stats_analysis_m3.pptx',
      description:'สไลด์ประกอบการเรียนรวมทุกบท พร้อมตัวอย่างการวิเคราะห์ข้อมูลจริง',
      uploadedAt:'05/06/2567', postedBy:'ครูสมชาย ใจดี', fileType:'pptx', fileSize:'5.2 MB' },
    { id:'m12', type:'file', title:'ใบงาน: สถิติเชิงพรรณนา',
      filename:'worksheet_descriptive_stats.pdf',
      description:'แบบฝึกหัดการหาค่าเฉลี่ย มัธยฐาน ฐานนิยม และส่วนเบี่ยงเบนมาตรฐาน',
      uploadedAt:'08/06/2567', postedBy:'ครูสมชาย ใจดี', fileType:'pdf', fileSize:'1.4 MB' },
    { id:'m13', type:'link', title:'เครื่องมือวิเคราะห์สถิติออนไลน์',
      url:'https://www.desmos.com/scientific',
      description:'เครื่องคิดเลขวิทยาศาสตร์ออนไลน์ฟรี พร้อมฟังก์ชันทางสถิติ',
      uploadedAt:'06/06/2567', postedBy:'ครูสมชาย ใจดี' },
  ],
};

// แผนการสอนประจำวิชา
const LESSON_PLANS = {
  c1_math: [
    { week:'1–2',  topic:'บทที่ 1: จำนวนจริงและพีชคณิตเบื้องต้น', detail:'ระบบจำนวน การดำเนินการ สมบัติของการบวกและการคูณ' },
    { week:'3–4',  topic:'บทที่ 2: สมการและอสมการ', detail:'สมการเชิงเส้นตัวแปรเดียว อสมการ การแก้ปัญหา' },
    { week:'5–7',  topic:'บทที่ 3: ระบบสมการสองตัวแปร', detail:'การแก้ระบบสมการด้วยการแทนค่าและการกำจัด' },
    { week:'8–9',  topic:'บทที่ 4: เลขยกกำลัง', detail:'นิยาม กฎต่างๆ การคำนวณนิพจน์ที่มีเลขยกกำลัง' },
    { week:'10',   topic:'ทบทวนก่อนสอบกลางภาค', detail:'สรุปเนื้อหาบทที่ 1–4 แบบฝึกหัดรวม' },
  ],
  c2_math: [
    { week:'1–3',  topic:'บทที่ 1: พหุนาม', detail:'นิยาม การบวก ลบ คูณ พหุนาม การแยกตัวประกอบ' },
    { week:'4–6',  topic:'บทที่ 2: สมการกำลังสอง', detail:'การแก้สมการด้วยการแยกตัวประกอบและสูตรกำลังสอง' },
    { week:'7–8',  topic:'บทที่ 3: กราฟพาราโบลา', detail:'กราฟของ y = ax² + bx + c การหาจุดตัดแกน' },
    { week:'9–10', topic:'ทบทวนและโปรเจกต์', detail:'สมการในชีวิตจริง โปรเจกต์กลุ่ม' },
  ],
  c3_stats: [
    { week:'1–2',  topic:'บทที่ 1: ความน่าจะเป็นเบื้องต้น', detail:'การทดลอง เหตุการณ์ ความน่าจะเป็น' },
    { week:'3–5',  topic:'บทที่ 2: สถิติเชิงพรรณนา', detail:'การจัดการข้อมูล ค่าเฉลี่ย มัธยฐาน ฐานนิยม' },
    { week:'6–8',  topic:'บทที่ 3: การแจกแจงและกราฟ', detail:'ฮิสโตแกรม โพลีกอน กล่องและหนวด' },
    { week:'9–10', topic:'โปรเจกต์สถิติ', detail:'เก็บข้อมูลจริง วิเคราะห์ทางสถิติ นำเสนอ' },
  ],
};

// ประกาศชั้นเรียน
const CLASS_ANNOUNCEMENTS = {
  c1: [
    { id:'a1', title:'📢 สอบกลางภาคคณิตศาสตร์ ม.1/1', body:'กำหนดสอบวันจันทร์ที่ 24 มิถุนายน 2567 เวลา 09:00–11:00 น. ห้อง 201 เตรียมตัวจากบทที่ 1–3', postedAt:Date.now()-2*24*60*60*1000, pinned:true },
    { id:'a2', title:'📚 โปรเจกต์กลุ่ม: ส่งภายใน 20 มิ.ย.', body:'คณิตศาสตร์ในชีวิตประจำวัน — รายงาน A4 ไม่น้อยกว่า 5 หน้า พร้อม Presentation 5 นาที ห้ามส่งช้า', postedAt:Date.now()-5*24*60*60*1000, pinned:false },
    { id:'a3', title:'💡 เปลี่ยนห้องเรียน 20 มิ.ย.', body:'วันพฤหัสบดีที่ 20 มิถุนายน 2567 ย้ายไปเรียนที่ห้อง 205 แทนห้อง 201 เนื่องจากมีกิจกรรมพิเศษของโรงเรียน', postedAt:Date.now()-1*24*60*60*1000, pinned:false },
  ],
  c2: [
    { id:'a4', title:'📢 Quiz พหุนาม สัปดาห์หน้า', body:'Quiz บทที่ 1 พหุนามจะจัดสอบในวันอังคารหน้า 10 ข้อ 20 คะแนน ขอให้ทบทวนเรื่องการแยกตัวประกอบ', postedAt:Date.now()-3*24*60*60*1000, pinned:true },
    { id:'a5', title:'📎 อัปโหลดสรุปสูตรแล้ว', body:'ดาวน์โหลดสรุปสูตรพหุนามได้ที่สื่อการเรียนรู้ด้านบน ครอบคลุมทุกสูตรที่ออกสอบ', postedAt:Date.now()-2*24*60*60*1000, pinned:false },
  ],
  c3: [
    { id:'a6', title:'📊 ส่งข้อมูลสำรวจวันศุกร์นี้', body:'ให้นักเรียนนำข้อมูลสำรวจในชั้นมาส่งภายในวันศุกร์ที่ 21 มิ.ย. 2567 เพื่อใช้ประกอบรายงานสถิติ', postedAt:Date.now()-1*24*60*60*1000, pinned:false },
  ],
};

// ════════════════════════════════════════════════════════════════
// STATE — SUBJECT PAGE
// ════════════════════════════════════════════════════════════════
let tchSubjectClassId  = null;
let tchSubjectKey      = null;
let tchSubjectTab      = 'materials';
let tchNewMaterialType = 'video';

function tchOpenSubjectPage(classId, key) {
  tchSubjectClassId = classId;
  tchSubjectKey     = key;
  tchSubjectTab     = 'materials';
  tchCloseBurgerMenu();
  tchSetView('subject');
}

function tchSubjTab(tab) {
  tchSubjectTab = tab;
  document.getElementById('tch-main').innerHTML = tchBuildSubject();
  document.getElementById('tch-main').scrollTop = 0;
}

// ════════════════════════════════════════════════════════════════
// VIEW: SUBJECT MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════════
function tchBuildSubject() {
  const cls = TEACHER_DATA.classes.find(c => c.id === tchSubjectClassId);
  if (!cls) return '<div class="tch-view-wrap"><div class="tch-empty">ไม่พบชั้นเรียน</div></div>';
  const c        = tchColor(tchSubjectKey);
  const matKey   = `${tchSubjectClassId}_${tchSubjectKey}`;
  const mats     = SUBJECT_MATERIALS[matKey] || [];
  const anns     = CLASS_ANNOUNCEMENTS[tchSubjectClassId] || [];
  const students = TEACHER_DATA.students.filter(s => s.classId === tchSubjectClassId);
  const assigns  = TEACHER_DATA.assignments.filter(a => a.classId === tchSubjectClassId);
  const pendingAll = assigns.reduce((n,a) => n + a.submissions.filter(s=>s.status==='submitted').length, 0);

  const tabs = [
    { id:'materials', label:'🎬 สื่อการเรียนรู้',  cnt: mats.length },
    { id:'homework',  label:'📋 งาน & การบ้าน',   cnt: assigns.length, badge: pendingAll },
    { id:'students',  label:'👨‍🎓 รายชื่อนักเรียน', cnt: students.length },
    { id:'announce',  label:'📢 ประกาศ',           cnt: anns.length },
  ];
  const tabsHtml = tabs.map(t => {
    const badgeHtml = t.badge > 0 ? `<span class="tch-subj-tab-badge">${t.badge}</span>` : (t.cnt > 0 ? `<span class="tch-subj-tab-count">${t.cnt}</span>` : '');
    return `<button class="tch-subj-tab ${tchSubjectTab===t.id?'active':''}" onclick="tchSubjTab('${t.id}')">${t.label}${badgeHtml}</button>`;
  }).join('');

  let content = '';
  switch (tchSubjectTab) {
    case 'materials': content = tchBuildMaterials(matKey, mats);         break;
    case 'homework':  content = tchBuildSubjHomework(assigns);            break;
    case 'students':  content = tchBuildSubjStudents(students, assigns);  break;
    case 'announce':  content = tchBuildSubjAnnounce(anns);              break;
  }

  return `<div class="tch-view-wrap">
    <div class="tch-back-row"><button class="tch-back-btn" onclick="tchSetView('schedule')">← กลับตารางสอน</button></div>
    <div class="tch-subj-header" style="border-left:4px solid ${c.dot};">
      <div class="tch-subj-icon">${cls.icon}</div>
      <div class="tch-subj-info">
        <div class="tch-subj-name" style="color:${c.text};">${cls.subject}</div>
        <div class="tch-subj-meta">${cls.grade}/${cls.room} · ปีการศึกษา ${TEACHER_DATA.profile.academicYear} · เทอม 1</div>
      </div>
      <div class="tch-subj-kpis">
        <div class="tch-subj-kpi"><div class="tch-subj-kpi-n">${students.length}</div><div class="tch-subj-kpi-l">นักเรียน</div></div>
        <div class="tch-subj-kpi"><div class="tch-subj-kpi-n">${assigns.length}</div><div class="tch-subj-kpi-l">งาน</div></div>
        <div class="tch-subj-kpi"><div class="tch-subj-kpi-n">${mats.length}</div><div class="tch-subj-kpi-l">สื่อ</div></div>
        ${pendingAll>0?`<div class="tch-subj-kpi tch-kpi-alert"><div class="tch-subj-kpi-n">${pendingAll}</div><div class="tch-subj-kpi-l">รอตรวจ</div></div>`:''}
      </div>
    </div>
    <div class="tch-subj-tabs">${tabsHtml}</div>
    <div>${content}</div>
  </div>`;
}

// ── TAB: MATERIALS ──────────────────────────────────────────────
function tchBuildMaterials(matKey, mats) {
  const formHtml = `
    <div class="tch-mat-add-form" id="tch-mat-form" style="display:none;">
      <div class="tch-mat-form-header">
        <span>➕ เพิ่มสื่อการเรียนรู้</span>
        <button onclick="document.getElementById('tch-mat-form').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:1.05rem;color:var(--text-muted);">✕</button>
      </div>
      <div class="tch-mat-type-tabs">
        <button class="tch-mat-type-btn ${tchNewMaterialType==='video'?'active':''}" onclick="tchSetMatType('video')">🎬 วิดีโอ / YouTube</button>
        <button class="tch-mat-type-btn ${tchNewMaterialType==='file' ?'active':''}" onclick="tchSetMatType('file')">📄 ไฟล์ (PDF/PPT)</button>
        <button class="tch-mat-type-btn ${tchNewMaterialType==='link' ?'active':''}" onclick="tchSetMatType('link')">🔗 ลิ้งค์ภายนอก</button>
      </div>
      <div id="tch-mat-form-fields">${tchBuildMatFormFields()}</div>
    </div>`;

  const matItems = mats.length
    ? mats.map(m => tchBuildMatItem(m, matKey)).join('')
    : `<div class="tch-empty" style="padding:3rem;">📭 ยังไม่มีสื่อการเรียนรู้<br><span style="font-size:0.75rem;opacity:0.7;">กด "เพิ่มสื่อ" เพื่อเริ่มอัปโหลดไฟล์ วิดีโอ หรือลิ้งค์</span></div>`;

  return `
    <div class="tch-mat-toolbar">
      <div class="tch-mat-info">📌 สื่อที่อัปโหลดจะแสดงให้นักเรียนดูผ่านตารางเรียน เพื่อทบทวนหรือเรียนซ้ำที่บ้านร่วมกับผู้ปกครองได้</div>
      <button class="tch-mat-add-btn" onclick="tchShowMatForm()">➕ เพิ่มสื่อ</button>
    </div>
    ${formHtml}
    <div class="tch-mat-list">${matItems}</div>`;
}

function tchBuildMatFormFields() {
  if (tchNewMaterialType === 'video') {
    return `<div class="tch-mat-form-fields">
      <div><label class="stu-submit-meta-lbl">ชื่อวิดีโอ / หัวข้อ</label>
        <input type="text" id="mat-title" class="tch-settings-inp" placeholder="เช่น บทที่ 3: ระบบสมการ — วิดีโอย้อนหลัง"></div>
      <div><label class="stu-submit-meta-lbl">ลิ้งค์ YouTube (embed หรือ watch)</label>
        <input type="text" id="mat-url" class="tch-settings-inp" placeholder="https://www.youtube.com/watch?v=... หรือ /embed/..."></div>
      <div><label class="stu-submit-meta-lbl">คำอธิบาย</label>
        <textarea id="mat-desc" class="tch-settings-inp" style="min-height:60px;" placeholder="อธิบายเนื้อหาในวิดีโอ..."></textarea></div>
      <button class="tch-mat-add-submit" onclick="tchAddMaterial()">📤 เพิ่มวิดีโอ</button>
    </div>`;
  }
  if (tchNewMaterialType === 'file') {
    return `<div class="tch-mat-form-fields">
      <div><label class="stu-submit-meta-lbl">ชื่อไฟล์ / เอกสาร</label>
        <input type="text" id="mat-title" class="tch-settings-inp" placeholder="เช่น สไลด์บทที่ 4 หรือ ใบงานเพิ่มเติม"></div>
      <div class="tch-mat-file-upload-area" onclick="document.getElementById('mat-file-inp').click()">
        <span class="tch-mat-file-upload-icon">📁</span>
        <span>คลิกเพื่อเลือกไฟล์ (PDF, PPT, DOC, XLS)</span>
        <input type="file" id="mat-file-inp" style="display:none;" accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx" onchange="tchFileChosen(this)">
        <span id="mat-file-chosen" style="font-size:0.75rem;color:var(--brown-mid);margin-top:0.3rem;display:block;"></span>
      </div>
      <div><label class="stu-submit-meta-lbl">คำอธิบาย</label>
        <textarea id="mat-desc" class="tch-settings-inp" style="min-height:60px;" placeholder="อธิบายเนื้อหาในไฟล์..."></textarea></div>
      <button class="tch-mat-add-submit" onclick="tchAddMaterial()">📤 เพิ่มไฟล์</button>
    </div>`;
  }
  return `<div class="tch-mat-form-fields">
    <div><label class="stu-submit-meta-lbl">ชื่อลิ้งค์ / แหล่งเรียนรู้</label>
      <input type="text" id="mat-title" class="tch-settings-inp" placeholder="เช่น Khan Academy: บทฝึกสมการ"></div>
    <div><label class="stu-submit-meta-lbl">URL</label>
      <input type="text" id="mat-url" class="tch-settings-inp" placeholder="https://..."></div>
    <div><label class="stu-submit-meta-lbl">คำอธิบาย</label>
      <textarea id="mat-desc" class="tch-settings-inp" style="min-height:60px;" placeholder="อธิบายประโยชน์ของลิ้งค์นี้..."></textarea></div>
    <button class="tch-mat-add-submit" onclick="tchAddMaterial()">🔗 เพิ่มลิ้งค์</button>
  </div>`;
}

function tchBuildMatItem(m, matKey) {
  let mediaHtml = '';
  if (m.type === 'video') {
    const embedUrl = tchNormalizeYouTubeUrl(m.url);
    mediaHtml = embedUrl
      ? `<div class="tch-mat-video-wrap"><iframe class="tch-mat-iframe" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : `<div style="padding:0.5rem 1rem 0.75rem;"><a href="${m.url}" target="_blank" style="color:var(--brown-deep);font-size:0.82rem;">🔗 เปิดวิดีโอ (ลิ้งค์ไม่ใช่ YouTube) →</a></div>`;
  } else if (m.type === 'file') {
    const icons = { pdf:'📄', pptx:'📊', ppt:'📊', docx:'📝', doc:'📝', xlsx:'📋', default:'📎' };
    const icon  = icons[m.fileType] || icons.default;
    mediaHtml = `<div class="tch-mat-file-box" onclick="showToast('จำลองการดาวน์โหลด: ${m.filename}')">
      <div class="tch-mat-file-icon-lg">${icon}</div>
      <div class="tch-mat-file-info"><div class="tch-mat-file-name">${m.filename}</div><div class="tch-mat-file-sz">${m.fileSize||''}</div></div>
      <button class="tch-mat-file-dl-btn">⬇️ ดาวน์โหลด</button>
    </div>`;
  } else if (m.type === 'link') {
    mediaHtml = `<a class="tch-mat-link-row" href="${m.url}" target="_blank">
      <span class="tch-mat-link-url-text">${m.url}</span><span>↗</span>
    </a>`;
  }
  const badgeCls = {video:'tch-mat-badge-video', file:'tch-mat-badge-file', link:'tch-mat-badge-link'};
  const badgeTxt = {video:'🎬 วิดีโอ', file:'📄 ไฟล์', link:'🔗 ลิ้งค์'};
  return `<div class="tch-mat-item">
    <div class="tch-mat-item-head">
      <span class="tch-mat-badge ${badgeCls[m.type]}">${badgeTxt[m.type]}</span>
      <div class="tch-mat-item-title">${m.title}</div>
      <button class="tch-mat-del-btn" onclick="tchDeleteMaterial('${matKey}','${m.id}')" title="ลบ">🗑</button>
    </div>
    ${mediaHtml}
    ${m.description ? `<div class="tch-mat-item-desc">${m.description}</div>` : ''}
    <div class="tch-mat-item-meta">📅 ${m.uploadedAt} · โดย ${m.postedBy}</div>
  </div>`;
}

function tchNormalizeYouTubeUrl(url) {
  if (!url) return null;
  if (url.includes('/embed/')) return url.split('?')[0];
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function tchShowMatForm() {
  const f = document.getElementById('tch-mat-form');
  if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
}

function tchSetMatType(type) {
  tchNewMaterialType = type;
  const fieldsEl = document.getElementById('tch-mat-form-fields');
  if (fieldsEl) fieldsEl.innerHTML = tchBuildMatFormFields();
  document.querySelectorAll('.tch-mat-type-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(type === 'video' ? 'วิดีโอ' : type === 'file' ? 'ไฟล์' : 'ลิ้งค์')));
}

function tchFileChosen(inp) {
  const el = document.getElementById('mat-file-chosen');
  if (el && inp.files && inp.files.length) el.textContent = '✓ ' + inp.files[0].name;
}

function tchAddMaterial() {
  const title = document.getElementById('mat-title')?.value?.trim();
  const url   = document.getElementById('mat-url')?.value?.trim();
  const desc  = document.getElementById('mat-desc')?.value?.trim();
  const fileInp = document.getElementById('mat-file-inp');
  if (!title) { showToast('⚠️ กรุณาใส่ชื่อสื่อ'); return; }
  if ((tchNewMaterialType === 'video' || tchNewMaterialType === 'link') && !url) { showToast('⚠️ กรุณาใส่ URL'); return; }
  const matKey = `${tchSubjectClassId}_${tchSubjectKey}`;
  if (!SUBJECT_MATERIALS[matKey]) SUBJECT_MATERIALS[matKey] = [];
  const now = new Date().toLocaleDateString('th-TH', {day:'2-digit',month:'2-digit',year:'numeric'});
  const newMat = { id:'mat_'+Date.now(), type: tchNewMaterialType, title, description: desc||'',
    uploadedAt: now, postedBy: TEACHER_DATA.profile.name };
  if (tchNewMaterialType === 'video' || tchNewMaterialType === 'link') newMat.url = url;
  if (tchNewMaterialType === 'file' && fileInp?.files?.length) {
    const f = fileInp.files[0];
    newMat.filename = f.name;
    newMat.fileType = f.name.split('.').pop().toLowerCase();
    newMat.fileSize = (f.size/1024/1024).toFixed(1)+' MB';
  } else if (tchNewMaterialType === 'file') { showToast('⚠️ กรุณาเลือกไฟล์'); return; }
  SUBJECT_MATERIALS[matKey].unshift(newMat);
  showToast(`✅ เพิ่มสื่อ "${title}" แล้ว`);
  tchSubjectTab = 'materials';
  document.getElementById('tch-main').innerHTML = tchBuildSubject();
}

function tchDeleteMaterial(matKey, id) {
  if (!SUBJECT_MATERIALS[matKey]) return;
  SUBJECT_MATERIALS[matKey] = SUBJECT_MATERIALS[matKey].filter(m => m.id !== id);
  showToast('🗑 ลบสื่อแล้ว');
  document.getElementById('tch-main').innerHTML = tchBuildSubject();
}

// ── TAB: HOMEWORK ───────────────────────────────────────────────
function tchBuildSubjHomework(assigns) {
  const cls = TEACHER_DATA.classes.find(c => c.id === tchSubjectClassId);
  const postForm = `<div class="tch-hw-post-form">
    <div class="tch-hw-post-ftitle">📝 โพสงานใหม่</div>
    <div class="tch-hw-post-grid">
      <div class="tch-hw-post-field" style="grid-column:1/-1;">
        <label class="stu-submit-meta-lbl">ชื่องาน / หัวข้อ *</label>
        <input type="text" id="nhw-title" class="tch-settings-inp" placeholder="เช่น แบบฝึกหัด บท.4 หรือ Quiz ประจำสัปดาห์">
      </div>
      <div class="tch-hw-post-field" style="grid-column:1/-1;">
        <label class="stu-submit-meta-lbl">รายละเอียด / คำสั่ง</label>
        <textarea id="nhw-desc" class="tch-settings-inp" style="min-height:75px;resize:vertical;" placeholder="อธิบายสิ่งที่ต้องทำ เงื่อนไข และขอบเขตงาน..."></textarea>
      </div>
      <div class="tch-hw-post-field">
        <label class="stu-submit-meta-lbl">วันครบกำหนด *</label>
        <input type="text" id="nhw-due" class="tch-settings-inp" placeholder="วว/ดด/2567">
      </div>
      <div class="tch-hw-post-field">
        <label class="stu-submit-meta-lbl">คะแนนเต็ม</label>
        <input type="number" id="nhw-score" class="tch-settings-inp" value="10" min="1" max="100">
      </div>
      <div class="tch-hw-post-field">
        <label class="stu-submit-meta-lbl">จำนวนไฟล์แนบ (0 = ไม่ต้องแนบ)</label>
        <input type="number" id="nhw-files" class="tch-settings-inp" value="1" min="0" max="5">
      </div>
      <div class="tch-hw-post-field">
        <label class="stu-submit-meta-lbl">เทอม</label>
        <select id="nhw-semester" class="tch-settings-inp">
          <option value="1" selected>เทอม 1</option>
          <option value="2">เทอม 2</option>
        </select>
      </div>
    </div>
    <button class="tch-hw-post-btn" onclick="tchPostHomework()">📤 โพสงาน → นักเรียนจะได้รับแจ้งทันที</button>
  </div>`;

  const hwCards = assigns.length
    ? assigns.map(a => {
        const co = tchColor(a.key);
        const submitted = a.submissions.filter(s=>s.status==='submitted').length;
        const graded    = a.submissions.filter(s=>s.status==='graded').length;
        const missing   = a.submissions.filter(s=>s.status==='missing').length;
        const total     = a.submissions.length;
        const pct = total > 0 ? Math.round(graded/total*100) : 0;
        return `<div class="tch-assign-card" style="border-top:3px solid ${co.dot};">
          <div class="tch-assign-card-top">
            ${submitted>0?`<span class="tch-badge-submitted">${submitted} รอตรวจ</span>`:''}
            ${graded===total&&total>0?`<span class="tch-badge-done">ตรวจครบ ✓</span>`:''}
          </div>
          <div class="tch-assign-title">${a.title}</div>
          <div class="tch-assign-meta"><span>📅 ${a.dueDate}</span><span>📊 /${a.maxScore}</span><span>👥 ${total} คน</span></div>
          <div class="tch-assign-progress-wrap">
            <div class="tch-assign-prog-bar"><div class="tch-assign-prog-fill" style="width:${pct}%;background:${co.dot};"></div></div>
            <span class="tch-assign-prog-label">${graded}/${total} ตรวจแล้ว</span>
          </div>
          <div class="tch-assign-stats">
            <span style="color:var(--success);">✅ ${graded}</span>
            <span style="color:var(--late);">📋 ${submitted}</span>
            <span style="color:var(--text-muted);">⭕ ${missing}</span>
          </div>
          <button class="tch-assign-btn" onclick="tchOpenGrading(${a.id})">${submitted>0?'🔍 ตรวจงาน':'👁 ดูคะแนน'}</button>
        </div>`;
      }).join('')
    : `<div class="tch-empty" style="padding:2.5rem;">📭 ยังไม่มีงานที่มอบหมาย<br><span style="font-size:0.75rem;opacity:0.7;">โพสงานชิ้นแรกข้างบนได้เลย</span></div>`;

  return `${postForm}
    <div class="tch-subj-sect-title">📋 งานทั้งหมด (${assigns.length} งาน)</div>
    <div class="tch-assign-grid">${hwCards}</div>`;
}

function tchPostHomework() {
  const title    = document.getElementById('nhw-title')?.value?.trim();
  const desc     = document.getElementById('nhw-desc')?.value?.trim();
  const due      = document.getElementById('nhw-due')?.value?.trim();
  const score    = parseInt(document.getElementById('nhw-score')?.value);
  const files    = parseInt(document.getElementById('nhw-files')?.value) || 0;
  const semester = parseInt(document.getElementById('nhw-semester')?.value) || 1;
  if (!title) { showToast('⚠️ กรุณาใส่ชื่องาน'); return; }
  if (!due)   { showToast('⚠️ กรุณาระบุวันครบกำหนด'); return; }
  if (!score || score < 1) { showToast('⚠️ คะแนนเต็มต้องมากกว่า 0'); return; }
  const cls      = TEACHER_DATA.classes.find(c => c.id === tchSubjectClassId);
  const students = TEACHER_DATA.students.filter(s => s.classId === tchSubjectClassId);
  const newAssign = {
    id: Date.now(), classId: tchSubjectClassId,
    subject: cls?.subject || '', key: tchSubjectKey,
    semester, academicYear: TEACHER_DATA.profile.academicYear,
    title, description: desc || '', maxScore: score, dueDate: due, fileRequired: files,
    submissions: students.map(s => ({
      studentId: s.id, submittedAt: null, score: null,
      status: 'missing', teacherNote: '', studentNote: '', files: [], fileCount: 0,
    })),
  };
  TEACHER_DATA.assignments.push(newAssign);
  tchUpdatePendingBadge();
  showToast(`✅ โพสงาน "${title}" แล้ว · ${students.length} คนจะได้รับแจ้ง`);
  tchSubjectTab = 'homework';
  document.getElementById('tch-main').innerHTML = tchBuildSubject();
}

// ── TAB: STUDENTS ───────────────────────────────────────────────
function tchBuildSubjStudents(students, assigns) {
  if (!students.length) return '<div class="tch-empty">ไม่มีนักเรียนในชั้นนี้</div>';
  const rows = students.map(s => {
    const graded    = assigns.reduce((n,a)=>n+(a.submissions.find(sub=>sub.studentId===s.id&&sub.status==='graded')?1:0),0);
    const submitted = assigns.reduce((n,a)=>n+(a.submissions.find(sub=>sub.studentId===s.id&&sub.status==='submitted')?1:0),0);
    const missing   = assigns.reduce((n,a)=>n+(a.submissions.find(sub=>sub.studentId===s.id&&sub.status==='missing')?1:0),0);
    const totalScore = assigns.reduce((sum,a)=>{ const sub=a.submissions.find(x=>x.studentId===s.id&&x.score!=null); return sum+(sub?sub.score:0); },0);
    const maxTotal   = assigns.filter(a=>{const sub=a.submissions.find(x=>x.studentId===s.id);return sub&&sub.status==='graded';}).reduce((s,a)=>s+a.maxScore,0);
    const initials   = s.name.trim().substring(0,2);
    const pct = assigns.length > 0 ? Math.round(graded/assigns.length*100) : 0;
    return `<div class="tch-stu-row">
      <div class="tch-stu-avatar">${initials}</div>
      <div class="tch-stu-info"><div class="tch-stu-name">${s.name}</div><div class="tch-stu-code">รหัส ${s.code}</div></div>
      <div class="tch-stu-badges">
        <span class="tch-stu-badge-ok">✅ ${graded}</span>
        <span class="tch-stu-badge-sub">📋 ${submitted}</span>
        <span class="tch-stu-badge-miss">⭕ ${missing}</span>
      </div>
      <div class="tch-stu-score-col">${maxTotal>0?totalScore+'/'+maxTotal:'—'}</div>
      <div class="tch-stu-pct-col" style="color:${pct>=80?'var(--success)':pct>=50?'var(--late)':'var(--absent)'};">${assigns.length?pct+'%':'—'}</div>
    </div>`;
  }).join('');
  return `<div class="tch-stu-legend-row"><span>ชื่อ-นามสกุล</span><div style="display:flex;gap:0.65rem;font-size:0.68rem;color:var(--text-muted);">
    <span>✅ ส่ง</span><span>📋 รอตรวจ</span><span>⭕ ไม่ส่ง</span><span>คะแนนรวม</span><span>%</span></div>
  </div>
  <div class="tch-stu-list">${rows}</div>`;
}

// ── TAB: ANNOUNCEMENTS ──────────────────────────────────────────
function tchBuildSubjAnnounce(anns) {
  const form = `<div class="tch-ann-form">
    <div class="tch-hw-post-ftitle">📢 โพสประกาศใหม่</div>
    <input type="text" id="ann-title" class="tch-settings-inp" placeholder="หัวข้อประกาศ" style="margin-bottom:0.75rem;">
    <textarea id="ann-body" class="tch-settings-inp" style="min-height:80px;resize:vertical;" placeholder="รายละเอียดประกาศ..."></textarea>
    <div style="display:flex;align-items:center;gap:1rem;margin-top:0.75rem;flex-wrap:wrap;">
      <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" id="ann-pin" style="accent-color:var(--brown-deep);"> 📌 ปักหมุดประกาศ
      </label>
      <button class="tch-hw-post-btn" style="margin-left:auto;" onclick="tchPostAnnouncement()">📢 โพสประกาศ</button>
    </div>
  </div>`;

  const sorted = [...anns].sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || b.postedAt-a.postedAt);
  const items = sorted.length
    ? sorted.map(a => `<div class="tch-ann-item ${a.pinned?'pinned':''}">
        ${a.pinned?'<div class="tch-ann-pin">📌 ปักหมุด</div>':''}
        <div class="tch-ann-title">${a.title}</div>
        ${a.body?`<div class="tch-ann-body">${a.body}</div>`:''}
        <div class="tch-ann-meta">${tchTimeAgo(a.postedAt)} · ครูสมชาย ใจดี</div>
      </div>`).join('')
    : '<div class="tch-empty" style="padding:2rem;">📭 ยังไม่มีประกาศ</div>';

  return `${form}<div class="tch-ann-list">${items}</div>`;
}

function tchPostAnnouncement() {
  const title  = document.getElementById('ann-title')?.value?.trim();
  const body   = document.getElementById('ann-body')?.value?.trim();
  const pinned = document.getElementById('ann-pin')?.checked || false;
  if (!title) { showToast('⚠️ กรุณาใส่หัวข้อประกาศ'); return; }
  if (!CLASS_ANNOUNCEMENTS[tchSubjectClassId]) CLASS_ANNOUNCEMENTS[tchSubjectClassId] = [];
  CLASS_ANNOUNCEMENTS[tchSubjectClassId].unshift({
    id: 'ann_'+Date.now(), title, body: body||'', postedAt: Date.now(), pinned,
  });
  showToast(`📢 โพสประกาศ "${title}" แล้ว`);
  tchSubjectTab = 'announce';
  document.getElementById('tch-main').innerHTML = tchBuildSubject();
}

function tchTimeAgo(ts) {
  const diff=Date.now()-ts, mins=Math.floor(diff/60000), hrs=Math.floor(mins/60), days=Math.floor(hrs/24);
  if(days>=1) return `${days} วันที่แล้ว`;
  if(hrs>=1)  return `${hrs} ชั่วโมงที่แล้ว`;
  if(mins>=1) return `${mins} นาทีที่แล้ว`;
  return 'เมื่อกี้';
}

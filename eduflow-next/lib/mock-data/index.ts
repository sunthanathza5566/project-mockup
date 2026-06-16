import type {
  User, Permissions, StudentProfile, StudentStats, SchedulePeriod,
  Subject, Assignment, ShopItem, LibraryBook, Notification,
  TeacherProfile, ClassInfo, TeacherStudent, TeacherAssignment, School,
} from '../types';

// ─── AUTH SEED DATA ────────────────────────────────────────────────────────
// TODO(PostgreSQL): ย้ายข้อมูลนี้ไป seed script (prisma/seed.ts)
export const SEEDED_USERS: User[] = [
  { username: 'webadmin', password: 'Admin123', role: 'web_admin',    name: 'ผู้ดูแลระบบหลัก',       seeded: true, createdAt: '2567-01-01' },
  { username: 'teacher1', password: 'Teacher1', role: 'teacher',      name: 'ครูสมชาย ใจดี',         school: 'โรงเรียนทดสอบ EduFlow' },
  { username: 'student1', password: 'Student1', role: 'student',      name: 'ธนาพร สุขใจ',           code: '10021', class: 'ม.1/1' },
  { username: 'parent1',  password: 'Parent01', role: 'parent',       name: 'คุณพ่อสมชาย สุขใจ',    childCode: '10021', childName: 'ธนาพร สุขใจ' },
  { username: 'schadmin', password: 'Admin001', role: 'school_admin', name: 'ผู้ดูแลโรงเรียนทดสอบ', school: 'โรงเรียนทดสอบ EduFlow' },
];

export const DEFAULT_PERMISSIONS: Permissions = {
  teacher:      { viewAttendance: true, editAttendance: true, viewReports: true, exportData: true, manageStudents: false },
  student:      { viewOwnHistory: true, viewSchedule: true, viewGrades: false },
  parent:       { viewChildStatus: true, viewHistory: true, contactTeacher: true },
  school_admin: { manageTeachers: true, manageStudents: true, viewAllReports: true, exportData: true, manageParents: false },
};

export const PERMISSION_LABELS: Record<string, Record<string, string>> = {
  teacher:      { viewAttendance: 'ดูการเช็คชื่อ', editAttendance: 'แก้ไขการเช็คชื่อ', viewReports: 'ดูรายงาน', exportData: 'Export ข้อมูล', manageStudents: 'จัดการนักเรียน' },
  student:      { viewOwnHistory: 'ดูประวัติตัวเอง', viewSchedule: 'ดูตารางเรียน', viewGrades: 'ดูเกรด' },
  parent:       { viewChildStatus: 'ดูสถานะบุตรหลาน', viewHistory: 'ดูประวัติการมาเรียน', contactTeacher: 'ติดต่อครู' },
  school_admin: { manageTeachers: 'จัดการครู', manageStudents: 'จัดการนักเรียน', viewAllReports: 'ดูรายงานทั้งหมด', exportData: 'Export ข้อมูล', manageParents: 'จัดการผู้ปกครอง' },
};

export const ROLE_LABELS: Record<string, string> = {
  web_admin: 'ผู้ดูแลระบบเว็บ', school_admin: 'Admin โรงเรียน',
  teacher: 'ครู', student: 'นักเรียน', parent: 'ผู้ปกครอง',
};

// ─── STUDENT MOCK DATA ─────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึงจาก table: students, attendance, assignments, schedules
export const STUDENT_PROFILE_MOCK: StudentProfile = {
  firstName: 'ธนาพร', lastName: 'สุขใจ', nickname: 'นาพร',
  gender: 'หญิง', dob: '12 มีนาคม 2555', bloodType: 'O+',
  studentId: '10021', grade: 'ม.1', room: '1', academicYear: '2567',
  school: 'โรงเรียนทดสอบ EduFlow',
  address: '123/45 ถ.สุขุมวิท แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260',
  phone: '089-123-4567', email: 'thanapon@student.eduflow.th', lineId: 'thanapon_s',
  religion: 'พุทธ', nationality: 'ไทย',
  father: { name: 'สมชาย สุขใจ',  phone: '081-234-5678', occupation: 'วิศวกร' },
  mother: { name: 'สมหญิง สุขใจ', phone: '082-345-6789', occupation: 'ครูประจำโรงเรียน' },
  emergencyContact: '081-234-5678',
};

export const STUDENT_STATS_MOCK: StudentStats = {
  attendancePct: 92, homeworkPending: 2, balance: 350, gpa: 3.75,
};

export const STUDENT_SCHEDULE_MOCK: Record<string, SchedulePeriod[]> = {
  mon: [
    { period:1, time:'08:00–09:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
    { period:2, time:'09:00–10:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'   },
    { period:3, time:'10:00–11:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'    },
    { period:4, time:'11:00–12:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'    },
    { period:5, time:'13:00–14:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social' },
    { period:6, time:'14:00–15:00', subject:'พลศึกษา',    teacher:'ครูประเสริฐ แข็งแรง',  room:'สนามกีฬา',  key:'pe'     },
  ],
  tue: [
    { period:1, time:'08:00–09:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'    },
    { period:2, time:'09:00–10:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
    { period:3, time:'10:00–11:00', subject:'ศิลปะ',       teacher:'ครูมาลี วาดเก่ง',    room:'ห้องศิลปะ',  key:'art'    },
    { period:4, time:'11:00–12:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'   },
    { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
    { period:6, time:'14:00–15:30', subject:'ดนตรี',       teacher:'ครูวันชัย เสียงดี',   room:'ห้องดนตรี', key:'music'  },
  ],
  wed: [
    { period:1, time:'08:00–09:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'    },
    { period:2, time:'09:00–10:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social' },
    { period:3, time:'10:00–11:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
    { period:4, time:'11:00–12:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'    },
    { period:5, time:'13:00–14:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'   },
    { period:6, time:'14:00–15:00', subject:'คอมพิวเตอร์',teacher:'ครูมาลี คอมเก่ง',     room:'ห้องคอม',   key:'com'    },
  ],
  thu: [
    { period:1, time:'08:00–09:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'   },
    { period:2, time:'09:00–10:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'    },
    { period:3, time:'10:00–11:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social' },
    { period:4, time:'11:00–12:00', subject:'พลศึกษา',    teacher:'ครูประเสริฐ แข็งแรง',  room:'สนามกีฬา',  key:'pe'     },
    { period:5, time:'13:00–14:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'    },
    { period:6, time:'14:00–15:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
  ],
  fri: [
    { period:1, time:'08:00–09:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social' },
    { period:2, time:'09:00–10:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'    },
    { period:3, time:'10:00–11:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'   },
    { period:4, time:'11:00–12:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'    },
    { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'   },
    { period:6, time:'14:00–15:00', subject:'แนะแนว',     teacher:'ครูอรวรรณ ดูแลดี',    room:'ห้อง 108',   key:'guidance'},
  ],
};

export const STUDENT_SUBJECTS_MOCK: Subject[] = [
  { key:'math',   name:'คณิตศาสตร์',  teacher:'ครูสมชาย ใจดี',      icon:'📐', attend:95, midterm:85, assign:7, done:5 },
  { key:'thai',   name:'ภาษาไทย',     teacher:'ครูสมหญิง มีสุข',    icon:'📖', attend:100,midterm:78, assign:5, done:4 },
  { key:'sci',    name:'วิทยาศาสตร์', teacher:'ครูณัฐพล แสงทอง',    icon:'🔬', attend:90, midterm:82, assign:6, done:4 },
  { key:'eng',    name:'ภาษาอังกฤษ',  teacher:'Mr. James',          icon:'🌐', attend:95, midterm:90, assign:8, done:7 },
  { key:'social', name:'สังคมศึกษา',  teacher:'ครูวิชัย รักชาติ',    icon:'🗺️', attend:85, midterm:75, assign:4, done:4 },
  { key:'pe',     name:'พลศึกษา',     teacher:'ครูประเสริฐ แข็งแรง', icon:'⚽', attend:88, midterm:95, assign:2, done:2 },
  { key:'com',    name:'คอมพิวเตอร์', teacher:'ครูมาลี คอมเก่ง',    icon:'💻', attend:100,midterm:88, assign:3, done:2 },
  { key:'art',    name:'ศิลปะ',        teacher:'ครูมาลี วาดเก่ง',   icon:'🎨', attend:92, midterm:80, assign:2, done:2 },
];

export const STUDENT_ASSIGNMENTS_MOCK: Assignment[] = [
  { id:1, key:'math',   subject:'คณิตศาสตร์',  title:'แบบฝึกหัดบทที่ 3: สมการเชิงเส้นตัวแปรเดียว', due:'17/06/2567', urgency:'soon',    status:'pending',   maxScore:10, myScore:null, teacher:'ครูสมชาย ใจดี',   details:'ทำแบบฝึกหัดหน้า 45–50 ข้อ 1–20 ส่งในสมุดแบบฝึกหัด', files:1 },
  { id:2, key:'thai',   subject:'ภาษาไทย',     title:'เรียงความ: ความสำคัญของวันสำคัญของชาติ',    due:'18/06/2567', urgency:'soon',    status:'submitted', maxScore:20, myScore:18,   teacher:'ครูสมหญิง มีสุข', details:'เขียนเรียงความ 1–2 หน้า A4 พร้อมรูปภาพประกอบ', files:0 },
  { id:3, key:'sci',    subject:'วิทยาศาสตร์', title:'รายงานการทดลอง: แรงดึงดูดของโลก',            due:'15/06/2567', urgency:'overdue', status:'overdue',   maxScore:15, myScore:null, teacher:'ครูณัฐพล แสงทอง', details:'ทำรายงานตามแบบฟอร์มที่แนบ พร้อมกราฟผลการทดลอง', files:2 },
  { id:4, key:'eng',    subject:'ภาษาอังกฤษ',  title:'Reading Comprehension: Unit 4 — Nature',      due:'20/06/2567', urgency:'normal',  status:'pending',   maxScore:10, myScore:null, teacher:'Mr. James',       details:'Read pages 78–80 and answer questions 1–10 in workbook', files:1 },
  { id:5, key:'social', subject:'สังคมศึกษา',  title:'แผนที่ทวีปเอเชีย: ระบุประเทศสำคัญ 20 ประเทศ', due:'12/06/2567', urgency:'done',   status:'graded',    maxScore:10, myScore:9,    teacher:'ครูวิชัย รักชาติ', details:'วาดแผนที่และระบุประเทศพร้อมเมืองหลวง', files:0 },
  { id:6, key:'math',   subject:'คณิตศาสตร์',  title:'Quiz ประจำบทที่ 2: การคูณและการหาร',           due:'10/06/2567', urgency:'done',   status:'graded',    maxScore:20, myScore:17,   teacher:'ครูสมชาย ใจดี',   details:'ข้อสอบ Quiz 20 ข้อ ใช้เวลา 30 นาที', files:0 },
  { id:7, key:'com',    subject:'คอมพิวเตอร์', title:'โปรเจกต์: สร้างเว็บไซต์แนะนำตัวเองด้วย HTML',  due:'25/06/2567', urgency:'normal',  status:'pending',   maxScore:30, myScore:null, teacher:'ครูมาลี คอมเก่ง', details:'สร้างเว็บไซต์ด้วย HTML/CSS อย่างน้อย 3 หน้า พร้อม responsive', files:3 },
  { id:8, key:'thai',   subject:'ภาษาไทย',     title:'อ่านบทกวี: ลิลิตพระลอ (บทที่ 1–5)',           due:'22/06/2567', urgency:'normal',  status:'pending',   maxScore:10, myScore:null, teacher:'ครูสมหญิง มีสุข', details:'อ่านและวิเคราะห์บทกวี สรุปเนื้อหาและคุณค่าวรรณคดี', files:1 },
];

export const STUDENT_ATTENDANCE_MOCK = {
  week: ['on-time','on-time','late','on-time','on-time'] as ('on-time'|'late'|'absent')[],
  month: { onTime: 18, late: 2, absent: 1, total: 21 },
};

// ─── SHOP MOCK DATA ────────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึงจาก table: shop_items, categories
export const SHOP_CATS = ['ทั้งหมด', 'อาหารจานเดียว', 'ก๋วยเตี๋ยว', 'ขนม & เครื่องดื่ม'];

export const SHOP_ITEMS_MOCK: ShopItem[] = [
  { id:1,  cat:'อาหารจานเดียว',      name:'ข้าวผัดกุ้ง',          price:35, icon:'🍳', avail:true,  hot:true  },
  { id:2,  cat:'อาหารจานเดียว',      name:'ข้าวมันไก่',            price:35, icon:'🍗', avail:true,  hot:true  },
  { id:3,  cat:'อาหารจานเดียว',      name:'ข้าวราดแกงกะหรี่',      price:30, icon:'🍛', avail:true,  hot:false },
  { id:4,  cat:'อาหารจานเดียว',      name:'ข้าวหมูแดงหมูกรอบ',     price:35, icon:'🥩', avail:true,  hot:false },
  { id:5,  cat:'อาหารจานเดียว',      name:'ผัดกะเพราหมูไข่ดาว',    price:35, icon:'🌿', avail:true,  hot:true  },
  { id:6,  cat:'อาหารจานเดียว',      name:'ไข่เจียวหมูสับ',         price:30, icon:'🥚', avail:true,  hot:false },
  { id:7,  cat:'ก๋วยเตี๋ยว',         name:'ก๋วยเตี๋ยวน้ำใส',       price:30, icon:'🍜', avail:true,  hot:false },
  { id:8,  cat:'ก๋วยเตี๋ยว',         name:'ก๋วยเตี๋ยวต้มยำน้ำข้น', price:35, icon:'🍲', avail:true,  hot:true  },
  { id:9,  cat:'ก๋วยเตี๋ยว',         name:'บะหมี่หมูแดง',           price:35, icon:'🍝', avail:false, hot:false },
  { id:10, cat:'ขนม & เครื่องดื่ม', name:'ขนมปังปิ้งไข่มังกร',     price:25, icon:'🧇', avail:true,  hot:true  },
  { id:11, cat:'ขนม & เครื่องดื่ม', name:'ชาเย็นไทย',              price:25, icon:'🧋', avail:true,  hot:true  },
  { id:12, cat:'ขนม & เครื่องดื่ม', name:'น้ำผลไม้สด',             price:20, icon:'🥤', avail:true,  hot:false },
  { id:13, cat:'ขนม & เครื่องดื่ม', name:'ไอศกรีมถ้วย',            price:15, icon:'🍦', avail:true,  hot:false },
];

// ─── LIBRARY MOCK DATA ─────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึงจาก table: books, reading_progress
export const LIBRARY_BOOKS_MOCK: LibraryBook[] = [
  { id:1,  type:'การ์ตูน', title:'นักสืบจิ๋ว',          cover:'🕵️', pages:8,  author:'สมชาย เขียนดี',       desc:'นักสืบเด็กผจญภัยไขปริศนาลึกลับ',    gradeMin:1,  gradeMax:12 },
  { id:2,  type:'การ์ตูน', title:'หุ่นยนต์มหัศจรรย์',   cover:'🤖', pages:10, author:'มาลี วาดเก่ง',         desc:'หุ่นยนต์จิ๋วผจญภัยในโลกอนาคต',      gradeMin:1,  gradeMax:12 },
  { id:3,  type:'การ์ตูน', title:'เด็กพลังพิเศษ',       cover:'✨', pages:6,  author:'สุดา การ์ตูน',         desc:'เด็กน้อยที่ค้นพบพลังในตัวเอง',      gradeMin:1,  gradeMax:12 },
  { id:4,  type:'การ์ตูน', title:'ผจญภัยใต้ทะเล',       cover:'🌊', pages:8,  author:'ณัฐ วาดสนุก',          desc:'เด็กชายดำน้ำพบอาณาจักรลึกลับ',      gradeMin:1,  gradeMax:12 },
  { id:5,  type:'ความรู้',  title:'สัตว์ในป่า',           cover:'🦁', pages:6,  author:'ดร.วิทยา รักธรรมชาติ', desc:'สิ่งมีชีวิตในป่าลึกน่าตื่นตาตื่นใจ', gradeMin:1,  gradeMax:3  },
  { id:6,  type:'ความรู้',  title:'โลกของแมลง',           cover:'🦋', pages:6,  author:'ดร.ธรรมชาติ ใจดี',    desc:'แมลงน่าสนใจรอบตัวเรา',              gradeMin:1,  gradeMax:3  },
  { id:7,  type:'ความรู้',  title:'ระบบสุริยจักรวาล',    cover:'🪐', pages:8,  author:'ดร.อรุณ ดาวฟ้า',      desc:'ดาวเคราะห์และดาวฤกษ์ในจักรวาล',    gradeMin:4,  gradeMax:6  },
  { id:8,  type:'ความรู้',  title:'ประวัติศาสตร์ไทย',    cover:'🏯', pages:10, author:'ผศ.ประวัติ รักชาติ',  desc:'อาณาจักรโบราณและราชวงศ์ไทย',       gradeMin:4,  gradeMax:6  },
  { id:9,  type:'ความรู้',  title:'ฟิสิกส์สนุก',          cover:'⚡', pages:8,  author:'รศ.วิทยา แสงทอง',     desc:'ฟิสิกส์และเคมีขั้นพื้นฐาน',        gradeMin:7,  gradeMax:9  },
  { id:10, type:'ความรู้',  title:'ชีววิทยาน่ารู้',       cover:'🔬', pages:8,  author:'ดร.ชีวะ สุขดี',       desc:'ชีววิทยาระดับเซลล์',                gradeMin:7,  gradeMax:9  },
  { id:11, type:'ความรู้',  title:'เศรษฐศาสตร์เบื้องต้น',cover:'📊', pages:10, author:'ดร.สมบัติ ธนกิจ',     desc:'การเงินและเศรษฐกิจเบื้องต้น',      gradeMin:10, gradeMax:12 },
  { id:12, type:'ความรู้',  title:'ปรัชญาและจริยธรรม',   cover:'🏛️', pages:8,  author:'ศ.ดร.ปรัชญา ใจดี',   desc:'แนวคิดนักปราชญ์สำคัญของโลก',       gradeMin:10, gradeMax:12 },
  { id:13, type:'นิทาน',   title:'กระต่ายกับเต่า',       cover:'🐢', pages:6,  author:'อีสป (แปล)',           desc:'นิทานคลาสสิกสอนความอดทน',           gradeMin:1,  gradeMax:3  },
  { id:14, type:'นิทาน',   title:'เจ้าชายน้อย',          cover:'👑', pages:8,  author:'แซ็งต์-เอกซูเปรี (แปล)',desc:'การผจญภัยและมิตรภาพของเจ้าชาย', gradeMin:1,  gradeMax:3  },
  { id:15, type:'นิทาน',   title:'สิงโตกับหนู',          cover:'🦁', pages:6,  author:'อีสป (แปล)',           desc:'มิตรภาพที่ไม่คาดฝัน',               gradeMin:4,  gradeMax:6  },
  { id:16, type:'นิทาน',   title:'นิทานพื้นบ้านไทย',     cover:'🏮', pages:10, author:'คณะนักเขียนไทย',      desc:'รวมนิทานพื้นบ้านภาคต่างๆ',         gradeMin:7,  gradeMax:9  },
];

export const NOTIFICATIONS_MOCK: Notification[] = [
  { id:1, type:'overdue', isNew:true,  title:'การบ้านวิทยาศาสตร์เกินกำหนดแล้ว', body:'รายงานการทดลอง: แรงดึงดูดของโลก — หมดเวลาส่งแล้ว', time: Date.now() - 45*60*1000 },
  { id:2, type:'grade',   isNew:true,  title:'คะแนนสังคมศึกษาออกแล้ว',            body:'แผนที่ทวีปเอเชีย — ได้ 9/10 คะแนน ✨',              time: Date.now() - 3*60*60*1000 },
  { id:3, type:'hw',      isNew:true,  title:'งานใหม่: ภาษาอังกฤษ',               body:'Reading Comprehension: Unit 4 — ครบกำหนด 20/06/2567', time: Date.now() - 6*60*60*1000 },
  { id:4, type:'info',    isNew:false, title:'ประกาศจากโรงเรียน',                  body:'วันศุกร์นี้มีกิจกรรมกีฬาสี นักเรียนทุกคนสวมเสื้อสีประจำบ้าน', time: Date.now() - 22*60*60*1000 },
];

// ─── TEACHER MOCK DATA ─────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึงจาก table: teachers, classes, teacher_assignments
export const TEACHER_DATA_MOCK = {
  profile: {
    name:'ครูสมชาย ใจดี', teacherId:'T001',
    school:'โรงเรียนทดสอบ EduFlow', subject:'คณิตศาสตร์', academicYear:'2567',
  } as TeacherProfile,
  classes: [
    { id:'c1', grade:'ม.1', room:'1', subject:'คณิตศาสตร์', key:'math',  icon:'📐', color:'#C4804A' },
    { id:'c2', grade:'ม.2', room:'2', subject:'คณิตศาสตร์', key:'math',  icon:'📐', color:'#C4804A' },
    { id:'c3', grade:'ม.3', room:'1', subject:'สถิติ',       key:'stats', icon:'📊', color:'#8A9E7E' },
  ] as ClassInfo[],
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
  ] as TeacherStudent[],
};

// ─── SCHOOL MOCK DATA ──────────────────────────────────────────────────────
// TODO(PostgreSQL): ดึงจาก table: schools, reviews
export const SCHOOL_LEVEL_SEGMENTS = [
  { key: 'kindergarten', label: 'อนุบาล', pct: 15, color: '#C4A882' },
  { key: 'primary',      label: 'ประถมศึกษา', pct: 42, color: '#6B4F2F' },
  { key: 'secondary',    label: 'มัธยมศึกษา', pct: 35, color: '#9E7B56' },
  { key: 'vocational',   label: 'ปวช',         pct: 8,  color: '#C4A882' },
];

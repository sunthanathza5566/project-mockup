// ─── STUDENT DASHBOARD ───

// ── Subject color palette ──
const STU_COLORS = {
  math:     { bg:'rgba(196,128,74,0.13)',  border:'rgba(196,128,74,0.35)',  text:'#7A4A20', dot:'#C4804A' },
  thai:     { bg:'rgba(92,138,92,0.13)',   border:'rgba(92,138,92,0.35)',   text:'#2E5C2E', dot:'#5C8A5C' },
  sci:      { bg:'rgba(107,79,47,0.13)',   border:'rgba(107,79,47,0.35)',   text:'#5A3820', dot:'#8B6040' },
  eng:      { bg:'rgba(100,130,196,0.13)', border:'rgba(100,130,196,0.35)', text:'#2A4070', dot:'#6B80C8' },
  social:   { bg:'rgba(138,158,126,0.13)', border:'rgba(138,158,126,0.35)', text:'#3D5C35', dot:'#8A9E7E' },
  pe:       { bg:'rgba(160,80,80,0.13)',   border:'rgba(160,80,80,0.35)',   text:'#7A3030', dot:'#A05050' },
  com:      { bg:'rgba(107,127,168,0.13)', border:'rgba(107,127,168,0.35)', text:'#2A3D60', dot:'#6B7FA8' },
  art:      { bg:'rgba(196,122,138,0.13)', border:'rgba(196,122,138,0.35)', text:'#7A3050', dot:'#C47A8A' },
  music:    { bg:'rgba(168,138,107,0.13)', border:'rgba(168,138,107,0.35)', text:'#5A3A20', dot:'#A88A6B' },
  guidance: { bg:'rgba(138,138,138,0.13)', border:'rgba(138,138,138,0.3)',  text:'#505050', dot:'#8A8A8A' },
};

function stuColor(key) { return STU_COLORS[key] || STU_COLORS.guidance; }

// ── Mock Data ──
const STUDENT_DATA = {
  profile: {
    firstName: 'ธนาพร', lastName: 'สุขใจ', nickname: 'นาพร',
    gender: 'หญิง', dob: '12 มีนาคม 2555', bloodType: 'O+',
    studentId: '10021', grade: 'ม.1', room: '1', academicYear: '2567',
    school: 'โรงเรียนทดสอบ EduFlow',
    address: '123/45 ถ.สุขุมวิท แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260',
    phone: '089-123-4567',
    email: 'thanapon@student.eduflow.th',
    lineId: 'thanapon_s',
    religion: 'พุทธ', nationality: 'ไทย',
    father: { name: 'สมชาย สุขใจ',  phone: '081-234-5678', occupation: 'วิศวกร' },
    mother: { name: 'สมหญิง สุขใจ', phone: '082-345-6789', occupation: 'ครูประจำโรงเรียน' },
    emergencyContact: '081-234-5678',
  },
  stats: { attendancePct: 92, homeworkPending: 2, balance: 350, gpa: 3.75 },
  attendance: {
    week: ['on-time','on-time','late','on-time','on-time'],
    month: { onTime: 18, late: 2, absent: 1, total: 21 },
  },
  schedule: {
    mon: [
      { period:1, time:'08:00–09:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
      { period:2, time:'09:00–10:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'     },
      { period:3, time:'10:00–11:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'      },
      { period:4, time:'11:00–12:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'      },
      { period:5, time:'13:00–14:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social'   },
      { period:6, time:'14:00–15:00', subject:'พลศึกษา',    teacher:'ครูประเสริฐ แข็งแรง',  room:'สนามกีฬา',  key:'pe'       },
    ],
    tue: [
      { period:1, time:'08:00–09:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'      },
      { period:2, time:'09:00–10:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
      { period:3, time:'10:00–11:00', subject:'ศิลปะ',       teacher:'ครูมาลี วาดเก่ง',    room:'ห้องศิลปะ',  key:'art'      },
      { period:4, time:'11:00–12:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'     },
      { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
      { period:6, time:'14:00–15:30', subject:'ดนตรี',       teacher:'ครูวันชัย เสียงดี',   room:'ห้องดนตรี', key:'music'    },
    ],
    wed: [
      { period:1, time:'08:00–09:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'      },
      { period:2, time:'09:00–10:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social'   },
      { period:3, time:'10:00–11:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
      { period:4, time:'11:00–12:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'      },
      { period:5, time:'13:00–14:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'     },
      { period:6, time:'14:00–15:00', subject:'คอมพิวเตอร์',teacher:'ครูมาลี คอมเก่ง',     room:'ห้องคอม',   key:'com'      },
    ],
    thu: [
      { period:1, time:'08:00–09:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'     },
      { period:2, time:'09:00–10:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'      },
      { period:3, time:'10:00–11:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social'   },
      { period:4, time:'11:00–12:00', subject:'พลศึกษา',    teacher:'ครูประเสริฐ แข็งแรง',  room:'สนามกีฬา',  key:'pe'       },
      { period:5, time:'13:00–14:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'      },
      { period:6, time:'14:00–15:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
    ],
    fri: [
      { period:1, time:'08:00–09:00', subject:'สังคมศึกษา', teacher:'ครูวิชัย รักชาติ',     room:'ห้อง 102',   key:'social'   },
      { period:2, time:'09:00–10:00', subject:'ภาษาอังกฤษ', teacher:'Mr. James',           room:'ห้อง 203',   key:'eng'      },
      { period:3, time:'10:00–11:00', subject:'ภาษาไทย',    teacher:'ครูสมหญิง มีสุข',     room:'ห้อง 105',   key:'thai'     },
      { period:4, time:'11:00–12:00', subject:'วิทยาศาสตร์',teacher:'ครูณัฐพล แสงทอง',     room:'ห้องแล็บ 1', key:'sci'      },
      { period:5, time:'13:00–14:00', subject:'คณิตศาสตร์', teacher:'ครูสมชาย ใจดี',       room:'ห้อง 201',   key:'math'     },
      { period:6, time:'14:00–15:00', subject:'แนะแนว',     teacher:'ครูอรวรรณ ดูแลดี',    room:'ห้อง 108',   key:'guidance' },
    ],
  },
  subjects: [
    { key:'math',    name:'คณิตศาสตร์',  teacher:'ครูสมชาย ใจดี',       icon:'📐', attend:95, midterm:85, assign:7, done:5 },
    { key:'thai',    name:'ภาษาไทย',     teacher:'ครูสมหญิง มีสุข',     icon:'📖', attend:100,midterm:78, assign:5, done:4 },
    { key:'sci',     name:'วิทยาศาสตร์', teacher:'ครูณัฐพล แสงทอง',     icon:'🔬', attend:90, midterm:82, assign:6, done:4 },
    { key:'eng',     name:'ภาษาอังกฤษ',  teacher:'Mr. James',           icon:'🌐', attend:95, midterm:90, assign:8, done:7 },
    { key:'social',  name:'สังคมศึกษา',  teacher:'ครูวิชัย รักชาติ',     icon:'🗺️', attend:85, midterm:75, assign:4, done:4 },
    { key:'pe',      name:'พลศึกษา',     teacher:'ครูประเสริฐ แข็งแรง',  icon:'⚽', attend:88, midterm:95, assign:2, done:2 },
    { key:'com',     name:'คอมพิวเตอร์', teacher:'ครูมาลี คอมเก่ง',     icon:'💻', attend:100,midterm:88, assign:3, done:2 },
    { key:'art',     name:'ศิลปะ',        teacher:'ครูมาลี วาดเก่ง',    icon:'🎨', attend:92, midterm:80, assign:2, done:2 },
  ],
  assignments: [
    { id:1, key:'math',   subject:'คณิตศาสตร์',  title:'แบบฝึกหัดบทที่ 3: สมการเชิงเส้นตัวแปรเดียว', due:'17/06/2567', urgency:'soon',    status:'pending',   maxScore:10, myScore:null, teacher:'ครูสมชาย ใจดี',      details:'ทำแบบฝึกหัดหน้า 45–50 ข้อ 1–20 ส่งในสมุดแบบฝึกหัด', files:1 },
    { id:2, key:'thai',   subject:'ภาษาไทย',     title:'เรียงความ: ความสำคัญของวันสำคัญของชาติ',    due:'18/06/2567', urgency:'soon',    status:'submitted', maxScore:20, myScore:18,   teacher:'ครูสมหญิง มีสุข',    details:'เขียนเรียงความ 1–2 หน้า A4 พร้อมรูปภาพประกอบ', files:0 },
    { id:3, key:'sci',    subject:'วิทยาศาสตร์', title:'รายงานการทดลอง: แรงดึงดูดของโลก',            due:'15/06/2567', urgency:'overdue', status:'overdue',   maxScore:15, myScore:null, teacher:'ครูณัฐพล แสงทอง',    details:'ทำรายงานตามแบบฟอร์มที่แนบ พร้อมกราฟผลการทดลอง', files:2 },
    { id:4, key:'eng',    subject:'ภาษาอังกฤษ',  title:'Reading Comprehension: Unit 4 — Nature',      due:'20/06/2567', urgency:'normal',  status:'pending',   maxScore:10, myScore:null, teacher:'Mr. James',          details:'Read pages 78–80 and answer questions 1–10 in workbook', files:1 },
    { id:5, key:'social', subject:'สังคมศึกษา',  title:'แผนที่ทวีปเอเชีย: ระบุประเทศสำคัญ 20 ประเทศ', due:'12/06/2567', urgency:'done',   status:'graded',    maxScore:10, myScore:9,    teacher:'ครูวิชัย รักชาติ',    details:'วาดแผนที่และระบุประเทศพร้อมเมืองหลวง', files:0 },
    { id:6, key:'math',   subject:'คณิตศาสตร์',  title:'Quiz ประจำบทที่ 2: การคูณและการหาร',           due:'10/06/2567', urgency:'done',   status:'graded',    maxScore:20, myScore:17,   teacher:'ครูสมชาย ใจดี',      details:'ข้อสอบ Quiz 20 ข้อ ใช้เวลา 30 นาที', files:0 },
    { id:7, key:'com',    subject:'คอมพิวเตอร์', title:'โปรเจกต์: สร้างเว็บไซต์แนะนำตัวเองด้วย HTML',  due:'25/06/2567', urgency:'normal',  status:'pending',   maxScore:30, myScore:null, teacher:'ครูมาลี คอมเก่ง',    details:'สร้างเว็บไซต์ด้วย HTML/CSS อย่างน้อย 3 หน้า พร้อม responsive', files:3 },
    { id:8, key:'thai',   subject:'ภาษาไทย',     title:'อ่านบทกวี: ลิลิตพระลอ (บทที่ 1–5)',           due:'22/06/2567', urgency:'normal',  status:'pending',   maxScore:10, myScore:null, teacher:'ครูสมหญิง มีสุข',    details:'อ่านและวิเคราะห์บทกวี สรุปเนื้อหาและคุณค่าวรรณคดี', files:1 },
  ],
};

// ── Shop Data ──
const SHOP_DATA = {
  cats: ['ทั้งหมด','อาหารจานเดียว','ก๋วยเตี๋ยว','ขนม & เครื่องดื่ม'],
  items: [
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
  ],
};

// ── Library Data ──
const LIBRARY_BOOKS = [
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

// Page templates per book type
const LIB_PAGE_TPLS = {
  'การ์ตูน': [
    { art:'🌅', head:'ตอนที่ 1: จุดเริ่มต้น',      body:'เช้าวันหนึ่ง... ท้องฟ้าสว่างไสว ตัวละครหลักรู้สึกว่าวันนี้ไม่ธรรมดา มีบางอย่างรอเขาอยู่' },
    { art:'😲', head:'การค้นพบ',                    body:'"เกิดอะไรขึ้น!?" เสียงร้องดังขึ้น พร้อมกับเงาปริศนาที่ปรากฏขึ้นมาอย่างไม่คาดฝัน' },
    { art:'🏃', head:'ออกเดินทาง',                  body:'ต้องออกไปแก้ปัญหา! ทุกวินาทีมีค่า การผจญภัยที่แท้จริงเริ่มต้นขึ้นแล้ว' },
    { art:'💥', head:'การปะทะ',                     body:'[ฉากแอ็กชัน] ศัตรูแข็งแกร่งมาก! แต่ตัวละครหลักยังไม่ยอมแพ้ต่อความยากลำบาก' },
    { art:'🤝', head:'มิตรภาพคือพลัง',              body:'เพื่อนเข้ามาช่วยในเวลาที่เหมาะสม ด้วยแรงใจซึ่งกันและกัน พวกเขาก็ผ่านมาได้' },
    { art:'🌟', head:'ความลับถูกเปิดเผย',           body:'ความจริงที่ซ่อนอยู่มานานก็ถูกเปิดเผย! โลกทั้งใบจะไม่เหมือนเดิมอีกต่อไป' },
    { art:'🎊', head:'ชัยชนะ',                      body:'"เราทำได้แล้ว!" ทุกคนโห่ร้องด้วยความยินดี บทเรียนที่ได้รับนั้นมีค่ายิ่ง' },
    { art:'🔮', head:'ตอนจบ',                       body:'แต่เรื่องราวยังไม่จบเพียงแค่นี้... ประตูสู่การผจญภัยครั้งใหม่กำลังเปิดอยู่ข้างหน้า' },
  ],
  'ความรู้': [
    { art:'🔍', head:'บทนำ',                        body:'ในบทนี้เราจะได้เรียนรู้เรื่องราวที่น่าสนใจซึ่งเกี่ยวข้องกับชีวิตประจำวันของเราโดยตรง' },
    { art:'📊', head:'ข้อมูลน่ารู้',                 body:'จากการศึกษาพบว่า... ตัวเลขและสถิติเหล่านี้ช่วยให้เราเข้าใจโลกได้ดียิ่งขึ้น' },
    { art:'🧩', head:'ความเป็นมา',                  body:'เรื่องราวนี้มีประวัติยาวนาน เริ่มต้นตั้งแต่สมัยโบราณจนพัฒนามาถึงปัจจุบัน' },
    { art:'🔬', head:'การค้นพบสำคัญ',               body:'นักวิทยาศาสตร์ค้นพบว่า... สิ่งที่พบนี้เปลี่ยนแปลงความเข้าใจของมนุษยชาติไปตลอดกาล' },
    { art:'🌍', head:'ผลกระทบต่อโลก',               body:'ความรู้นี้ส่งผลต่อชีวิตประจำวันของเราในหลายด้าน ทั้งด้านสุขภาพ สิ่งแวดล้อม และสังคม' },
    { art:'💡', head:'สรุปบทเรียน',                  body:'สิ่งสำคัญที่ได้เรียนรู้จากบทนี้คือ... การนำความรู้ไปใช้ในชีวิตจริงคือสิ่งที่มีค่าที่สุด' },
    { art:'❓', head:'คำถามท้าทาย',                  body:'ลองคิดวิเคราะห์ดูซิว่า ถ้าสถานการณ์เปลี่ยนแปลงไป เราจะต้องปรับตัวอย่างไร?' },
    { art:'📚', head:'แหล่งค้นคว้าเพิ่มเติม',       body:'ผู้ที่สนใจสามารถศึกษาเพิ่มเติมได้จากหนังสือและเว็บไซต์ที่น่าเชื่อถือหลายแห่ง' },
    { art:'🏆', head:'แบบทดสอบ',                    body:'ลองทดสอบความรู้ที่ได้จากการอ่านด้วยคำถาม: คุณได้เรียนรู้อะไรจากบทนี้บ้าง?' },
    { art:'✅', head:'อ่านจบแล้ว!',                 body:'ยินดีด้วย! คุณอ่านหนังสือเล่มนี้จบเรียบร้อย ได้รับคะแนนจิตพิสัย +2 คะแนน ⭐⭐' },
  ],
  'นิทาน': [
    { art:'🌙', head:'กาลครั้งหนึ่ง...',            body:'ในดินแดนอันไกลโพ้น มีตัวละครที่ใช้ชีวิตอย่างสงบสุข แต่แล้วเหตุการณ์หนึ่งก็เปลี่ยนทุกอย่าง' },
    { art:'🏡', head:'ชีวิตปกติสุข',                body:'ก่อนที่เรื่องราวจะเริ่มต้น ทุกอย่างดูเหมือนสมบูรณ์แบบ แต่ใต้ผิวน้ำนั้นมีบางอย่างซ่อนอยู่' },
    { art:'⚠️', head:'ปัญหาเกิดขึ้น',               body:'ความยากลำบากมาเยือนโดยไม่คาดฝัน ทุกคนต่างกลัวและไม่รู้จะทำอย่างไรดี' },
    { art:'🦸', head:'ผู้กล้าหาญ',                  body:'"ฉันจะช่วย!" เสียงดังกังวาน ผู้กล้าหาญลุกขึ้นมาเผชิญหน้ากับความยากลำบาก' },
    { art:'🌿', head:'การเดินทาง',                   body:'การเดินทางเริ่มต้นขึ้น ผ่านป่าและภูเขา ผจญภัยพบกับเพื่อนและศัตรูมากมาย' },
    { art:'💎', head:'บทเรียนชีวิต',                 body:'พบกับทรัพย์สมบัติที่แท้จริง ซึ่งไม่ใช่ทองคำหรือเพชรพลอย แต่เป็นสิ่งที่ล้ำค่ากว่า' },
    { art:'🕊️', head:'สันติภาพ',                    body:'สันติภาพกลับมาอีกครั้ง ทุกคนเรียนรู้ที่จะอยู่ร่วมกันอย่างมีความสุขและเข้าใจกัน' },
    { art:'📜', head:'คติสอนใจ',                    body:'"และพวกเขาก็มีความสุขตลอดไป" — ความดีย่อมชนะเสมอ และมิตรภาพคือสิ่งที่ล้ำค่าที่สุด' },
    { art:'🌈', head:'จบนิทาน',                     body:'นิทานเรื่องนี้สอนให้เรารู้ว่า ไม่ว่าจะยากแค่ไหน ถ้าเรามีใจที่ดี ทุกอย่างก็เป็นไปได้' },
    { art:'✅', head:'อ่านจบแล้ว!',                 body:'ยินดีด้วย! คุณอ่านหนังสือเล่มนี้จบเรียบร้อย ได้รับคะแนนจิตพิสัย +1 คะแนน ⭐' },
  ],
};

// ── State ──
let stuCurrentView    = 'dashboard';
let stuCurrentDay     = '';
let stuHomeworkFilter = 'all';

// Shop state
let shopCart      = {}; // { itemId: qty }
let shopCatFilter = 'ทั้งหมด';

// Library state
let libTypeFilter  = 'ทั้งหมด';
let libGradeFilter = 'auto'; // 'auto' | 'ป.1-3' | 'ป.4-6' | 'ม.1-3' | 'ม.4-6'
let libReadDone    = {}; // { bookId: true } stored in localStorage
let libOpenBookId  = null;
let libCurPage     = 0;

function libLoadDone() {
  try { libReadDone = JSON.parse(localStorage.getItem('eduflow_lib_done') || '{}'); } catch(e) { libReadDone = {}; }
}
function libSaveDone() {
  localStorage.setItem('eduflow_lib_done', JSON.stringify(libReadDone));
}
function stuGetGradeNum() {
  const g = STUDENT_DATA.profile.grade || 'ม.1';
  if (g.startsWith('ป.')) return parseInt(g.slice(2)) || 1;
  if (g.startsWith('ม.')) return (parseInt(g.slice(2)) || 1) + 6;
  return 7;
}

// ── Init ──────────────────────────────────────────────────────
function buildStudentPage() {
  const user = getSession();
  if (!user) return;

  // Merge session name into profile
  STUDENT_DATA.profile.firstName = user.name.split(' ')[0] || STUDENT_DATA.profile.firstName;
  STUDENT_DATA.profile.lastName  = user.name.split(' ')[1] || STUDENT_DATA.profile.lastName;
  if (user.code)  STUDENT_DATA.profile.studentId = user.code;
  if (user.class) {
    const parts = user.class.split('/');
    STUDENT_DATA.profile.grade = parts[0] || STUDENT_DATA.profile.grade;
    STUDENT_DATA.profile.room  = parts[1] || STUDENT_DATA.profile.room;
  }

  // Set sidebar mini-card (เก็บไว้ compatibility)
  const initials = (STUDENT_DATA.profile.firstName.substring(0,1) + (STUDENT_DATA.profile.lastName||'').substring(0,1));
  document.getElementById('stu-sidebar-avatar').textContent = initials;
  document.getElementById('stu-sidebar-name').textContent   = STUDENT_DATA.profile.firstName + ' ' + STUDENT_DATA.profile.lastName;
  document.getElementById('stu-sidebar-class').textContent  = `${STUDENT_DATA.profile.grade}/${STUDENT_DATA.profile.room} · รหัส ${STUDENT_DATA.profile.studentId}`;
  document.getElementById('stu-balance-num').textContent    = STUDENT_DATA.stats.balance.toLocaleString('th-TH');

  // Set burger panel mini-profile
  document.getElementById('stu-bm-avatar').textContent  = initials;
  document.getElementById('stu-bm-pname').textContent   = STUDENT_DATA.profile.firstName + ' ' + STUDENT_DATA.profile.lastName;
  document.getElementById('stu-bm-pclass').textContent  = `${STUDENT_DATA.profile.grade}/${STUDENT_DATA.profile.room} · รหัส ${STUDENT_DATA.profile.studentId}`;

  // Set default day to today (Mon–Fri only)
  const dayMap = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' };
  const today  = new Date().getDay();
  stuCurrentDay = dayMap[today] || 'mon';

  stuSetView('dashboard');
}

// ── Page switcher ─────────────────────────────────────────────
function stuSetView(view) {
  stuCurrentView = view;

  // Update sidebar active item
  document.querySelectorAll('.stu-menu-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  // Update burger panel active item
  document.querySelectorAll('.stu-bm-item[data-bmview]').forEach(btn => {
    btn.classList.toggle('bm-active', btn.dataset.bmview === view);
  });

  const main = document.getElementById('stu-main');

  switch (view) {
    case 'dashboard':  main.innerHTML = stuBuildDashboard();  break;
    case 'profile':    main.innerHTML = stuBuildProfile();    break;
    case 'classroom':  main.innerHTML = stuBuildClassroom();  break;
    case 'schedule':   main.innerHTML = stuBuildSchedule();   break;
    case 'homework':   main.innerHTML = stuBuildHomework();   break;
    case 'shop':       main.innerHTML = stuBuildShop();       stuRenderCartBar(); break;
    case 'library':    libLoadDone(); main.innerHTML = stuBuildLibrary(); break;
  }
  main.scrollTop = 0;
}

// ── Burger menu toggle ────────────────────────────────────────
function stuToggleBurgerMenu() {
  const panel   = document.getElementById('stu-bm-panel');
  const overlay = document.getElementById('stu-bm-overlay');
  const isOpen  = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  } else {
    panel.classList.add('open');
    overlay.classList.add('show');
  }
}
function stuCloseBurgerMenu() {
  document.getElementById('stu-bm-panel').classList.remove('open');
  document.getElementById('stu-bm-overlay').classList.remove('show');
}
function stuBurgerNav(view) {
  stuCloseBurgerMenu();
  stuSetView(view);
}

// ── Sidebar toggle ────────────────────────────────────────────
function stuToggleSidebar() {
  document.getElementById('stu-sidebar').classList.toggle('open');
  document.getElementById('stu-sidebar-overlay').classList.toggle('show');
}
function stuCloseSidebar() {
  document.getElementById('stu-sidebar').classList.remove('open');
  document.getElementById('stu-sidebar-overlay').classList.remove('show');
}

// ═══════════════════════════════════════════════════════════════
// VIEW: DASHBOARD
// ═══════════════════════════════════════════════════════════════
function stuBuildDashboard() {
  const p    = STUDENT_DATA.profile;
  const st   = STUDENT_DATA.stats;
  const att  = STUDENT_DATA.attendance;
  const dayKeys = ['mon','tue','wed','thu','fri'];
  const todaySched = STUDENT_DATA.schedule[stuCurrentDay] || STUDENT_DATA.schedule.mon;
  const dayLabels  = { mon:'จ', tue:'อ', wed:'พ', thu:'พฤ', fri:'ศ' };
  const thaiDays   = { mon:'วันจันทร์', tue:'วันอังคาร', wed:'วันพุธ', thu:'วันพฤหัสบดี', fri:'วันศุกร์' };
  const pending    = STUDENT_DATA.assignments.filter(a => a.status === 'pending' || a.status === 'overdue').slice(0,3);

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const greeting = now.getHours() < 12 ? 'อรุณสวัสดิ์ 🌅' : now.getHours() < 17 ? 'สวัสดีตอนบ่าย ☀️' : 'สวัสดีตอนเย็น 🌆';

  const attDotsHtml = att.week.map((s, i) => {
    const cls = s === 'on-time' ? 'dot-ok' : s === 'late' ? 'dot-late' : 'dot-absent';
    const lbl = s === 'on-time' ? 'ทัน' : s === 'late' ? 'สาย' : 'ขาด';
    return `<div class="stu-att-day">
      <div class="stu-att-label">${dayLabels[dayKeys[i]]}</div>
      <div class="dash-day-dot ${cls}"></div>
      <div class="stu-att-status">${lbl}</div>
    </div>`;
  }).join('');

  const schedHtml = todaySched.map(p => {
    const c = stuColor(p.key);
    return `<div class="stu-sched-item" style="border-left:3px solid ${c.dot};background:${c.bg};">
      <div class="stu-sched-period">คาบ ${p.period}</div>
      <div class="stu-sched-subj" style="color:${c.text};">${p.subject}</div>
      <div class="stu-sched-meta">${p.time} · ${p.room}</div>
    </div>`;
  }).join('');

  const statusLabel = { pending:'ยังไม่ส่ง', overdue:'เกินกำหนด', submitted:'รอตรวจ', graded:'ได้คะแนนแล้ว' };
  const hwHtml = pending.map(a => {
    const c = stuColor(a.key);
    const isOverdue = a.status === 'overdue';
    return `<div class="stu-hw-row" onclick="stuSetView('homework')">
      <div class="stu-hw-dot" style="background:${c.dot};"></div>
      <div class="stu-hw-info">
        <div class="stu-hw-title">${a.title}</div>
        <div class="stu-hw-meta">${a.subject} · ครบกำหนด ${a.due}</div>
      </div>
      <span class="stu-hw-badge ${isOverdue ? 'badge-overdue' : 'badge-pending'}">${statusLabel[a.status]}</span>
    </div>`;
  }).join('') || '<div class="stu-empty">ไม่มีการบ้านที่รอส่ง 🎉</div>';

  return `
    <div class="stu-view-wrap">
      <div class="stu-greeting-bar">
        <div>
          <div class="stu-greeting-sub">${greeting}</div>
          <h1 class="stu-greeting-name">${p.firstName} <em>${p.lastName}</em></h1>
          <div class="stu-greeting-date">${dateStr} · ${thaiDays[stuCurrentDay]}</div>
        </div>
        <div class="stu-greeting-id">
          <div class="stu-id-num">${p.studentId}</div>
          <div class="stu-id-label">${p.grade}/${p.room}</div>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="stu-kpi-grid">
        <div class="stu-kpi-card" onclick="stuSetView('schedule')">
          <div class="stu-kpi-icon">📅</div>
          <div class="stu-kpi-val">${todaySched.length}</div>
          <div class="stu-kpi-lbl">คาบเรียนวันนี้</div>
        </div>
        <div class="stu-kpi-card ${st.attendancePct < 80 ? 'kpi-warn' : ''}" onclick="stuSetView('classroom')">
          <div class="stu-kpi-icon">✅</div>
          <div class="stu-kpi-val">${st.attendancePct}%</div>
          <div class="stu-kpi-lbl">เข้าเรียนเดือนนี้</div>
        </div>
        <div class="stu-kpi-card ${st.homeworkPending > 0 ? 'kpi-alert' : ''}" onclick="stuSetView('homework')">
          <div class="stu-kpi-icon">📚</div>
          <div class="stu-kpi-val">${st.homeworkPending}</div>
          <div class="stu-kpi-lbl">การบ้านค้างส่ง</div>
        </div>
        <div class="stu-kpi-card">
          <div class="stu-kpi-icon">⭐</div>
          <div class="stu-kpi-val">${st.gpa}</div>
          <div class="stu-kpi-lbl">GPA ภาคเรียน</div>
        </div>
        <div class="stu-kpi-card" onclick="showToast('กำลังเปิดระบบเติมเงิน...')">
          <div class="stu-kpi-icon">💰</div>
          <div class="stu-kpi-val">฿${st.balance}</div>
          <div class="stu-kpi-lbl">ยอดเงินคงเหลือ</div>
        </div>
      </div>

      <!-- Today schedule -->
      <div class="stu-section">
        <div class="stu-section-header">
          <div class="stu-section-title">ตารางเรียน${thaiDays[stuCurrentDay]}นี้</div>
          <button class="stu-link-btn" onclick="stuSetView('schedule')">ดูทั้งหมด →</button>
        </div>
        <div class="stu-sched-list">${schedHtml}</div>
      </div>

      <!-- Upcoming homework -->
      <div class="stu-section">
        <div class="stu-section-header">
          <div class="stu-section-title">การบ้านที่ต้องส่ง</div>
          <button class="stu-link-btn" onclick="stuSetView('homework')">ดูทั้งหมด →</button>
        </div>
        <div class="stu-hw-list">${hwHtml}</div>
      </div>

      <!-- Attendance this week -->
      <div class="stu-section">
        <div class="stu-section-title">การมาเรียนสัปดาห์นี้</div>
        <div class="stu-att-week">${attDotsHtml}</div>
        <div class="stu-att-summary">
          มาทัน ${att.month.onTime} วัน · มาสาย ${att.month.late} วัน · ขาด ${att.month.absent} วัน (เดือนนี้)
        </div>
      </div>

      <!-- Quick actions -->
      <div class="stu-section">
        <div class="stu-section-title">ทำรายการด่วน</div>
        <div class="stu-quick-actions">
          <button class="stu-quick-btn" onclick="showToast('เปิดระบบสแกน QR...')">🔲 สแกน QR</button>
          <button class="stu-quick-btn" onclick="stuSetView('homework')">📚 ส่งการบ้าน</button>
          <button class="stu-quick-btn" onclick="showToast('เปิดระบบสั่งข้าว...')">🍱 สั่งข้าว</button>
          <button class="stu-quick-btn" onclick="showToast('เปิดร้านค้า...')">🛍 ร้านค้า</button>
          <button class="stu-quick-btn" onclick="showToast('กำลังเติมเงิน...')">💳 เติมเงิน</button>
          <button class="stu-quick-btn" onclick="stuSetView('profile')">👤 โปรไฟล์</button>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// VIEW: PROFILE
// ═══════════════════════════════════════════════════════════════
function stuBuildProfile() {
  const p = STUDENT_DATA.profile;
  const initials = p.firstName.substring(0,1) + (p.lastName||'').substring(0,1);

  const infoRow = (label, val) => val
    ? `<div class="stu-info-row"><span class="stu-info-label">${label}</span><span class="stu-info-val">${val}</span></div>`
    : '';

  return `
    <div class="stu-view-wrap">
      <div class="stu-profile-header">
        <div class="stu-profile-avatar-wrap">
          <div class="stu-profile-avatar">${initials}</div>
          <button class="stu-avatar-edit" onclick="showToast('ฟีเจอร์อัปโหลดรูปภาพกำลังพัฒนา...')">📷</button>
        </div>
        <div>
          <h2 class="stu-profile-name">${p.firstName} <em>${p.lastName}</em></h2>
          <div class="stu-profile-id">รหัสนักเรียน ${p.studentId} · ${p.grade}/${p.room} · ปีการศึกษา ${p.academicYear}</div>
          <div class="stu-profile-school">${p.school}</div>
        </div>
      </div>

      <div class="stu-info-grid">
        <div class="stu-info-card">
          <div class="stu-info-card-title">👤 ข้อมูลส่วนตัว</div>
          ${infoRow('ชื่อ', p.firstName)}
          ${infoRow('นามสกุล', p.lastName)}
          ${infoRow('ชื่อเล่น', p.nickname)}
          ${infoRow('เพศ', p.gender)}
          ${infoRow('วันเกิด', p.dob)}
          ${infoRow('กรุ๊ปเลือด', p.bloodType)}
          ${infoRow('ศาสนา', p.religion)}
          ${infoRow('สัญชาติ', p.nationality)}
        </div>

        <div class="stu-info-card">
          <div class="stu-info-card-title">🏫 ข้อมูลการศึกษา</div>
          ${infoRow('รหัสนักเรียน', p.studentId)}
          ${infoRow('ระดับชั้น', p.grade)}
          ${infoRow('ห้องเรียน', p.room)}
          ${infoRow('ปีการศึกษาที่เข้า', p.academicYear)}
          ${infoRow('โรงเรียน', p.school)}
        </div>

        <div class="stu-info-card">
          <div class="stu-info-card-title">👨‍👩‍👧 ข้อมูลผู้ปกครอง</div>
          ${infoRow('ชื่อบิดา', p.father.name)}
          ${infoRow('อาชีพบิดา', p.father.occupation)}
          ${infoRow('เบอร์โทรบิดา', p.father.phone)}
          ${infoRow('ชื่อมารดา', p.mother.name)}
          ${infoRow('อาชีพมารดา', p.mother.occupation)}
          ${infoRow('เบอร์โทรมารดา', p.mother.phone)}
          ${infoRow('เบอร์ฉุกเฉิน', p.emergencyContact)}
        </div>

        <div class="stu-info-card">
          <div class="stu-info-card-title">📱 ช่องทางติดต่อ</div>
          ${infoRow('เบอร์โทรนักเรียน', p.phone)}
          ${infoRow('อีเมล', p.email)}
          ${infoRow('Line ID', p.lineId)}
          ${infoRow('ที่อยู่', p.address)}
        </div>
      </div>

      <div style="text-align:center;margin-top:1rem;">
        <button class="stu-btn-outline" onclick="showToast('กรุณาติดต่อครูเพื่อแก้ไขข้อมูล')">✏️ แจ้งแก้ไขข้อมูล</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// VIEW: CLASSROOM
// ═══════════════════════════════════════════════════════════════
function stuBuildClassroom() {
  const cards = STUDENT_DATA.subjects.map(s => {
    const c   = stuColor(s.key);
    const pct = s.attend;
    const bar = `<div class="stu-cls-bar-wrap"><div class="stu-cls-bar-fill" style="width:${pct}%;background:${c.dot};"></div></div>`;
    const hw  = STUDENT_DATA.assignments.filter(a => a.key === s.key && (a.status === 'pending' || a.status === 'overdue'));
    return `<div class="stu-cls-card" style="border-top:3px solid ${c.dot};">
      <div class="stu-cls-icon">${s.icon}</div>
      <div class="stu-cls-name">${s.name}</div>
      <div class="stu-cls-teacher">${s.teacher}</div>
      <div class="stu-cls-stats">
        <div>
          <div class="stu-cls-stat-label">การเข้าเรียน</div>
          ${bar}
          <div class="stu-cls-stat-val" style="color:${c.dot};">${pct}%</div>
        </div>
        <div>
          <div class="stu-cls-stat-label">คะแนนกลางภาค</div>
          <div class="stu-cls-stat-big">${s.midterm !== null ? s.midterm : '—'}</div>
        </div>
        <div>
          <div class="stu-cls-stat-label">งานที่มอบหมาย</div>
          <div class="stu-cls-stat-big">${s.done}/${s.assign}</div>
        </div>
      </div>
      ${hw.length ? `<div class="stu-cls-hw-alert">📌 มีการบ้านค้างอยู่ ${hw.length} ชิ้น</div>` : ''}
      <button class="stu-cls-btn" onclick="stuFilterHomework('${s.key}')">ดูการบ้านวิชานี้ →</button>
    </div>`;
  }).join('');

  return `
    <div class="stu-view-wrap">
      <div class="stu-page-header">
        <h2 class="stu-page-title">🏫 ห้องเรียนของฉัน</h2>
        <p class="stu-page-sub">ชั้น ${STUDENT_DATA.profile.grade}/${STUDENT_DATA.profile.room} · ปีการศึกษา ${STUDENT_DATA.profile.academicYear}</p>
      </div>
      <div class="stu-cls-grid">${cards}</div>
    </div>`;
}

function stuFilterHomework(key) {
  stuHomeworkFilter = key;
  stuSetView('homework');
}

// ═══════════════════════════════════════════════════════════════
// VIEW: SCHEDULE
// ═══════════════════════════════════════════════════════════════
function stuBuildSchedule() {
  const dayKeys   = ['mon','tue','wed','thu','fri'];
  const dayThai   = { mon:'จันทร์', tue:'อังคาร', wed:'พุธ', thu:'พฤหัสบดี', fri:'ศุกร์' };
  const dayShort  = { mon:'จ', tue:'อ', wed:'พ', thu:'พฤ', fri:'ศ' };

  const tabsHtml = dayKeys.map(d => `
    <button class="stu-day-tab ${d === stuCurrentDay ? 'active' : ''}"
      onclick="stuChangeDay('${d}')">
      <span class="stu-day-short">${dayShort[d]}</span>
      <span class="stu-day-full">${dayThai[d]}</span>
    </button>`).join('');

  const sched = STUDENT_DATA.schedule[stuCurrentDay] || [];
  const lunchHtml = `<div class="stu-lunch-inline">
    <span>🍱</span>
    <span>พักเที่ยง</span>
    <span class="stu-lunch-inline-time">12:00 – 13:00</span>
  </div>`;

  const periodsHtml = sched.reduce((html, p, idx) => {
    const c = stuColor(p.key);
    const card = `<div class="stu-period-card" style="background:${c.bg};border:1px solid ${c.border};">
      <div class="stu-period-num" style="color:${c.dot};">คาบ ${p.period}</div>
      <div class="stu-period-time">${p.time}</div>
      <div class="stu-period-subj" style="color:${c.text};">${p.subject}</div>
      <div class="stu-period-teacher">${p.teacher}</div>
      <div class="stu-period-room">📍 ${p.room}</div>
    </div>`;
    // แทรก lunch break หลังคาบที่จบตอน 12:xx (ก่อนคาบบ่าย)
    const endTime = p.time.split('–')[1]?.trim() || p.time.split('-')[1]?.trim() || '';
    const insertLunch = endTime.startsWith('12:') ||
      (sched[idx+1] && (sched[idx+1].time.startsWith('13:') || sched[idx+1].time.includes('13:00')));
    return html + card + (insertLunch && !html.includes('stu-lunch-inline') ? lunchHtml : '');
  }, '') || '<div class="stu-empty">ไม่มีคาบเรียน 🎉</div>';

  return `
    <div class="stu-view-wrap">
      <div class="stu-page-header">
        <h2 class="stu-page-title">📅 ตารางเรียน</h2>
        <p class="stu-page-sub">${STUDENT_DATA.profile.grade}/${STUDENT_DATA.profile.room} · ปีการศึกษา ${STUDENT_DATA.profile.academicYear}</p>
      </div>
      <div class="stu-day-tabs">${tabsHtml}</div>
      <div class="stu-periods-wrap">
        <div class="stu-periods-grid" id="stu-periods-grid">${periodsHtml}</div>
      </div>
    </div>`;
}

function stuChangeDay(day) {
  stuCurrentDay = day;
  stuSetView('schedule');
}

// ═══════════════════════════════════════════════════════════════
// VIEW: HOMEWORK
// ═══════════════════════════════════════════════════════════════
function stuBuildHomework() {
  const filters = [
    { id:'all',       label:'ทั้งหมด' },
    { id:'pending',   label:'ยังไม่ส่ง' },
    { id:'overdue',   label:'เกินกำหนด' },
    { id:'submitted', label:'รอตรวจ' },
    { id:'graded',    label:'ได้คะแนนแล้ว' },
    // subject filters
    { id:'math',    label:'คณิตศาสตร์' },
    { id:'thai',    label:'ภาษาไทย' },
    { id:'sci',     label:'วิทย์ฯ' },
    { id:'eng',     label:'อังกฤษ' },
    { id:'social',  label:'สังคมฯ' },
    { id:'com',     label:'คอมฯ' },
  ];

  const filtersHtml = filters.map(f =>
    `<button class="stu-filter-chip ${stuHomeworkFilter === f.id ? 'active' : ''}"
      onclick="stuSetHomeworkFilter('${f.id}')">${f.label}</button>`
  ).join('');

  let list = [...STUDENT_DATA.assignments];
  const statusFilters = ['all','pending','overdue','submitted','graded'];
  if (statusFilters.includes(stuHomeworkFilter)) {
    if (stuHomeworkFilter !== 'all') list = list.filter(a => a.status === stuHomeworkFilter);
  } else {
    list = list.filter(a => a.key === stuHomeworkFilter);
  }

  const statusMap = {
    pending:   { label:'ยังไม่ส่ง',      cls:'badge-pending'  },
    overdue:   { label:'เกินกำหนด',      cls:'badge-overdue'  },
    submitted: { label:'รอตรวจ',         cls:'badge-submitted' },
    graded:    { label:'ได้คะแนนแล้ว',   cls:'badge-graded'   },
  };

  const cardsHtml = list.map(a => {
    const c   = stuColor(a.key);
    const st  = statusMap[a.status] || {};
    const scored = a.myScore !== null ? `${a.myScore}/${a.maxScore} คะแนน` : `— /${a.maxScore} คะแนน`;
    return `<div class="stu-hw-card">
      <div class="stu-hw-card-top">
        <span class="stu-hw-subject-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">${a.subject}</span>
        <span class="stu-hw-status-badge ${st.cls}">${st.label}</span>
      </div>
      <div class="stu-hw-card-title">${a.title}</div>
      <div class="stu-hw-card-meta">
        <span>👩‍🏫 ${a.teacher}</span>
        <span>📅 ส่ง ${a.due}</span>
        <span>📊 ${scored}</span>
        ${a.files ? `<span>📎 ${a.files} ไฟล์</span>` : ''}
      </div>
      <details class="stu-hw-details">
        <summary>รายละเอียด</summary>
        <div class="stu-hw-desc">${a.details}</div>
        ${a.status === 'pending' || a.status === 'overdue'
          ? `<button class="stu-hw-submit-btn" onclick="stuOpenSubmit(${a.id})">📤 ส่งการบ้าน</button>`
          : ''}
      </details>
    </div>`;
  }).join('') || '<div class="stu-empty">ไม่มีการบ้านในหมวดนี้ ✓</div>';

  const pending  = STUDENT_DATA.assignments.filter(a => a.status === 'pending').length;
  const overdue  = STUDENT_DATA.assignments.filter(a => a.status === 'overdue').length;
  const graded   = STUDENT_DATA.assignments.filter(a => a.status === 'graded').length;
  const submitted= STUDENT_DATA.assignments.filter(a => a.status === 'submitted').length;

  return `
    <div class="stu-view-wrap">
      <div class="stu-page-header">
        <h2 class="stu-page-title">📚 การบ้าน & งานที่มอบหมาย</h2>
        <p class="stu-page-sub">รวมทุกวิชา · ปีการศึกษา ${STUDENT_DATA.profile.academicYear}</p>
      </div>

      <div class="stu-hw-summary-row">
        <div class="stu-hw-sum stu-hw-sum-pending">  <strong>${pending}</strong>  ยังไม่ส่ง</div>
        <div class="stu-hw-sum stu-hw-sum-overdue">  <strong>${overdue}</strong>  เกินกำหนด</div>
        <div class="stu-hw-sum stu-hw-sum-submitted"><strong>${submitted}</strong> รอตรวจ</div>
        <div class="stu-hw-sum stu-hw-sum-graded">  <strong>${graded}</strong>  ประเมินแล้ว</div>
      </div>

      <div class="stu-filters">${filtersHtml}</div>
      <div class="stu-hw-cards">${cardsHtml}</div>
    </div>`;
}

function stuSetHomeworkFilter(f) {
  stuHomeworkFilter = f;
  stuSetView('homework');
}

// ═══════════════════════════════════════════════════════════════
// VIEW: SHOP
// ═══════════════════════════════════════════════════════════════
function stuBuildShop() {
  const catChips = SHOP_DATA.cats.map(c =>
    `<button class="stu-filter-chip ${shopCatFilter===c?'active':''}" onclick="stuShopCat('${c}')">${c}</button>`
  ).join('');

  const items = shopCatFilter === 'ทั้งหมด'
    ? SHOP_DATA.items
    : SHOP_DATA.items.filter(i => i.cat === shopCatFilter);

  const cards = items.map(item => {
    const qty = shopCart[item.id] || 0;
    const inCart = qty > 0;
    const cls = !item.avail ? 'sold-out' : inCart ? 'in-cart' : '';
    const tag = !item.avail
      ? `<span class="stu-shop-tag stu-shop-tag-out">หมด</span>`
      : item.hot ? `<span class="stu-shop-tag stu-shop-tag-hot">🔥 ยอดนิยม</span>` : '';
    const qtyBadge = qty > 0 ? `<div class="stu-shop-qty">${qty}</div>` : '';
    const clickFn = item.avail ? `stuShopAddItem(${item.id})` : `showToast('สินค้าหมดแล้ว')`;
    return `<div class="stu-shop-item ${cls}" onclick="${clickFn}">
      ${tag}${qtyBadge}
      <div class="stu-shop-emoji">${item.icon}</div>
      <div class="stu-shop-name">${item.name}</div>
      <div class="stu-shop-price">฿${item.price}</div>
    </div>`;
  }).join('');

  return `
    <div class="stu-view-wrap">
      <div class="stu-page-header">
        <h2 class="stu-page-title">🛍 ร้านค้าโรงเรียน</h2>
        <p class="stu-page-sub">สั่งอาหารล่วงหน้า · รับช่วงพักกลางวัน 12:00 – 13:00</p>
      </div>
      <div class="stu-shop-cats">${catChips}</div>
      <div class="stu-shop-grid">${cards}</div>
    </div>`;
}

function stuShopCat(cat) {
  shopCatFilter = cat;
  stuSetView('shop');
}

function stuShopAddItem(id) {
  shopCart[id] = (shopCart[id] || 0) + 1;
  stuSetView('shop');
}

function stuShopRemoveItem(id) {
  if (shopCart[id] > 0) shopCart[id]--;
  if (shopCart[id] === 0) delete shopCart[id];
  stuRenderCartBar();
}

function stuRenderCartBar() {
  let bar = document.getElementById('stu-cart-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'stu-cart-bar';
    bar.className = 'stu-cart-bar hidden';
    bar.innerHTML = `
      <div class="stu-cart-info">
        <div class="stu-cart-count" id="stu-cart-count"></div>
        <div class="stu-cart-total" id="stu-cart-total"></div>
      </div>
      <div class="stu-cart-actions">
        <button class="stu-cart-clear" onclick="stuClearCart()">ล้าง</button>
        <button class="stu-cart-checkout" onclick="stuCheckout()">สั่งอาหาร →</button>
      </div>`;
    document.getElementById('page-student').appendChild(bar);
  }
  const ids  = Object.keys(shopCart);
  const qty  = ids.reduce((s, k) => s + shopCart[k], 0);
  const total= ids.reduce((s, k) => {
    const item = SHOP_DATA.items.find(i => i.id === +k);
    return s + (item ? item.price * shopCart[k] : 0);
  }, 0);
  if (qty === 0) {
    bar.classList.add('hidden');
  } else {
    bar.classList.remove('hidden');
    document.getElementById('stu-cart-count').textContent = `${qty} รายการ`;
    document.getElementById('stu-cart-total').textContent = `฿${total}`;
  }
}

function stuClearCart() {
  shopCart = {};
  stuRenderCartBar();
  if (stuCurrentView === 'shop') stuSetView('shop');
}

function stuCheckout() {
  const ids  = Object.keys(shopCart);
  const total = ids.reduce((s, k) => {
    const item = SHOP_DATA.items.find(i => i.id === +k);
    return s + (item ? item.price * shopCart[k] : 0);
  }, 0);
  if (STUDENT_DATA.stats.balance < total) {
    showToast('ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน');
    return;
  }
  STUDENT_DATA.stats.balance -= total;
  document.getElementById('stu-balance-num').textContent = STUDENT_DATA.stats.balance.toLocaleString('th-TH');
  shopCart = {};
  stuRenderCartBar();
  showToast(`✅ สั่งอาหารสำเร็จ! หักเงิน ฿${total} · รับอาหารช่วงพักกลางวัน`);
  if (stuCurrentView === 'shop') stuSetView('shop');
}

// ═══════════════════════════════════════════════════════════════
// VIEW: LIBRARY
// ═══════════════════════════════════════════════════════════════
function stuBuildLibrary() {
  const gradeNum = stuGetGradeNum();

  // grade filter range
  const gradeRanges = {
    'ป.1-3': [1,3], 'ป.4-6': [4,6], 'ม.1-3': [7,9], 'ม.4-6': [10,12],
  };
  const autoLabel = gradeNum <= 3 ? 'ป.1-3' : gradeNum <= 6 ? 'ป.4-6' : gradeNum <= 9 ? 'ม.1-3' : 'ม.4-6';
  const activeGrade = libGradeFilter === 'auto' ? autoLabel : libGradeFilter;
  const [gMin, gMax] = gradeRanges[activeGrade] || [1, 12];

  // filter books
  let books = LIBRARY_BOOKS.filter(b => {
    if (libTypeFilter !== 'ทั้งหมด' && b.type !== libTypeFilter) return false;
    if (b.type === 'การ์ตูน') return true; // การ์ตูน ทุกระดับ
    return b.gradeMin <= gMax && b.gradeMax >= gMin;
  });

  const gradeChips = ['auto','ป.1-3','ป.4-6','ม.1-3','ม.4-6'].map(g => {
    const lbl = g === 'auto' ? `ระดับฉัน (${autoLabel})` : g;
    return `<button class="stu-lib-chip ${libGradeFilter===g?'active':''}" onclick="libSetGrade('${g}')">${lbl}</button>`;
  }).join('');

  const typeChips = ['ทั้งหมด','การ์ตูน','ความรู้','นิทาน'].map(t =>
    `<button class="stu-lib-chip ${libTypeFilter===t?'active':''}" onclick="libSetType('${t}')">${t}</button>`
  ).join('');

  const cards = books.map(b => {
    const done = libReadDone[b.id];
    return `<div class="stu-lib-card" onclick="libOpenBook(${b.id})">
      <div class="stu-lib-cover">${b.cover}</div>
      <div class="stu-lib-badge lib-badge-${b.type}">${b.type}</div>
      <div class="stu-lib-title">${b.title}</div>
      <div class="stu-lib-author">${b.author}</div>
      <div class="stu-lib-pages">${b.pages} หน้า</div>
      ${done ? `<div class="stu-lib-done">✓ อ่านแล้ว</div>` : ''}
    </div>`;
  }).join('') || '<div class="stu-empty">ไม่มีหนังสือในหมวดนี้</div>';

  return `
    <div class="stu-view-wrap">
      <div class="stu-page-header">
        <h2 class="stu-page-title">📖 ห้องสมุด</h2>
        <p class="stu-page-sub">อ่านหนังสือออนไลน์ · สไลด์ซ้าย-ขวาเพื่อเปลี่ยนหน้า</p>
      </div>

      <div class="stu-lib-note">
        📌 การอ่าน <strong>ความรู้</strong> และ <strong>นิทาน</strong> จนจบจะได้รับ <strong>คะแนนจิตพิสัย</strong>
        · การ์ตูนจะได้ประวัติการอ่านสะสมเท่านั้น
      </div>

      <div class="stu-lib-filter-group">
        <span class="stu-lib-filter-label">ระดับชั้น</span>
        <div class="stu-lib-chips">${gradeChips}</div>
      </div>
      <div class="stu-lib-filter-group">
        <span class="stu-lib-filter-label">ประเภท</span>
        <div class="stu-lib-chips">${typeChips}</div>
      </div>

      <div class="stu-lib-grid">${cards}</div>
    </div>

    <!-- Reader modal (injected in DOM, not inside stu-main so it overlays) -->
    <div class="stu-reader-overlay" id="stu-reader-overlay">
      <div class="stu-reader-box">
        <div class="stu-reader-header">
          <span class="stu-reader-htitle" id="stu-reader-htitle"></span>
          <button class="stu-reader-hclose" onclick="libCloseReader()">✕</button>
        </div>
        <div class="stu-reader-pages" id="stu-reader-pages">
          <div class="stu-reader-zone stu-reader-zone-l" onclick="libPrevPage()"></div>
          <div class="stu-reader-zone stu-reader-zone-r" onclick="libNextPage()"></div>
          <div class="stu-reader-page" id="stu-reader-page"></div>
        </div>
        <div class="stu-reader-nav">
          <button class="stu-reader-nav-btn" id="stu-reader-prev" onclick="libPrevPage()">← ก่อนหน้า</button>
          <span class="stu-reader-page-num" id="stu-reader-pgnum"></span>
          <button class="stu-reader-nav-btn" id="stu-reader-next" onclick="libNextPage()">ถัดไป →</button>
        </div>
      </div>
    </div>`;
}

function libSetGrade(g) { libGradeFilter = g; stuSetView('library'); }
function libSetType(t)  { libTypeFilter  = t; stuSetView('library'); }

function libOpenBook(id) {
  libOpenBookId = id;
  libCurPage    = 0;
  const overlay = document.getElementById('stu-reader-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  libRenderPage();
}

function libCloseReader() {
  const overlay = document.getElementById('stu-reader-overlay');
  if (overlay) overlay.classList.remove('open');
  libOpenBookId = null;
}

function libRenderPage(dir) {
  const book = LIBRARY_BOOKS.find(b => b.id === libOpenBookId);
  if (!book) return;
  const pageEl   = document.getElementById('stu-reader-page');
  const pgnumEl  = document.getElementById('stu-reader-pgnum');
  const titleEl  = document.getElementById('stu-reader-htitle');
  const prevBtn  = document.getElementById('stu-reader-prev');
  const nextBtn  = document.getElementById('stu-reader-next');

  if (dir) {
    pageEl.classList.add(dir === 'next' ? 'exit-left' : 'exit-right');
    setTimeout(() => {
      pageEl.classList.remove('exit-left','exit-right');
      libRenderPageContent(book, pageEl, pgnumEl, titleEl, prevBtn, nextBtn);
    }, 260);
  } else {
    libRenderPageContent(book, pageEl, pgnumEl, titleEl, prevBtn, nextBtn);
  }
}

function libRenderPageContent(book, pageEl, pgnumEl, titleEl, prevBtn, nextBtn) {
  titleEl.textContent = book.title;
  pgnumEl.textContent = `หน้า ${libCurPage + 1} / ${book.pages}`;
  prevBtn.disabled = libCurPage === 0;
  nextBtn.disabled = libCurPage >= book.pages - 1;

  if (libCurPage === 0) {
    // Cover page
    pageEl.innerHTML = `
      <div class="rp-cover-art">${book.cover}</div>
      <div class="rp-cover-title">${book.title}</div>
      <div class="rp-cover-auth">${book.author}</div>
      <div class="rp-cover-desc">${book.desc}</div>`;
  } else {
    const tpls = LIB_PAGE_TPLS[book.type] || LIB_PAGE_TPLS['ความรู้'];
    const tpl  = tpls[Math.min(libCurPage - 1, tpls.length - 1)];
    pageEl.innerHTML = `
      <div class="rp-art">${tpl.art}</div>
      <div class="rp-head">${tpl.head}</div>
      <div class="rp-body">${tpl.body}</div>`;
  }

  // Mark done when reaching last page
  if (libCurPage === book.pages - 1 && !libReadDone[book.id]) {
    libReadDone[book.id] = true;
    libSaveDone();
    if (book.type !== 'การ์ตูน') {
      const pts = book.type === 'ความรู้' ? 2 : 1;
      setTimeout(() => showToast(`🎉 อ่านจบแล้ว! +${pts} คะแนนจิตพิสัย`), 400);
    } else {
      setTimeout(() => showToast('📖 บันทึกประวัติการอ่านแล้ว'), 400);
    }
  }
}

function libNextPage() {
  const book = LIBRARY_BOOKS.find(b => b.id === libOpenBookId);
  if (!book || libCurPage >= book.pages - 1) return;
  libCurPage++;
  libRenderPage('next');
}

function libPrevPage() {
  if (libCurPage <= 0) return;
  libCurPage--;
  libRenderPage('prev');
}

// ═══════════════════════════════════════════════════════════════
// SUBMIT MODAL — ส่งการบ้าน
// ═══════════════════════════════════════════════════════════════
let stuSubmitFileSelected = false;

function stuOpenSubmit(id) {
  const a = STUDENT_DATA.assignments.find(x => x.id === id);
  if (!a) return;
  stuSubmitFileSelected = false;

  const c = stuColor(a.key);
  const isOverdue = a.status === 'overdue';
  const isGraded  = a.status === 'graded' || a.status === 'submitted';

  // score panel
  let scoreNum, scoreCls, statusTxt, statusCls;
  if (isGraded && a.myScore !== null) {
    scoreNum  = `${a.myScore}/${a.maxScore}`;
    scoreCls  = 'score-graded'; statusTxt = 'ได้คะแนนแล้ว'; statusCls = 'score-status-graded';
  } else if (isOverdue) {
    scoreNum  = `0/${a.maxScore}`;
    scoreCls  = 'score-zero'; statusTxt = 'เกินกำหนดส่ง'; statusCls = 'score-status-overdue';
  } else {
    scoreNum  = `-/${a.maxScore}`;
    scoreCls  = 'score-ok'; statusTxt = 'ยังไม่ส่ง'; statusCls = 'score-status-ok';
  }

  const scorePanel = `
    <div class="stu-submit-score">
      <div class="stu-submit-score-num ${scoreCls}">${scoreNum}</div>
      <div class="stu-submit-score-max">คะแนนเต็ม ${a.maxScore}</div>
      <div class="stu-submit-score-status ${statusCls}">${statusTxt}</div>
    </div>`;

  // file upload area (ปิดถ้า overdue)
  const fileArea = isOverdue
    ? `<div class="stu-submit-overdue-note">⛔ หมดเวลาส่งงานแล้ว ไม่สามารถแนบไฟล์หรือส่งงานได้</div>`
    : `<div class="stu-submit-file-area" onclick="document.getElementById('stu-file-inp-${id}').click()">
        <div class="stu-submit-file-icon">📎</div>
        <div class="stu-submit-file-txt">คลิกเพื่อเลือกไฟล์ หรือลาก & วาง</div>
        <input type="file" id="stu-file-inp-${id}" class="stu-submit-file-inp" multiple
          onchange="stuFileChosen(this,'stu-file-name-${id}')">
        <button class="stu-submit-file-btn" type="button">เลือกไฟล์</button>
        <div class="stu-submit-file-name" id="stu-file-name-${id}"></div>
      </div>
      <button class="stu-submit-send-btn" onclick="stuSubmitHomework(${id})">📤 ส่งการบ้าน</button>`;

  const bodyHtml = `
    <div class="stu-submit-main">
      <div class="stu-submit-title">${a.title}</div>
      <div class="stu-submit-meta-grid">
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">วิชา</span>
          <span class="stu-submit-meta-val">
            <span style="background:${c.bg};color:${c.text};border:1px solid ${c.border};padding:0.1rem 0.5rem;border-radius:50px;font-size:0.78rem;">${a.subject}</span>
          </span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">ครูผู้รับผิดชอบ</span>
          <span class="stu-submit-meta-val">👩‍🏫 ${a.teacher}</span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">กำหนดส่ง</span>
          <span class="stu-submit-meta-val" style="color:${isOverdue?'var(--absent)':'inherit'}">📅 ${a.due}</span>
        </div>
        <div class="stu-submit-meta-row">
          <span class="stu-submit-meta-lbl">ไฟล์แนบ</span>
          <span class="stu-submit-meta-val">📎 ${a.files} ไฟล์</span>
        </div>
      </div>
      <div class="stu-submit-desc-lbl">รายละเอียดงาน</div>
      <div class="stu-submit-desc">${a.details}</div>
      ${fileArea}
    </div>
    ${scorePanel}`;

  document.getElementById('stu-submit-htitle').textContent = `ส่งการบ้าน — ${a.subject}`;
  document.getElementById('stu-submit-body').innerHTML = bodyHtml;
  document.getElementById('stu-submit-overlay').classList.add('open');
}

function stuFileChosen(inp, labelId) {
  const label = document.getElementById(labelId);
  if (!label) return;
  if (inp.files && inp.files.length > 0) {
    stuSubmitFileSelected = true;
    const names = Array.from(inp.files).map(f => f.name).join(', ');
    label.textContent = `✓ ${names}`;
  }
}

function stuCloseSubmit() {
  document.getElementById('stu-submit-overlay').classList.remove('open');
}

function stuSubmitHomework(id) {
  const a = STUDENT_DATA.assignments.find(x => x.id === id);
  if (!a) return;
  if (!stuSubmitFileSelected) {
    const nameEl = document.querySelector('.stu-submit-file-name');
    if (nameEl) nameEl.textContent = '⚠️ กรุณาเลือกไฟล์ก่อนส่งงาน';
    return;
  }
  // อัปเดต status ใน mock data
  a.status = 'submitted';
  STUDENT_DATA.stats.homeworkPending = Math.max(0, STUDENT_DATA.stats.homeworkPending - 1);

  stuCloseSubmit();

  // แสดง success popup
  document.getElementById('stu-success-sub').textContent =
    `ส่งงาน "${a.title.substring(0,40)}${a.title.length>40?'...':''}" เรียบร้อยแล้ว\nรอครูตรวจสอบ`;
  document.getElementById('stu-success-overlay').classList.add('open');

  // อัปเดต badge
  const pendingCount = STUDENT_DATA.assignments.filter(x => x.status === 'pending' || x.status === 'overdue').length;
  const badge = document.getElementById('stu-hw-badge');
  if (badge) badge.textContent = pendingCount;
  const bmBadge = document.getElementById('stu-bm-hw-badge');
  if (bmBadge) bmBadge.textContent = pendingCount;
}

function stuCloseSuccess() {
  document.getElementById('stu-success-overlay').classList.remove('open');
  if (stuCurrentView === 'homework') stuSetView('homework');
}

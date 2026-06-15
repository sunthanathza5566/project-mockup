// ─── STATIC DATA ───

const students = [
  { name: 'ธนาพร สุขใจ',      code: '10021', time: '08:02', period: '1', status: 'on-time' },
  { name: 'ปิยะดา มีสุข',      code: '10022', time: '08:15', period: '1', status: 'late' },
  { name: 'กวินท์ รักเรียน',   code: '10023', time: '08:00', period: '1', status: 'on-time' },
  { name: 'สุชาดา ใจดี',       code: '10024', time: '—',     period: '—', status: 'absent' },
  { name: 'ณัฐวุฒิ แสงทอง',   code: '10025', time: '08:05', period: '1', status: 'on-time' },
  { name: 'มาริสา ทองสุข',     code: '10026', time: '08:22', period: '1', status: 'late' },
  { name: 'พิชิต วงศ์ศรี',     code: '10027', time: '08:01', period: '1', status: 'on-time' },
  { name: 'อรนุช พรมดี',       code: '10028', time: '08:31', period: '1', status: 'late' },
  { name: 'ภูมิระพี ชัยชนะ',   code: '10029', time: '08:00', period: '1', status: 'on-time' },
  { name: 'ศิริพร นาคแก้ว',    code: '10030', time: '—',     period: '—', status: 'absent' },
];

// ลำดับตามระดับชั้น: อนุบาล → ประถม → มัธยม → ปวช
const donutData = [
  { pct: 0.15, color: '#C4A882' }, // 0: อนุบาล
  { pct: 0.42, color: '#6B4F2F' }, // 1: ประถมศึกษา
  { pct: 0.35, color: '#9E7B56' }, // 2: มัธยมศึกษา
  { pct: 0.08, color: '#E5D5C0' }, // 3: ปวช
];

const centerLabels = ['อนุบาล', 'ประถมศึกษา', 'มัธยมศึกษา', 'ปวช'];
const centerVals   = ['127 โรงเรียน', '356 โรงเรียน', '296 โรงเรียน', '68 สถาบัน'];

const levelMeta = [
  {
    key: 'kinder', label: 'อนุบาล', color: '#C4A882',
    count: 127, students: '18,700', rating: '4.9', emoji: '🌱',
    desc: 'โรงเรียนอนุบาลที่เชื่อมต่อผู้ปกครองผ่านระบบแจ้งเตือน EduFlow',
  },
  {
    key: 'primary', label: 'ประถมศึกษา', color: '#6B4F2F',
    count: 356, students: '52,400', rating: '4.8', emoji: '🏫',
    desc: 'โรงเรียนระดับประถมศึกษาที่ไว้วางใจ EduFlow ทั่วประเทศไทย',
  },
  {
    key: 'secondary', label: 'มัธยมศึกษา', color: '#9E7B56',
    count: 296, students: '43,900', rating: '4.7', emoji: '🎓',
    desc: 'โรงเรียนมัธยมศึกษาที่ใช้ระบบจัดการชั้นเรียนและการเช็คชื่อ',
  },
  {
    key: 'vocational', label: 'ปวช', color: '#A08060',
    count: 68, students: '24,300', rating: '4.8', emoji: '🔧',
    desc: 'วิทยาลัยอาชีวศึกษาที่ใช้ EduFlow บริหารการเข้าเรียนและฝึกงาน',
  },
];

const reviewPool = {
  kinder: [
    { name: 'ครูปิยะ', role: 'ครูอนุบาล 2', rating: 5, product: 'แจ้งเตือน Line', text: 'ผู้ปกครองได้รับ Line แจ้งว่าลูกมาโรงเรียนแล้ว วันไหนขาดก็รู้ทันที ถามว่าพอใจไหม พอใจมากเลยค่ะ', date: 'พ.ค. 2567' },
    { name: 'ครูจิราพร', role: 'หัวหน้าอนุบาล', rating: 5, product: 'ระบบทั้งหมด', text: 'เหมาะกับโรงเรียนเล็กมาก ราคาสมเหตุสมผล ทีมซัพพอร์ตดูแลดีมาก', date: 'เม.ย. 2567' },
  ],
  primary: [
    { name: 'ครูอรวรรณ', role: 'ครูประจำชั้น ป.4', rating: 5, product: 'ระบบเช็คชื่อ', text: 'ใช้ง่ายมาก ประหยัดเวลาได้เยอะ เดิมต้องเรียกชื่อทีละคน ตอนนี้นักเรียนสแกน QR เองได้เลย', date: 'มี.ค. 2567' },
    { name: 'ครูสมชาย', role: 'หัวหน้าฝ่ายวิชาการ', rating: 5, product: 'รายงานผู้ปกครอง', text: 'ผู้ปกครองพอใจมากครับ แจ้งเตือนทันทีเมื่อลูกขาดเรียน ลดการโทรสอบถามได้มาก', date: 'ก.พ. 2567' },
    { name: 'ครูมาลี', role: 'ครูคอมพิวเตอร์', rating: 4, product: 'Dashboard', text: 'หน้าจอสวย ข้อมูลชัดเจน อยากให้เพิ่ม export Excel ได้ด้วยจะดีมาก', date: 'ม.ค. 2567' },
  ],
  secondary: [
    { name: 'ครูณัฐพล', role: 'ครูคณิตศาสตร์ ม.ต้น', rating: 5, product: 'ระบบเช็คชื่อ', text: 'นักเรียนมัธยมชอบสแกน QR มากกว่าให้ครูเรียกชื่อ เร็วกว่าเดิม 3 เท่า', date: 'เม.ย. 2567' },
    { name: 'ครูสุภาพร', role: 'ฝ่ายปกครอง', rating: 5, product: 'รายงานสถิติ', text: 'ตัวเลขสถิติช่วยนำเสนอผู้บริหารได้เลย กราฟสวย ข้อมูลครบถ้วน', date: 'มี.ค. 2567' },
    { name: 'ครูวิชัย', role: 'ครูพลศึกษา', rating: 4, product: 'แอปมือถือ', text: 'ใช้มือถือเช็คชื่อกลางสนามได้เลย ไม่ต้องพกกระดาษ สะดวกมาก', date: 'ก.พ. 2567' },
  ],
  vocational: [
    { name: 'ครูประเสริฐ', role: 'ครูฝ่ายปกครอง ปวช.', rating: 5, product: 'ระบบเช็คชื่อ', text: 'นักเรียน ปวช. มาสายบ่อย ระบบช่วยติดตามและแจ้งเตือนผู้ปกครองได้แบบอัตโนมัติ ลดภาระครูได้มาก', date: 'มี.ค. 2567' },
    { name: 'ครูวันชัย', role: 'หัวหน้าสาขาช่างยนต์', rating: 5, product: 'รายงานสถิติ', text: 'ติดตามการเข้าร่วมฝึกงานได้ด้วย Export PDF ส่งสถานประกอบการได้เลย', date: 'ก.พ. 2567' },
  ],
};

const schoolsData = {
  kinder: [
    { name: 'โรงเรียนอนุบาลสายรุ้ง', province: 'กรุงเทพฯ', students: 180, rating: 5.0, tags: ['แจ้งเตือน Line','เช็คชื่อ'], reviews: 'kinder' },
    { name: 'โรงเรียนอนุบาลดรุณรัตน์', province: 'ภูเก็ต', students: 240, rating: 4.9, tags: ['ระบบครบชุด'], reviews: 'kinder' },
    { name: 'โรงเรียนอนุบาลนครสวรรค์', province: 'นครสวรรค์', students: 310, rating: 4.8, tags: ['แจ้งเตือน SMS','รายงาน'], reviews: 'kinder' },
    { name: 'โรงเรียนอนุบาลหมู่บ้านเด็ก', province: 'เชียงใหม่', students: 145, rating: 5.0, tags: ['เช็คชื่อ QR'], reviews: 'kinder' },
  ],
  primary: [
    { name: 'โรงเรียนอนุบาลชุมชนบ้านน้ำใส', province: 'เชียงใหม่', students: 420, rating: 4.9, tags: ['เช็คชื่อ QR','แจ้งเตือน Line','รายงาน'], reviews: 'primary' },
    { name: 'โรงเรียนวัดสระแก้ว (รัฐประชานุเคราะห์)', province: 'กรุงเทพฯ', students: 680, rating: 4.8, tags: ['เช็คชื่อ QR','Dashboard'], reviews: 'primary' },
    { name: 'โรงเรียนบ้านสันทราย', province: 'เชียงราย', students: 210, rating: 4.7, tags: ['แจ้งเตือน SMS','รายงาน'], reviews: 'primary' },
    { name: 'โรงเรียนชุมชนวัดท่าสะอ้าน', province: 'ฉะเชิงเทรา', students: 390, rating: 5.0, tags: ['ระบบครบชุด'], reviews: 'primary' },
    { name: 'โรงเรียนอนุบาลเมืองพะเยา', province: 'พะเยา', students: 540, rating: 4.8, tags: ['เช็คชื่อ QR','Dashboard'], reviews: 'primary' },
    { name: 'โรงเรียนวัดบัวขวัญ', province: 'นนทบุรี', students: 730, rating: 4.6, tags: ['แจ้งเตือน Line'], reviews: 'primary' },
  ],
  secondary: [
    { name: 'โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า', province: 'กรุงเทพฯ', students: 2100, rating: 4.9, tags: ['เช็คชื่อ QR','รายงานสถิติ','API'], reviews: 'secondary' },
    { name: 'โรงเรียนสวนกุหลาบวิทยาลัย นนทบุรี', province: 'นนทบุรี', students: 1850, rating: 4.8, tags: ['Dashboard','แจ้งเตือน'], reviews: 'secondary' },
    { name: 'โรงเรียนเทพศิรินทร์ร่มเกล้า', province: 'กรุงเทพฯ', students: 1640, rating: 4.7, tags: ['ระบบครบชุด'], reviews: 'secondary' },
    { name: 'โรงเรียนยุพราชวิทยาลัย', province: 'เชียงใหม่', students: 2300, rating: 5.0, tags: ['เช็คชื่อ QR','API Connect'], reviews: 'secondary' },
    { name: 'โรงเรียนขอนแก่นวิทยายน', province: 'ขอนแก่น', students: 1920, rating: 4.8, tags: ['รายงานผู้ปกครอง'], reviews: 'secondary' },
  ],
  vocational: [
    { name: 'วิทยาลัยเทคนิคกรุงเทพ', province: 'กรุงเทพฯ', students: 3200, rating: 4.9, tags: ['เช็คชื่อ QR','รายงานฝึกงาน','Dashboard'], reviews: 'vocational' },
    { name: 'วิทยาลัยอาชีวศึกษาเชียงใหม่', province: 'เชียงใหม่', students: 2800, rating: 4.8, tags: ['เช็คชื่อ QR','แจ้งเตือน'], reviews: 'vocational' },
    { name: 'วิทยาลัยเทคนิคขอนแก่น', province: 'ขอนแก่น', students: 2400, rating: 4.8, tags: ['ระบบครบชุด'], reviews: 'vocational' },
    { name: 'วิทยาลัยการอาชีพบางแก้ว', province: 'พัทลุง', students: 980, rating: 4.7, tags: ['เช็คชื่อ QR','รายงาน'], reviews: 'vocational' },
  ],
};

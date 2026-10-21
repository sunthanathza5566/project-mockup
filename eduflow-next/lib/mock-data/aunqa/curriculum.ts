// หลักสูตรเดโม่ prog-demo-cs (ข้อมูลสมมติ) — Phase B / M4
// จงใจ: PLO6 ไม่มีวิชารับผิดชอบเลย, PLO4 มี CLO แมปแต่ไม่มีวิธีประเมินที่วัด CLO เหล่านั้น
const P = 'prog-demo-cs';

export interface DemoPlo { id: string; programmeId: string; code: string; textTh: string; textEn: string; type: 'generic' | 'specific'; bloomLevel: number }
export interface DemoCourse {
  id: string; programmeId: string; code: string; nameTh: string; nameEn: string; credits: number; year: number; semester: number;
  category: string; isElective: boolean; track?: string; prerequisiteIds: string[];
}
export interface DemoClo { id: string; courseId: string; code: string; textTh: string; bloomLevel: number }
export interface DemoCloPloMap { cloId: string; ploId: string; level: 'I' | 'R' | 'M' }
export interface DemoCourseMethod { id: string; courseId: string; kind: 'teaching' | 'assessment'; method: string; cloIds: string[] }

export const DEMO_PLOS: DemoPlo[] = [
  { id: 'plo-1', programmeId: P, code: 'PLO1', textTh: 'อธิบายหลักการพื้นฐานของวิทยาการคอมพิวเตอร์และคณิตศาสตร์ที่เกี่ยวข้อง', textEn: 'Explain fundamental principles of computer science and related mathematics', type: 'specific', bloomLevel: 2 },
  { id: 'plo-2', programmeId: P, code: 'PLO2', textTh: 'วิเคราะห์และออกแบบอัลกอริทึมและโครงสร้างข้อมูลให้เหมาะสมกับปัญหา', textEn: 'Analyse and design algorithms and data structures appropriate to a problem', type: 'specific', bloomLevel: 4 },
  { id: 'plo-3', programmeId: P, code: 'PLO3', textTh: 'พัฒนาซอฟต์แวร์ตามกระบวนการวิศวกรรมซอฟต์แวร์อย่างเป็นระบบ', textEn: 'Develop software following a systematic software engineering process', type: 'specific', bloomLevel: 6 },
  { id: 'plo-4', programmeId: P, code: 'PLO4', textTh: 'วิเคราะห์ข้อมูลและสร้างแบบจำลองเพื่อสนับสนุนการตัดสินใจ', textEn: 'Analyse data and build models to support decision making', type: 'specific', bloomLevel: 4 },
  { id: 'plo-5', programmeId: P, code: 'PLO5', textTh: 'ทำงานเป็นทีมและสื่อสารทั้งภาษาไทยและอังกฤษได้อย่างมีประสิทธิภาพ', textEn: 'Work in teams and communicate effectively in Thai and English', type: 'generic', bloomLevel: 3 },
  { id: 'plo-6', programmeId: P, code: 'PLO6', textTh: 'ประเมินผลกระทบด้านจริยธรรมและความรับผิดชอบต่อสังคมของงานด้านคอมพิวเตอร์', textEn: 'Evaluate ethical and societal impacts of computing work', type: 'generic', bloomLevel: 5 },
];

type C = [code: string, nameTh: string, nameEn: string, credits: number, year: number, sem: number, category: string, prereq: string[], track?: string];
const COURSE_ROWS: C[] = [
  ['CS101', 'การเขียนโปรแกรมเบื้องต้น', 'Introduction to Programming', 3, 1, 1, 'วิชาเอกบังคับ', []],
  ['CS102', 'คณิตศาสตร์ดิสครีต', 'Discrete Mathematics', 3, 1, 1, 'วิชาแกน', []],
  ['CS103', 'โครงสร้างข้อมูล', 'Data Structures', 3, 1, 2, 'วิชาเอกบังคับ', ['CS101']],
  ['CS201', 'การออกแบบและวิเคราะห์อัลกอริทึม', 'Design and Analysis of Algorithms', 3, 2, 1, 'วิชาเอกบังคับ', ['CS103', 'CS102']],
  ['CS202', 'ระบบฐานข้อมูล', 'Database Systems', 3, 2, 1, 'วิชาเอกบังคับ', ['CS103']],
  ['CS203', 'สถาปัตยกรรมคอมพิวเตอร์', 'Computer Organization', 3, 2, 2, 'วิชาเอกบังคับ', ['CS101']],
  ['CS204', 'วิศวกรรมซอฟต์แวร์', 'Software Engineering', 3, 2, 2, 'วิชาเอกบังคับ', ['CS103']],
  ['CS301', 'ระบบปฏิบัติการ', 'Operating Systems', 3, 3, 1, 'วิชาเอกบังคับ', ['CS203']],
  ['CS302', 'พื้นฐานวิทยาการข้อมูล', 'Data Science Fundamentals', 3, 3, 1, 'วิชาเอกบังคับ', ['CS202']],
  ['CS303', 'โครงงานซอฟต์แวร์', 'Software Project', 3, 3, 2, 'วิชาเอกบังคับ', ['CS204']],
  ['CS401', 'สหกิจศึกษา/โครงงานพิเศษ', 'Capstone Project', 6, 4, 1, 'วิชาเอกบังคับ', ['CS303']],
  ['CS4E1', 'การเรียนรู้ของเครื่อง', 'Machine Learning', 3, 4, 1, 'วิชาเอกเลือก', ['CS302'], 'AI'],
];
export const DEMO_COURSES: DemoCourse[] = COURSE_ROWS.map(([code, nameTh, nameEn, credits, year, semester, category, pre, track]) => ({
  id: `course-${code}`, programmeId: P, code, nameTh, nameEn, credits, year, semester, category,
  isElective: !!track, ...(track ? { track } : {}), prerequisiteIds: pre.map(p => `course-${p}`),
}));

// [courseCode, n, textTh, bloom, ploNo, level]
type L = [string, number, string, number, number, 'I' | 'R' | 'M'];
const CLO_ROWS: L[] = [
  ['CS101', 1, 'เขียนโปรแกรมแก้ปัญหาพื้นฐานด้วยภาษาโปรแกรมสมัยใหม่ได้', 3, 1, 'I'],
  ['CS101', 2, 'ทำงานร่วมกันเป็นคู่ในการเขียนและทดสอบโปรแกรม', 3, 5, 'I'],
  ['CS102', 1, 'อธิบายตรรกศาสตร์ เซต และความสัมพันธ์ได้ถูกต้อง', 2, 1, 'I'],
  ['CS102', 2, 'พิสูจน์ข้อความทางคณิตศาสตร์อย่างง่ายได้', 3, 1, 'R'],
  ['CS103', 1, 'เลือกและใช้โครงสร้างข้อมูลที่เหมาะสมกับปัญหา', 3, 2, 'I'],
  ['CS103', 2, 'อธิบายหลักการทำงานของโครงสร้างข้อมูลหลัก', 2, 1, 'R'],
  ['CS201', 1, 'วิเคราะห์ความซับซ้อนของอัลกอริทึมได้', 4, 2, 'R'],
  ['CS201', 2, 'ออกแบบอัลกอริทึมด้วยเทคนิคที่เหมาะสม', 6, 2, 'M'],
  ['CS202', 1, 'ออกแบบฐานข้อมูลเชิงสัมพันธ์ตามหลักการ normalization', 6, 3, 'I'],
  ['CS202', 2, 'เขียนคำสั่ง SQL เพื่อสืบค้นและจัดการข้อมูล', 3, 1, 'R'],
  ['CS203', 1, 'อธิบายองค์ประกอบและการทำงานของสถาปัตยกรรมคอมพิวเตอร์', 2, 1, 'R'],
  ['CS204', 1, 'วิเคราะห์ความต้องการและออกแบบซอฟต์แวร์ตามกระบวนการ', 4, 3, 'R'],
  ['CS204', 2, 'ทำงานเป็นทีมตามกระบวนการ agile', 3, 5, 'R'],
  ['CS301', 1, 'อธิบายและเปรียบเทียบกลไกจัดการทรัพยากรของระบบปฏิบัติการ', 4, 1, 'R'],
  ['CS302', 1, 'เตรียมและสำรวจข้อมูลเพื่อวิเคราะห์เบื้องต้น', 3, 4, 'I'],
  ['CS302', 2, 'สร้างแบบจำลองเชิงสถิติอย่างง่ายและตีความผล', 4, 4, 'R'],
  ['CS302', 3, 'เลือกโครงสร้างข้อมูลและอัลกอริทึมสำหรับข้อมูลขนาดใหญ่', 4, 2, 'R'],
  ['CS303', 1, 'พัฒนาซอฟต์แวร์เป็นทีมครบวงจรตามกระบวนการวิศวกรรม', 6, 3, 'R'],
  ['CS303', 2, 'นำเสนอผลงานเป็นภาษาอังกฤษและภาษาไทย', 3, 5, 'R'],
  ['CS401', 1, 'บูรณาการความรู้พัฒนาระบบซอฟต์แวร์ที่ใช้งานได้จริง', 6, 3, 'M'],
  ['CS401', 2, 'สื่อสารและทำงานเป็นทีมกับผู้ใช้งานจริงอย่างมืออาชีพ', 4, 5, 'M'],
  ['CS4E1', 1, 'สร้างและประเมินแบบจำลองการเรียนรู้ของเครื่อง', 6, 4, 'M'],
  ['CS4E1', 2, 'พัฒนาซอฟต์แวร์ที่ฝังแบบจำลองใช้งานได้', 6, 3, 'M'],
];
export const DEMO_CLOS: DemoClo[] = CLO_ROWS.map(([c, n, textTh, bloomLevel]) => ({ id: `clo-${c}-${n}`, courseId: `course-${c}`, code: `${c}-CLO${n}`, textTh, bloomLevel }));
export const DEMO_CLO_PLO_MAP: DemoCloPloMap[] = CLO_ROWS.map(([c, n, , , plo, level]) => ({ cloId: `clo-${c}-${n}`, ploId: `plo-${plo}`, level }));

// ไม่มีวิธีประเมินที่วัด CLO ของ PLO4 (CS302-1, CS302-2, CS4E1-1) — จงใจ
const allClos = (c: string) => CLO_ROWS.filter(r => r[0] === c).map(r => `clo-${c}-${r[1]}`);
const M: [string, 'teaching' | 'assessment', string, string[]][] = [
  ['CS101', 'teaching', 'บรรยายและปฏิบัติการเขียนโปรแกรม', allClos('CS101')], ['CS101', 'assessment', 'สอบปฏิบัติและแบบฝึกหัดรายสัปดาห์', allClos('CS101')],
  ['CS102', 'teaching', 'บรรยายและแก้โจทย์ในชั้นเรียน', allClos('CS102')], ['CS102', 'assessment', 'สอบกลางภาค/ปลายภาค', allClos('CS102')],
  ['CS103', 'teaching', 'บรรยายและ lab', allClos('CS103')], ['CS103', 'assessment', 'สอบข้อเขียนและโปรแกรมประยุกต์', allClos('CS103')],
  ['CS201', 'teaching', 'บรรยายและการแก้ปัญหาเป็นกลุ่ม', allClos('CS201')], ['CS201', 'assessment', 'สอบข้อเขียนและงานออกแบบอัลกอริทึม', allClos('CS201')],
  ['CS202', 'teaching', 'บรรยายและ lab ฐานข้อมูล', allClos('CS202')], ['CS202', 'assessment', 'สอบปฏิบัติ SQL และโครงงานออกแบบฐานข้อมูล', allClos('CS202')],
  ['CS203', 'teaching', 'บรรยาย', allClos('CS203')], ['CS203', 'assessment', 'สอบข้อเขียน', allClos('CS203')],
  ['CS204', 'teaching', 'เรียนรู้เชิงรุกแบบ project-based', allClos('CS204')], ['CS204', 'assessment', 'rubric โครงงานและประเมินเพื่อน', allClos('CS204')],
  ['CS301', 'teaching', 'บรรยายและ lab', allClos('CS301')], ['CS301', 'assessment', 'สอบข้อเขียน', allClos('CS301')],
  ['CS302', 'teaching', 'workshop วิเคราะห์ข้อมูลจริง', allClos('CS302')], ['CS302', 'assessment', 'สอบข้อเขียนเรื่องโครงสร้างข้อมูลสำหรับข้อมูลขนาดใหญ่', ['clo-CS302-3']],
  ['CS303', 'teaching', 'project-based learning เป็นทีม 4 คน', allClos('CS303')], ['CS303', 'assessment', 'rubric โครงงาน ส่งงาน 4 ครั้ง และนำเสนอ', allClos('CS303')],
  ['CS401', 'teaching', 'ฝึกปฏิบัติกับผู้ใช้งานจริงและ mentoring', allClos('CS401')], ['CS401', 'assessment', 'รายงานและสอบนำเสนอต่อคณะกรรมการ', allClos('CS401')],
  ['CS4E1', 'teaching', 'บรรยายและ hands-on lab', allClos('CS4E1')], ['CS4E1', 'assessment', 'ประเมินผลงานพัฒนาระบบ', ['clo-CS4E1-2']],
];
export const DEMO_COURSE_METHODS: DemoCourseMethod[] = M.map(([c, kind, method, cloIds], i) => ({ id: `cm-${i + 1}`, courseId: `course-${c}`, kind, method, cloIds }));

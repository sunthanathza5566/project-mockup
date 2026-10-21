// องค์กรและผู้ใช้เดโม่ (สมมติทั้งหมด) — username/password ต้องเป็น a-zA-Z0-9 ยาว 1-8 ตัว (isValidFormat)
// password เป็น plaintext ตามรูปแบบ SEEDED_USERS เดิม (auth upgrade เป็น hash ตอน login)
import type { AppUser, Faculty, Programme, University } from '../../types';

export const DEMO_CYCLE_ID = 'cycle-demo-2569';

export const DEMO_UNIVERSITY: University = {
  id: 'uni-demo',
  nameTh: 'มหาวิทยาลัยตัวอย่างภาคเหนือ',
  nameEn: 'Sample Northern University',
  emailDomain: 'sample-uni.example',
  aiEnabled: true,
};

// มหาวิทยาลัยที่สอง — ไว้ทดสอบการแยก tenant
export const DEMO_UNIVERSITY_2: University = {
  id: 'uni-demo-2',
  nameTh: 'มหาวิทยาลัยทดสอบภาคใต้',
  nameEn: 'Test Southern University',
  emailDomain: 'test-uni.example',
  aiEnabled: false,
};

export const DEMO_FACULTY: Faculty = {
  id: 'fac-demo-sci',
  universityId: DEMO_UNIVERSITY.id,
  nameTh: 'คณะวิทยาศาสตร์และเทคโนโลยีตัวอย่าง',
  nameEn: 'Faculty of Sample Science and Technology',
};

export const DEMO_PROGRAMMES: Programme[] = [
  {
    id: 'prog-demo-cs',
    universityId: DEMO_UNIVERSITY.id,
    facultyId: DEMO_FACULTY.id,
    code: 'CS-B-69',
    nameTh: 'วิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (สมมติ)',
    nameEn: 'Bachelor of Science in Computer Science (fictional)',
    degreeLevel: 'bachelor',
    curriculumYear: 2565,
  },
  {
    id: 'prog-demo-ds',
    universityId: DEMO_UNIVERSITY.id,
    facultyId: DEMO_FACULTY.id,
    code: 'DS-M-69',
    nameTh: 'วิทยาศาสตรมหาบัณฑิต สาขาวิชาวิทยาการข้อมูล (สมมติ)',
    nameEn: 'Master of Science in Data Science (fictional)',
    degreeLevel: 'master',
    curriculumYear: 2566,
  },
];

const U = DEMO_UNIVERSITY.id;
const D = DEMO_UNIVERSITY.emailDomain;

export const DEMO_USERS: AppUser[] = [
  {
    id: 'u-super', username: 'sadmin', password: 'demo1234', universityId: U,
    email: `super.admin@${D}`, fullName: 'ผู้ดูแลระบบ สมมติ',
    roles: [{ role: 'super_admin', scopeType: 'university', scopeId: '*' }],
  },
  {
    id: 'u-uniadm', username: 'uadmin', password: 'demo1234', universityId: U,
    email: `uni.admin@${D}`, fullName: 'สมศรี ผู้ดูแลมหาวิทยาลัย',
    roles: [{ role: 'uni_admin', scopeType: 'university', scopeId: U }],
  },
  {
    id: 'u-chair', username: 'chair1', password: 'demo1234', universityId: U,
    email: `chair.cs@${D}`, fullName: 'ผศ.ดร.ปรีชา ตัวอย่างดี',
    roles: [{ role: 'programme_chair', scopeType: 'programme', scopeId: 'prog-demo-cs' }],
  },
  {
    id: 'u-staff1', username: 'staff1', password: 'demo1234', universityId: U,
    email: `staff.cs@${D}`, fullName: 'อ.วิภา เขียนรายงาน',
    roles: [{ role: 'programme_staff', scopeType: 'programme', scopeId: 'prog-demo-cs' }],
  },
  {
    id: 'u-lect1', username: 'lect1', password: 'demo1234', universityId: U,
    email: `lecturer1@${D}`, fullName: 'อ.ธนา สอนดี',
    roles: [{ role: 'programme_staff', scopeType: 'programme', scopeId: 'prog-demo-cs' }],
  },
  {
    id: 'u-lect2', username: 'lect2', password: 'demo1234', universityId: U,
    email: `lecturer2@${D}`, fullName: 'อ.มาลี วิจัยเด่น',
    roles: [{ role: 'programme_staff', scopeType: 'programme', scopeId: 'prog-demo-ds' }],
  },
  {
    id: 'u-data', username: 'data1', password: 'demo1234', universityId: U,
    email: `data.staff@${D}`, fullName: 'คุณสุดา เก็บข้อมูล',
    roles: [{ role: 'data_staff', scopeType: 'faculty', scopeId: DEMO_FACULTY.id }],
  },
  {
    id: 'u-fqa', username: 'fqa1', password: 'demo1234', universityId: U,
    email: `faculty.qa@${D}`, fullName: 'ดร.กมล ประกันคุณภาพ',
    roles: [{ role: 'faculty_qa', scopeType: 'faculty', scopeId: DEMO_FACULTY.id }],
  },
  {
    id: 'u-dean', username: 'dean1', password: 'demo1234', universityId: U,
    email: `dean@${D}`, fullName: 'รศ.ดร.สมชาย คณบดีสมมติ',
    roles: [{ role: 'dean', scopeType: 'faculty', scopeId: DEMO_FACULTY.id }],
  },
  {
    id: 'u-assess', username: 'assess1', password: 'demo1234', universityId: U,
    email: 'assessor@external.example', fullName: 'ศ.ดร.วรรณา ผู้ประเมินภายนอก',
    roles: [{ role: 'assessor', scopeType: 'cycle', scopeId: DEMO_CYCLE_ID }],
  },
  // มหาวิทยาลัยที่สอง (ทดสอบข้าม tenant)
  {
    id: 'u-uniadm2', username: 'uadmin2', password: 'demo1234', universityId: DEMO_UNIVERSITY_2.id,
    email: `uni.admin@${DEMO_UNIVERSITY_2.emailDomain}`, fullName: 'สมปอง ผู้ดูแลมหาวิทยาลัยที่สอง',
    roles: [{ role: 'uni_admin', scopeType: 'university', scopeId: DEMO_UNIVERSITY_2.id }],
  },
];

# SYSTEM MAP  (อัปเดต: 2026-10-21, ถึง commit 9e42156)

> ที่มา: อ่านโค้ดจริงโดย code-reader (TASK-0000). path อ้างอิงจาก `eduflow-next/` ยกเว้นระบุอย่างอื่น. ไม่ได้อ่านไฟล์ `.env` (ไม่พบใน git ls-files).
> สถานะระบบ: **ไม่มี backend / DB จริง / middleware / test** — ทุกอย่างเป็น client-side (Next.js 14 App Router, React 18, TypeScript) เก็บใน `localStorage` + mock data. มี `TODO(PostgreSQL)` ทั้งหมด 126 จุดใน `lib/` (`grep TODO lib`).
> dependencies: `next ^14.2`, `react ^18`, `exceljs`, `qrcode` (`package.json:11-15`). scripts: dev/build/start/lint เท่านั้น (ไม่มี test script) (`package.json:5-9`). `next.config.mjs:2` ว่างเปล่า.

## โมดูล — ชื่อ / หน้าที่ / path หลัก

| โมดูล | หน้าที่ | path หลัก |
|---|---|---|
| Landing (หน้าแรก) | หน้าการตลาด + ข่าวสาร (NewsBoard) + hash-scroll | `app/page.tsx:67`, `components/landing/*`, `components/ui/NewsBoard.tsx` |
| Auth UI | ฟอร์ม login/register, loader ตอนเข้า/ออก | `components/auth/{LoginForm,RegisterForm,AuthNav,LoginLoader,LogoutLoader}.tsx` |
| Auth core | users/session/lockout/hash/permissions store | `lib/api/auth.api.ts`, `context/AuthContext.tsx` |
| Permissions | ตรวจสิทธิ์ฝั่ง client (merge กับ default) | `lib/api/permissions.ts:19-45`, `DEFAULT_PERMISSIONS` ที่ `lib/mock-data/index.ts:19` |
| Student portal | dashboard/schedule/homework/grades/shop/topup/library/booking/ebook/tutoring/profile/docs/QR scan | `components/student/StudentLayout.tsx`, `components/student/views/*`, `components/student/AttendanceScanView.tsx` |
| Teacher portal | โครงสร้างวิชาการ, ตารางสอน, QR เช็คชื่อ, การบ้าน, gradebook, ผลประเมิน, ปพ., สื่อ, สอนพิเศษ, โปรไฟล์ | `components/teacher/TeacherLayout.tsx` (nav: `:49-66`), `components/teacher/*` |
| School admin / Parent | หน้า `/dashboard` เดียวแยกตาม role | `components/dashboard/DashboardLayout.tsx`, `AcademicManager.tsx`, `ParentDashboard.tsx` |
| Web admin | KPI, จัดการ user/permission/content/log/academic | `components/admin/*` (`AdminShell.tsx`), `app/admin/**/page.tsx` |
| Academic store | ปีการศึกษา→ชั้น→ห้อง→วิชา→คะแนน→เกรด/GPA, เลื่อนชั้น, seed demo | `lib/api/academic.store.ts` (918 บรรทัด) |
| Schedule store | ตารางสอน (slot), ตรวจชนห้อง/ครู, log | `lib/api/schedule.store.ts` |
| Class resolver | แปลง classId/roomId ↔ นักเรียน | `lib/api/class-resolver.ts:20-76` |
| Assignments store | การบ้าน + submissions + **shared notifications** | `lib/api/assignments.store.ts` |
| Attendance store | QR session / check-in / report | `lib/api/attendance.store.ts` |
| Wallet store | กระเป๋าเงิน นักเรียน (topup/purchase) | `lib/api/wallet.store.ts` |
| Booking / E-book | จองหนังสือห้องสมุด / เช่า e-book | `lib/api/booking.store.ts`, `lib/api/ebook.store.ts` |
| Tutoring store | ครูเปิดสอนพิเศษ / นักเรียนจอง | `lib/api/tutoring.store.ts` |
| อื่น ๆ stores | materials+announcements, feed (ข่าว), ratings, subject-catalog, teacher-profile, assessment, activity log | `lib/api/{materials,feed,ratings,subject-catalog,teacher-profile,assessment}.store.ts`, `activity.log.ts` |
| API facade | re-export `auth/student/admin/teacher` api (store ตัวอื่นถูก import ตรง) | `lib/api/index.ts:11-14` |
| Storage cache | `readJSON/writeJSON` พร้อม cache (ใช้เฉพาะบาง store เช่น academic) | `lib/api/storage-cache.ts:61-82` |
| Mock data | SEEDED_USERS, DEFAULT_PERMISSIONS, โปรไฟล์/ตาราง/ร้านค้า/หนังสือ mock | `lib/mock-data/index.ts` |
| i18n | dict + dom-translate (LangContext) | `lib/i18n/*`, `context/LangContext.tsx` |
| Report docs / Excel | ปพ.1/4/6 + export Excel | `lib/report-docs*.ts`, `lib/utils/excel-export.ts`, `components/teacher/Report*.tsx` |
| Contexts | Auth, Lang, Toast, Dialog | `context/*.tsx`; ซ้อนใน `app/layout.tsx:25-33` |
| Legacy SPA | โปรโตไทป์ HTML เดิม (ไม่เกี่ยวกับ Next) | `index.html` (2276 บรรทัด), `css/styles.css`, `js/{app,auth,data,donut,schools,student,teacher}.js` (~3,900 บรรทัด). `js/auth.js:39-48` seed localStorage คล้ายของใหม่. ไม่ได้ trace ลึก |
| Tooling | caveman mod (Claude), usecase diagram | `.claude/mods/caveman/*`, `CAVEMAN.md`, `eduflow-next/docs/diagrams/*` |

## Routes & Pages — path → page/layout (path:line) → guard/สิทธิ์ที่ต้องมี

Root layout: `app/layout.tsx:14` ห่อ `AuthProvider > LangProvider > ToastProvider > DialogProvider` + `<Toast/>`; โหลด Google Fonts (`:18-22`). **ไม่มี `middleware.ts`** — guard ทุกอันเป็น `useEffect` ฝั่ง client เท่านั้น.

| path | page → component | guard (หลักฐาน) |
|---|---|---|
| `/` | `app/page.tsx:67` → LandingNav/Hero/About/Showcase/NewsBoard/Cta/Footer | public |
| `/login` | `app/login/page.tsx` → `AuthNav` + `LoginForm` (`LoginForm.tsx:47` loginUser; `:51-56` redirect) | public |
| `/register` | `app/register/page.tsx` → `RegisterForm` (`RegisterForm.tsx:34-42`) | public |
| `/schools` | `app/schools/page.tsx:209` (mock ล้วน `:135-139`, query `?level=`) | public |
| `/dashboard` | `app/dashboard/page.tsx` → `DashboardLayout` | `DashboardLayout.tsx:21-29`: ไม่มี session → `/login`; student→`/student`, teacher→`/teacher`, web_admin→`/admin`; render เฉพาะ `school_admin`,`parent` (`:29`) |
| `/student` | `app/student/page.tsx` → `StudentLayout` (state-based tabs ไม่ใช่ route) | `StudentLayout.tsx:81-84`: ไม่ใช่ student → `/dashboard` |
| `/teacher` | `app/teacher/page.tsx` → `TeacherLayout` (`TeacherView` union `:40-43`) | `TeacherLayout.tsx:90-93`: ไม่ใช่ teacher → `/dashboard`; เมนูกรองด้วย `hasPermission(item.perm)` `:165` |
| `/admin` | `app/admin/page.tsx:9` → `AdminShell` + `getSystemStats` | `AdminShell.tsx:25-31`: ไม่ใช่ `web_admin` → `/dashboard` |
| `/admin/users` | `UserManager` (เพิ่ม/ลบ user, topup ตรง `UserManager.tsx:44`) | AdminShell (web_admin) |
| `/admin/permissions` | `PermissionsManager` | AdminShell (web_admin) |
| `/admin/academic` | `AcademicManager adminUsername=session.username` | AdminShell (web_admin) |
| `/admin/content` | `ContentView` (feed/ข่าว) | AdminShell (web_admin) |
| `/admin/logs` | `LogsView` (activity log) | AdminShell (web_admin) |

หมายเหตุ: ไม่มี `app/api/**`, ไม่มี `loading/error/not-found`. ทุกหน้า dashboard `return null` ระหว่าง redirect (ไม่มี SSR guard). `school_admin` และ `parent` ใช้ `/dashboard` เดียวกัน แยกเนื้อหาที่ `DashboardLayout.tsx:51,57`.

## Data Model — interfaces สำคัญ (lib/types.ts), localStorage keys ↔ store ที่เป็นเจ้าของ, field ส่วนบุคคล (PDPA)

### TS interfaces หลัก (`lib/types.ts`)
- `Role` (`:3`) = web_admin | school_admin | teacher | student | parent
- `User` (`:5-20`): username, **password** (hash/plaintext), role, name, **email**, emailVerified, school, code, class, childCode, childName, teacherId, createdAt, seeded
- `Session` (`:22-32`): username, role, name, school, code, childCode, childName, class, loginAt — เก็บ **sessionStorage**
- `Permissions` (`:34-39`): Record ต่อ role (teacher/student/parent/school_admin) — ไม่มี web_admin
- `StudentProfile` (`:45-67`), `TeacherProfile` (`:165-217`), `Assignment`/`TeacherAssignment`/`Submission` (`:99,250,239`), `AttendanceSession/Record/Report` (`:266-305`), `ClassInfo` (`:219`), `Notification` (`:137`), `ShopItem`, `LibraryBook`, `School`
- Interfaces ที่อยู่ใน store (ไม่อยู่ `types.ts`): `AcademicYear/GradeLevel/Classroom/ScoreComponent/Course/ScoreEntry` (`academic.store.ts:29-110`), `ScheduleSlot` (`schedule.store.ts:99`), `StoredAssignment/StoredSubmission` (`assignments.store.ts:22,34`), `WalletTxn/WalletData` (`wallet.store.ts:19-30`), `Reservation/CatalogBook` (`booking.store.ts:18,27`), `EbookRental` (`ebook.store.ts:19`), `TutorOffer/TutorBooking` (`tutoring.store.ts:42,76`), `Material/Announcement` (`materials.store.ts:18,33`), `FeedItem` (`feed.store.ts:27`), `TeacherRating` (`ratings.store.ts:15`)
- ข้อสังเกต: `AttendanceRecord.studentId` ใน types ถูกใช้เก็บ student **code** (`attendance.store.ts:212`); `Submission` (types `:239`) ไม่ตรงกับ `StoredSubmission` (store `:22-31`) — สอง shape คู่ขนาน

### localStorage / sessionStorage keys (de-facto DB)
| key | store เจ้าของ | เนื้อหา (หลักฐาน) |
|---|---|---|
| `eduflow_users` | `auth.api.ts:23` | `User[]` รวม password hash |
| `eduflow_session` (**sessionStorage**) | `auth.api.ts:24,58-76` | `Session` |
| `eduflow_attempts` | `auth.api.ts:25,102-130` | `{[username]:{count,lockUntil}}` (5 ครั้ง/ล็อก 5 นาที `:29-30`) |
| `eduflow_permissions`, `eduflow_perm_v2` | `auth.api.ts:26,167` | `Permissions`; flag migration |
| `eduflow_webadmin_log` | `auth.api.ts:27,138-146` | admins + loginHistory |
| `eduflow_activity_log` | `activity.log.ts:10` | audit log (admin/teacher/system) |
| `eduflow_academic` | `academic.store.ts:26` | `{years,gradeLevels,classrooms,courses,scores,roster...}` |
| `eduflow_schedule`, `eduflow_schedule_log`, `eduflow_lunch_config` | `schedule.store.ts:25,26,56` | slots / log / พักเที่ยง |
| `eduflow_subject_catalog` | `subject-catalog.store.ts:20` | คลังวิชา (หน่วยกิต) |
| `eduflow_assessments` | `assessment.store.ts:11` | ผลประเมินคุณลักษณะ/กิจกรรม ต่อ studentCode |
| `eduflow_assignments` | `assignments.store.ts:18` | การบ้าน + submissions |
| `eduflow_shared_notifs` | `assignments.store.ts:19,127-137` | แจ้งเตือนทุก audience รวม (cap 50 รายการ `:134`) |
| `eduflow_attendance` | `attendance.store.ts:20` | `{sessions,records,reports}` |
| `eduflow_wallet` | `wallet.store.ts:15` | `{balances[code],txns[code]}` (เก็บ 50 รายการล่าสุด `:54`) |
| `eduflow_booking`, `eduflow_ebook_rentals` | `booking.store.ts:16`, `ebook.store.ts:17` | catalog+reservations / rentals |
| `eduflow_tutor_offers`, `eduflow_tutor_bookings` | `tutoring.store.ts:24-25` | สอนพิเศษ |
| `eduflow_materials`, `eduflow_feed_v4` | `materials.store.ts:14`, `feed.store.ts:12` | สื่อ+ประกาศ / ข่าว (รูปเป็น data URL `feed.store.ts:159`) |
| `eduflow_teacher_ratings`, `eduflow_rated_periods` | `ratings.store.ts:12-13` | คะแนนครู (ไม่ผูกตัวตน) |
| `eduflow_teacher_profiles` | `teacher-profile.store.ts:15` | ประวัติครูเต็ม |
| `eduflow_doc_settings` | `components/teacher/DocSettingsView.tsx:14` | ตั้งค่าเอกสาร ปพ. |
| `eduflow_lang_pages` | `context/LangContext.tsx:19` | ภาษาตามหน้า |
| `eduflow_lib_done` | `student.api.ts:228` | หนังสือที่อ่านแล้ว |
| `eduflow_avatar_<studentId>` | `student/views/ProfileView.tsx:18` | รูปโปรไฟล์ (base64) |

### Notification audience (ใน `eduflow_shared_notifs`)
`student:<code>`, `teacher:<TEACHERID uppercase>`, `parent:<childCode>` — id สร้างด้วย `nextNotifId()` (`assignments.store.ts:122-126`).

### field ข้อมูลส่วนบุคคล (PDPA)
- **User**: `password` (hash), `email`, `name`, `childCode/childName` (`types.ts:5-20`)
- **StudentProfile**: `dob`, `bloodType` (สุขภาพ), `address`, `phone`, `email`, `lineId`, `religion`, `nationality`, **`citizenId`** (`:63`), ข้อมูลบิดา/มารดา (name/phone/occupation), `emergencyContact` (`:45-67`)
- **TeacherProfile**: `citizenId`, `dob`, `addressCurrent/Registered`, `phone`, `email`, `lineId`, `emergency*`, **สุขภาพ** `congenitalDisease/drugAllergy/foodAllergy/healthNote`, `maritalStatus`, `religion`, `teacherLicense` (`types.ts:165-217`)
- **Mock hardcode เลขบัตร ปชช.**: `STUDENT_PROFILE_MOCK.citizenId` (`mock-data/index.ts:127`), `STUDENT_CITIZEN_REGISTRY` (`:138-142`) — ถูก bundle ลง client ทุกคน
- ข้อมูลผลการเรียน/การเข้าเรียน/ยอดเงิน/ธุรกรรม ของเด็ก (ผูกด้วย student code) ใน `eduflow_academic`, `eduflow_attendance`, `eduflow_wallet`
- ข้อมูลเด็ก (ผู้เยาว์) → ความเสี่ยง PDPA สูงขึ้น

## Flow สำคัญ — ทีละข้อ (ใช้เป็นต้นแบบ sequence/activity diagram)

**1. Login**
1. `LoginForm.tsx:47` เรียก `loginUser(username,password)` (`auth.api.ts:193`)
2. ตรวจ format `^[a-zA-Z0-9]{1,8}$` ทั้ง username/password (`:79-81,194`) → `error:'format'`
3. ตรวจ lock (`getLockUntil` `:113`) → `locked`
4. ค้น user ใน `eduflow_users`; `verifyPassword` (SHA-256 + salt คงที่ `eduflow::`, `:88-98`; รองรับ plaintext เก่า)
5. ผิด → `recordFail` (ครบ 5 → ล็อก 5 นาที `:118-124`) → `invalid`+remaining
6. `emailVerified===false` → `unverified` (`:210`) → UI แสดงปุ่มยืนยัน (`LoginForm.tsx:60,125`)
7. ถูก: upgrade plaintext→hash (`:213-217`), `clearAttempts`, `setSession` (sessionStorage), ถ้า web_admin → `logWebAdminLogin` (`:221`)
8. UI: loader 1.6 วิ → `refresh()` → `router.push` student→`/student`, teacher→`/teacher`, อื่น ๆ→`/dashboard` (`LoginForm.tsx:51-56`)

**Logout**: `AuthContext.logout` (`:331-346`): แสดง `LogoutLoader` 1.3 วิ → `router.push('/')` → 450ms → `clearSession()`.
**Boot**: `AuthProvider` useEffect (`AuthContext.tsx:348-359`) เรียก `initAuth()` + seed demo ทั้งหมด (academics/cohort/fullGrades/rosterGrades/assessments) ทุกครั้งที่โหลดแอป แล้ว `refresh()`.

**2. Register + email verify**
1. `RegisterForm.tsx:34` → `registerUser` (`auth.api.ts:237`): role ต้องอยู่ใน `['teacher','student','parent','school_admin']` (`:244`, บล็อก web_admin); validate ชื่อ/อีเมล/username/password(1–8 ตัว)/confirm/ซ้ำ username+email
2. push user ใหม่ `emailVerified:false`, password hash (`:255-265`)
3. **ไม่มีการส่งอีเมลจริง**: `RegisterForm.tsx:40` เรียก `verifyEmail(username)` ทันที (จำลองการกดลิงก์ `auth.api.ts:274`) → `/login` (`:42`). ปุ่มยืนยันใน LoginForm ก็เรียก `verifyEmail` ตรง ๆ (`:125`) — ใครก็ยืนยันบัญชีใครก็ได้ที่รู้ username
4. ผู้ใช้ที่สมัครเองไม่มี `code`/`class`/`childCode` → นักเรียนใหม่ไม่ผูกห้อง/รหัส; ต้องให้ admin เพิ่ม (`addUserAccount` `admin.api.ts:18`)

**3. ตารางสอน → ห้อง → นักเรียน**
1. admin สร้างปีการศึกษา/ชั้น/ห้อง (`createAcademicYear :511`, `createGradeLevel :559`, `createClassroom :588`) ผ่าน `AcademicManager` (school_admin ที่ `/dashboard`, web_admin ที่ `/admin/academic`, ครูที่มีสิทธิ์ `manageAcademic` ใน `AcademicStructureView.tsx:27`)
2. ครูที่มี `manageTeachSchedule` เพิ่มคาบ `addSlot` (`schedule.store.ts:409`): เช็คสิทธิ์ `canManageSchedule` (`:223`) → หา classroom context → `findConflict` (ห้อง/ครูชนกัน `:349`) → เก็บ slot + `writeLog`
3. ครูเปิด Gradebook: `syncTeacherCourses(classroomId, classes, teacher)` (`GradebookView.tsx:58` → `academic.store.ts:639`) สร้าง `Course` ตามตารางสอน (สัดส่วนมาตรฐาน เก็บ60/กลาง20/ปลาย20, หน่วยกิตจากคลังวิชา)
4. นักเรียน ↔ ห้อง: `addStudentToClassroom` (`:726`), `getClassroomStudents` (`:699`); `getStudentRoomId`/`getStudentClassIds` (`class-resolver.ts:52-64`) วนทุกห้อง (O(n)) หา classId ของนักเรียน → ใช้กรอง ตารางเรียน/การบ้าน/สื่อ
5. `getTeacherClasses` (`teacher.api.ts:40`) รวม mock + ตารางจริง; ครู demo แยกด้วย `isDemoTeacher` (`:27`)

**4. บันทึกคะแนน → เกรด/GPA**
1. `GradebookView.tsx:82` `saveScores(courseId, next)` ทุกครั้งที่แก้ตัวเลข (auto-save) — ตรวจ `canManageScores` (`academic.store.ts:487`): web_admin ผ่านเสมอ; teacher ต้องเป็น `ownerUsername` (หรือชื่อตรงสำหรับ legacy); อื่น ๆ ปฏิเสธ
2. `calcTotal` (รวมเฉพาะหัวข้อที่ไม่ `excludeFromTotal` `:778`) → `calcPercent` (`:793`) → `calcGrade` ตามเกณฑ์ สพฐ. 80=4 … 50=1, <50=0 (`:818-828`); `resolveGrade` (`:806`) ให้สัญลักษณ์ผ/มผ/ร/มส/ขส/ขร มาก่อน, วิชา `gradingMode:'symbol'` → '—'
3. `getStudentGrades(code)` (`:872`) รวมทุก course ที่นักเรียนมี entry → `StudentGradeRow` (มี credit)
4. `calcGPA(rows)` (`:905`) = Σ(เกรด×หน่วยกิต)/Σหน่วยกิต เฉพาะวิชาคิดเกรด; หน่วยกิตไม่พบ→1.0
5. แสดงผลที่ `student/views/GradesView.tsx:23-26`, `dashboard/ParentDashboard.tsx:52,73`, `StudentDocsView.tsx:27`; เอกสาร ปพ. ที่ `teacher/Report*`, export Excel `lib/utils/excel-export.ts`
6. ผลประเมินแยก `assessment.store.ts` (`saveAssessment :44`)

**5. Wallet topup / shop**
- Topup ผู้ปกครอง: `ParentDashboard.tsx:58-67` `startPromptPay` → แสดง QR (จำลอง) → `simulatePaid` setTimeout → `addWalletFunds(childCode, amt, 'topup-promptpay', ...)` (`wallet.store.ts:62`) → อัปเดต balance+txn → `pushSharedNotification('student:<code>')`. **ไม่มี payment gateway จริง; ไม่มีการตรวจ role ใน addWalletFunds**
- Topup web admin: `UserManager.tsx:44` → `adminDirectTopup` (`wallet.store.ts:86`) ตรวจ citizenId+ชื่อกับ `STUDENT_CITIZEN_REGISTRY` (mock 3 รายการ) → `addWalletFunds(...'topup-admin')` + `logActivity`
- Shop: `ShopView.tsx:77` `placeOrder` (`student.api.ts:205`) → `deductWalletFunds` (`wallet.store.ts:75`): ยอดไม่พอ → `{ok:false}` ไม่หัก. ไม่มีตาราง orders. สินค้ามาจาก `SHOP_ITEMS_MOCK`.
- seed: นักเรียน `10021` มียอด 250 (`wallet.store.ts:36-41`)

**6. Homework submit**
1. ครู `createAssignmentStore` (`assignments.store.ts:166`) → `eduflow_assignments` (ผูก classId; มี `notifyClass` ส่งแจ้งเตือนนักเรียนทั้งห้อง ตามคอมเมนต์ `:117`)
2. นักเรียน `HomeworkView.tsx:84` `submitAssignment` → `submitAssignmentStore` (`:272`): เก็บ submission (ไฟล์เก็บแค่ชื่อ/ขนาด `fileName/fileSize` — **ไม่มีตัวไฟล์จริง**), push แจ้งเตือน `teacher:<id>` ชนิด `assignment_submitted`
3. ครูตรวจ `gradeSubmissionStore` (`:192`) → status `graded` + แจ้งเตือน `student:<code>` ชนิด `grade`
4. นักเรียนเห็นรายการจาก `getStudentAssignmentsStore` (`:240`) ผสาน `STUDENT_ASSIGNMENTS_MOCK` สำหรับบัญชี demo (`student.api.ts:155`)

**7. Attendance QR**
1. ครู `AttendanceView.tsx:59` `createAttendanceSession` (`attendance.store.ts:55`): qrCode = `ATT-<base36 time>-<Math.random 5 ตัว>`, อายุ 15 นาที (`:22`); วาด QR ด้วยไลบรารี `qrcode` (`AttendanceView.tsx:51`)
2. นักเรียน `AttendanceScanView.tsx:26-33`: **พิมพ์รหัส** (input) → `validateQR` (`:149`) → `checkIn(sessionId, code, name)` (`:200`): กัน expired/duplicate; ≤10 นาทีแรก=on-time else late (`:23,211`)
3. push แจ้งเตือน `parent:<studentCode>` (`:219-225`)
4. ครู `submitSessionReport` (`:99`): สรุป present/late/absent (absent = total − records) → `AttendanceReport` + แจ้งเตือนครู
5. ฝั่งนักเรียน `getStudentAttendance` (`student.api.ts:168`) overlay record จริงทับ mock

**8. Booking / E-book**
- จองหนังสือห้องสมุด: `BookingView.tsx:46` → `reserveBook` (`booking.store.ts:95`): ready ถ้า `availableCopies>0` else waiting (คิว) + แจ้งเตือน; `cancelReservation`, `queuePosition`
- เช่า e-book: `EbookView.tsx:72` → `rentEbook` (`ebook.store.ts:85`): ไม่ซ้ำถ้ายัง active, `expiresAt = now+days`, **ไม่คิดเงิน/ไม่ผ่าน wallet**; `EbookView` refresh ทุก 30 วิ (`:63`); มี rank ผู้อ่าน (`READER_RANKS :44`)
- Tutoring: ครู `createOffer` (`tutoring.store.ts:129`, perm `offerTutoring`), นักเรียน `bookTutoring` (`:198`, perm `bookTutoring` ตรวจที่ `student/views/TutoringView.tsx:29`)

**9. Notifications**
- แหล่ง: `pushSharedNotification(audience,type,title,body)` (`assignments.store.ts:127`) — เรียกจาก wallet, attendance, ebook, booking, assignments
- อ่าน: student `getNotifications` (`student.api.ts:233`: shared + mock เฉพาะ demo, TTL 3 วัน), teacher `getTeacherNotifications` (`teacher.api.ts:174`), parent `getSharedNotifications('parent:<childCode>')` (`ParentDashboard.tsx:53`)
- Real-time: ฟัง `window 'storage'` + `'focus'` ใน `StudentLayout.tsx:157-165` และ `TeacherLayout.tsx:124-132` (ข้ามแท็บเท่านั้น; ไม่มี websocket). อ่านแล้ว `markSharedNotificationRead` (`:144`).
- store เดียวเก็บทุก audience — ผู้ใช้ที่ใช้เครื่องเดียวกันเห็น data ของกัน (ผ่าน devtools)

## บทบาทผู้ใช้และสิทธิ์ — role → หน้า → permission keys

กลไก: `hasPermission(key, role?)` (`permissions.ts:29-36`): web_admin ผ่านทุกอย่าง; role อื่นอ่าน `eduflow_permissions` merge กับ `DEFAULT_PERMISSIONS` (`mock-data/index.ts:19-43`). web_admin แก้ผ่าน `/admin/permissions` → `updatePermission` (`admin.api.ts:50`, log ลง activity). `requirePermission` (`permissions.ts:39`) **ไม่มีผู้เรียกใช้ในโค้ด** (grep ไม่พบ).

| role | หน้า | permission keys (ค่า default) | บังคับใช้จริงที่ไหน |
|---|---|---|---|
| web_admin | `/admin/*` | ทุกอย่าง (bypass) | `AdminShell.tsx:28`; `canManageScores` bypass (`academic.store.ts:491`) |
| school_admin | `/dashboard` (AcademicManager + SchoolAdminContent) | manageTeachers✔ manageStudents✔ manageParents✘ manageAcademic✔ viewAllReports✔ exportData✔ broadcast✔ viewLogs✘ viewTeachSchedule✔ manageTeachSchedule✔ | แทบไม่ได้บังคับใน UI (grep `hasPermission` ไม่พบใน DashboardLayout) — เนื้อหาใช้ role อย่างเดียว; `schedule.store` ใช้ viewTeachSchedule/manageTeachSchedule (`:219,227`) |
| teacher | `/teacher` (15 view, `TeacherView`) | attendanceQR, editAttendance, viewReports, assignments, gradebook, gradeExport, materials, announcements, exportData, viewTeachSchedule, manageTeachSchedule, offerTutoring, manageSubjects, manageAcademic (ทั้งหมด ✔) | เมนู `TeacherLayout.tsx:165`; ปุ่มด่วน `TeacherOverview.tsx:83,270`; `AcademicStructureView.tsx:27`; `TutoringView.tsx:34`; store: `canManageSubjects` (`subject-catalog.store.ts:86`), `canManageSchedule`, `canManageScores` (ตามความเป็นเจ้าของวิชา) |
| student | `/student` (tabs: dashboard/schedule/homework/grades/shop/topup/library/booking/ebook/tutoring/profile/docs/QR) | checkin, viewSchedule, submitHomework, viewGrades, downloadReports, shop, library, rateTeacher, viewOwnHistory, bookTutoring (✔ ทั้งหมด) | **บังคับจริงเฉพาะ `bookTutoring`** (`student/views/TutoringView.tsx:29`); key อื่นของ student เป็นแค่ label ใน UI admin |
| parent | `/dashboard` → `ParentDashboard` (เกรด+GPA, wallet topup, แจ้งเตือน) | viewChildStatus✔ viewChildGrades✔ viewHistory✔ notifications✔ contactTeacher✔ realtimeTracking✘ | **ไม่ได้บังคับ** (ไม่มี hasPermission ใน ParentDashboard); ข้อมูลลูกอ้างจาก `session.childCode` (`DashboardLayout.tsx:60`) |

ข้อสังเกต: `teacher.editAttendance`, `announcements`, `exportData`, ฯลฯ ถูกนิยามแต่ผู้ตรวจในโค้ดที่ grep ได้มีเพียงรายการที่ระบุในคอลัมน์ "บังคับใช้จริง" (ผ่าน `hasPermission` + nav perm: manageAcademic, manageSubjects, manageTeachSchedule, viewTeachSchedule, gradebook, gradeExport, attendanceQR, viewReports, assignments, materials, offerTutoring).

## External services / AI module

- **ไม่มี AI module** และไม่มีการเรียก API ภายนอกใดในโค้ด (grep `fetch(`, openai, anthropic ใน `lib components app context` ไม่พบ)
- ภายนอกเพียง: Google Fonts (`app/layout.tsx:18-22`); ไลบรารี client `qrcode` (QR เช็คชื่อ), `exceljs` (export `lib/utils/excel-export.ts`)
- จำลอง/ยังไม่ต่อ: ส่งอีเมลยืนยัน (`auth.api.ts:269-273` TODO Resend/Nodemailer), PromptPay/payment gateway (`ParentDashboard.tsx:64` TODO webhook), file storage การบ้าน (`assignments.store.ts:30`), PostgreSQL/Prisma (`lib/api/index.ts:1-10`), next-auth/JWT (`auth.api.ts:57`, `AuthContext.tsx:349`)
- `.claude/mods/caveman/*` = เครื่องมือ Claude Code ของทีม ไม่เกี่ยวกับแอป

## จุดเสี่ยง & หนี้ทางเทคนิค

**ความปลอดภัย (สูง)**
1. **Auth/authorization ฝั่ง client ทั้งหมด**: session เป็น JSON ใน sessionStorage แก้ได้ (`auth.api.ts:58-72`); guard ด้วย `useEffect` + `router.push` (`AdminShell.tsx:25-29`) — ไม่มี middleware/server; ใครแก้ session เป็น `role:'web_admin'` ก็เข้า `/admin` ได้ และ `hasPermission`/`canManageScores` ตัดสินจาก session เดียวกัน. `permissions.ts:7-8` ยอมรับเองว่าเป็นแค่ซ่อน UI.
2. **รหัสผ่าน/เครดิต**: SEEDED_USERS มีรหัสผ่าน plaintext ใน source รวม `webadmin/Admin123` (`mock-data/index.ts:10-15`) และ bundle ไปที่ client; hash = SHA-256 + salt คงที่ ไม่ใช่ bcrypt/KDF (`auth.api.ts:88-92`); นโยบายรหัสผ่าน 1–8 ตัวอักษร/ตัวเลข (`:79-81`) อ่อนมาก; lockout เก็บใน localStorage ลบทิ้งได้ (`:102-130`); `users` ทั้งก้อนรวม hash อ่านได้จาก localStorage.
3. **การยืนยันอีเมลปลอม**: สมัครแล้วยืนยันเองอัตโนมัติ (`RegisterForm.tsx:40`) และ `verifyEmail(username)` ไม่ตรวจ token (`auth.api.ts:274`). สมัครเอง role `school_admin` ได้ (`:244`) โดยไม่มีการอนุมัติ.
4. **เงิน**: `addWalletFunds` ไม่ตรวจ role/ที่มา (`wallet.store.ts:62`) — ผู้ใช้ใดก็เติมเงินผ่าน console ได้; `STUDENT_CITIZEN_REGISTRY` ที่ใช้ยืนยัน admin topup อยู่ใน client bundle (`mock-data/index.ts:138`) และมีแค่ 3 นักเรียน (นักเรียนใหม่เติมโดย admin ไม่ได้).
5. **PDPA**: เลขบัตร ปชช., ข้อมูลสุขภาพ, ที่อยู่, เบอร์โทร ของเด็ก/ครู เก็บแบบ plaintext ใน localStorage/ mock ใน bundle (`mock-data/index.ts:127`, `types.ts:63,180,197-200`); ไม่มี consent, retention, encryption, access log จริง (activity log แก้/ล้างได้ `activity.log.ts:34`).
6. **Cross-tenant**: ข้อมูลทุกโรงเรียน/ทุก role อยู่ใน key เดียวกันของ browser เดียว; shared notifs เป็น list เดียวกรองด้วย audience (`assignments.store.ts:139`).
7. ปุ่มยืนยันอีเมลใน login ใช้ได้กับ username ใดก็ได้ที่ใส่ (`LoginForm.tsx:125`).

**สถาปัตยกรรม / หนี้เทคนิค**
8. **ไม่มี backend/DB**: `lib/api/*` เป็น sync store บน localStorage ห่อด้วย `async` หลอก (เช่น `student.api.ts:155`); เสี่ยง quota ~5MB (feed เก็บรูป data URL `feed.store.ts:159`, avatar base64), ไม่มี transaction/concurrency (read-modify-write ทั้งก้อน เช่น `wallet.store.ts:63-70`, `assignments.store.ts:192-201`), ข้อมูลหายเมื่อเคลียร์ browser/เปลี่ยนเครื่อง, ใช้ร่วมกันไม่ได้ระหว่างผู้ใช้จริง ("real-time" ใช้ได้เฉพาะแท็บเดียวกัน browser เดียวกัน).
9. **ไม่มีเทสต์เลย** (git ls-files ไม่พบ test/spec; ไม่มี test script ใน `package.json:5-9`); มี logic คำนวณสำคัญ (เกรด/GPA/หน่วยกิต/ตรวจชนตาราง/เลื่อนชั้น) ที่ไม่มี regression guard — เคยมีบั๊ก (audit_2026-08-16 ใน memory).
10. **Seed/migration ทุกครั้งที่โหลด**: `AuthProvider` รัน seed 5 ตัว (`AuthContext.tsx:350-357`) บน main thread ทุก mount; migration แบบ flag (`eduflow_perm_v2` `auth.api.ts:167`); ไม่มี schema versioning ทั่วไป (มีแค่ `feed_v4`). JSON.parse ไม่มี try/catch ในหลาย store (`auth.api.ts:36,48,60`, `wallet.store.ts:33`, `attendance.store.ts:17`) → ข้อมูลเสียทำให้แอปพัง; ใช้ `storage-cache` เฉพาะบาง store (academic).
11. **mock กับ real ปนกัน**: ข้อมูล demo ผูกกับ student code `10021` (`student.api.ts:30-31`) และครู demo (`teacher.api.ts:27`); ปัญหา shape ซ้ำ (`Submission` vs `StoredSubmission`), `AttendanceRecord.studentId` เก็บ code, `Permissions` ไม่รวม web_admin; `getSystemStats` hardcode 847 โรงเรียน (`admin.api.ts:68`), `getSchoolAdminStats` hardcode ทั้งหมด (`:77-85`), `/schools` mock (`app/schools/page.tsx:135`).
12. **Performance**: `getStudentRoomId` วนทุกปี→ชั้น→ห้อง (`class-resolver.ts:35-60`); `academic.store.ts` 918 บรรทัดเป็น god-store; layout ใหญ่ (`TeacherLayout`/`StudentLayout`) คุม view ด้วย state ไม่ใช่ route (deep-link/back ไม่ทำงาน).
13. **Unused / dead**: `requirePermission` ไม่ถูกเรียก; permission keys หลายตัวไม่ถูกบังคับ (ดูหมวดสิทธิ์); `lib/api/index.ts` export แค่ 4 api (store อื่น import ตรง).
14. **Legacy SPA ซ้ำซ้อน**: `index.html`+`js/*` (~6,000 บรรทัด) มี logic auth/seed ซ้ำคล้ายกัน (`js/auth.js:39-48`) — ไม่มีเอกสารบอกว่ายังใช้หรือไม่; ควรยืนยันกับ owner. `package.json` ที่ root มีอยู่ (ไม่ได้อ่านเนื้อหา).
15. i18n แบบ `dom-translate` (แปล DOM) — เสี่ยงต่อ hydration/performance (ยังไม่ได้อ่านโค้ดละเอียด).
16. **ไม่ได้ตรวจในรอบนี้ (ช่องว่างความรู้)**: เนื้อหา `SchoolAdminContent`/`ContentView`/`LogsView`/`PermissionsManager`, `report-docs*.ts`, `i18n/*`, `schedule.store` ส่วน log, `tutoring.store` รายละเอียดการจอง, `legacy js/*` — ควรอ่านเพิ่มก่อนแก้โมดูลเหล่านี้.

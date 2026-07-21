'use client';

/**
 * กระดานข่าวสารโรงเรียน — แสดงบน Dashboard ของครูและนักเรียน
 * ข่าวประจำวัน · ประกาศ · กิจกรรม · วันหยุด · ปฏิทินการศึกษา
 *
 * ตอนนี้เป็นการ "แสดงให้เห็นก่อน" ตามที่ตกลงไว้ — ยังไม่เปิดให้กดอ่านรายละเอียด
 * TODO: เชื่อมกับหน้าอ่านข่าวเต็ม + ระบบโพสต์ข่าวของแอดมินโรงเรียน
 */

import { SCHOOL_NEWS_MOCK, type SchoolNewsType } from '@/lib/mock-data';

const META: Record<SchoolNewsType, { label: string; cls: string; icon: string }> = {
  announce: { label: 'ประกาศ',           cls: 'news-badge-announce', icon: '📢' },
  activity: { label: 'กิจกรรม',          cls: 'news-badge-activity', icon: '🎉' },
  holiday:  { label: 'วันหยุด',          cls: 'news-badge-holiday',  icon: '🏖' },
  calendar: { label: 'ปฏิทินการศึกษา',  cls: 'news-badge-calendar', icon: '🗓' },
};

export default function NewsBoard({ limit = 6, title = 'ข่าวสารและประกาศของโรงเรียน' }: { limit?: number; title?: string }) {
  const news = SCHOOL_NEWS_MOCK.slice(0, limit);

  return (
    <div className="stu-section">
      <div className="stu-section-header">
        <div className="stu-section-title">{title}</div>
        <span className="news-soon">อัปเดตประจำวัน</span>
      </div>
      <div className="news-grid">
        {news.map(n => {
          const m = META[n.type];
          return (
            <div key={n.id} className="news-card">
              <div className="news-card-top">
                <span className={`news-badge ${m.cls}`}>{m.icon} {m.label}</span>
                <span className="news-date">{n.date}</span>
              </div>
              <div className="news-title">{n.title}</div>
              <div className="news-body">{n.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

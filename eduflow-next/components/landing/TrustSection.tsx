/** ทำไมเชื่อถือได้ (#trust) — 3 ข้อ (pages.md P1) */
import Icon, { type IconName } from '@/components/ui/Icon';

const ITEMS: { icon: IconName; title: string }[] = [
  { icon: 'users', title: 'ไม่ให้คะแนนแทนกรรมการ' },
  { icon: 'file-text', title: 'ไม่แต่งหลักฐาน' },
  { icon: 'list-check', title: 'ทุกการแก้ไขมี audit log' },
];

export default function TrustSection() {
  return (
    <section className="aq-lsection" id="trust" aria-labelledby="trust-h">
      <div className="aq-lsection__inner">
        <h2 className="aq-lsection__title" id="trust-h">ทำไมเชื่อถือได้</h2>
        <ul className="aq-trust">
          {ITEMS.map(m => (
            <li key={m.title} className="aq-card aq-trust__item">
              <span className="aq-feature__icon" aria-hidden="true"><Icon name={m.icon} size={24} /></span>
              <h3 className="aq-feature__title">{m.title}</h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

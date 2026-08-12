'use client';

/**
 * FeedPost — หน้าอ่านรายละเอียดกิจกรรม/ข่าว แบบ "โพส" (โมดัลเต็มสำหรับอ่าน)
 * ใช้ร่วมกันทั้งราง FeedRail และ NewsBoard · เปิดเมื่อกด "อ่านเพิ่มเติม ›"
 */

import { FEED_META, type FeedItem } from '@/lib/api/feed.store';

export default function FeedPost({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const m = FEED_META[item.type];
  return (
    <div className="feed-lightbox" onClick={onClose}>
      <article className="feed-post" onClick={e => e.stopPropagation()}>
        <button className="feed-lightbox-close" onClick={onClose}>✕</button>
        {item.image && <img src={item.image} alt={item.title} className="feed-post-img" />}
        <div className="feed-post-body">
          <span className="feed-badge" style={{ color: m.color, background: `${m.color}14` }}>{m.icon} {m.label}</span>
          <h2 className="feed-post-title">{item.title}</h2>
          <div className="feed-post-date">{item.date}</div>
          <p className="feed-post-text">{item.body}</p>
        </div>
      </article>
    </div>
  );
}

'use client';

/**
 * ราง (rail) ฟีดข่าว/กิจกรรม — เติมพื้นที่ว่างซ้าย/ขวาของแดชบอร์ดให้ยาวเต็มหน้า
 * ทุกการ์ดมี "ภาพ" ด้านล่าง: ถ้า admin แนบรูปจริง = รูปนั้น (กดดูเต็มได้) ·
 * ถ้าไม่มี = cover ตกแต่ง (gradient + สัญลักษณ์) ให้ดูสวยและเติมความสูง
 * ข้อมูลจาก feed.store (web admin ดูแล)
 */

import { useEffect, useState } from 'react';
import { getRailItems, FEED_META, type FeedItem, type RailSide } from '@/lib/api/feed.store';
import FeedPost from './FeedPost';

interface Props {
  side: RailSide;
  title: string;
  limit?: number;
}

export default function FeedRail({ side, title, limit = 8 }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [zoom, setZoom] = useState<FeedItem | null>(null);
  const [post, setPost] = useState<FeedItem | null>(null);

  useEffect(() => {
    setItems(getRailItems(side).slice(0, limit));
  }, [side, limit]);

  if (items.length === 0) return null;

  return (
    <aside className="feed-rail">
      <div className="feed-rail-title">{title}</div>
      {items.map(it => {
        const m = FEED_META[it.type];
        return (
          <div key={it.id} className="feed-card" style={{ borderTop: `3px solid ${m.color}` }}>
            <div className="feed-card-body">
              <div className="feed-card-top">
                <span className="feed-badge" style={{ color: m.color, background: `${m.color}14` }}>{m.icon} {m.label}</span>
                {it.pinned && <span title="ปักหมุด">📌</span>}
              </div>
              <div className="feed-card-title">{it.title}</div>
              <div className="feed-card-text">{it.body}</div>
              <div className="feed-card-foot">
                <span className="feed-card-date">{it.date}</span>
                <button className="feed-more" onClick={() => setPost(it)}>อ่านเพิ่มเติม ›</button>
              </div>
            </div>

            {it.image && (
              <button className="feed-card-imgbtn" onClick={() => setZoom(it)} title="กดดูภาพเต็ม">
                <img src={it.image} alt={it.title} className="feed-card-img" />
                <span className="feed-card-imghint">ดูภาพ</span>
              </button>
            )}
          </div>
        );
      })}

      {zoom && (
        <div className="feed-lightbox" onClick={() => setZoom(null)}>
          <div className="feed-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="feed-lightbox-close" onClick={() => setZoom(null)}>✕</button>
            {zoom.image && <img src={zoom.image} alt={zoom.title} className="feed-lightbox-img" />}
            <div className="feed-lightbox-cap">
              <div className="feed-card-title">{zoom.title}</div>
              <div className="feed-card-text">{zoom.body}</div>
            </div>
          </div>
        </div>
      )}

      {post && <FeedPost item={post} onClose={() => setPost(null)} />}
    </aside>
  );
}

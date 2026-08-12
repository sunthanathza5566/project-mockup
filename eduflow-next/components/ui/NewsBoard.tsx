'use client';

/**
 * กระดานข่าวสารโรงเรียน — แสดงบน Dashboard ครู/นักเรียน + หน้าแรก
 * ดึงจาก feed.store (แหล่งเดียวกับราง FeedRail · web admin ดูแลที่ /admin/content)
 * ทุกการ์ดมีภาพ/ปกตกแต่งด้านล่างให้ดูสวยและสม่ำเสมอ
 */

import { useEffect, useState } from 'react';
import { getFeed, FEED_META, type FeedItem } from '@/lib/api/feed.store';
import FeedPost from './FeedPost';

export default function NewsBoard({ limit = 6, title = 'ข่าวสารและประกาศของโรงเรียน' }: { limit?: number; title?: string }) {
  const [news, setNews] = useState<FeedItem[]>([]);
  const [zoom, setZoom] = useState<FeedItem | null>(null);
  const [post, setPost] = useState<FeedItem | null>(null);

  useEffect(() => {
    setNews(getFeed().filter(n => n.type === 'news' || n.type === 'activity').slice(0, limit));
  }, [limit]);

  return (
    <div className="stu-section">
      <div className="stu-section-header">
        <div className="stu-section-title">{title}</div>
        <span className="news-soon">อัปเดตประจำวัน</span>
      </div>
      <div className="news-grid">
        {news.map(n => {
          const m = FEED_META[n.type];
          return (
            <div key={n.id} className="news-card news-card-v2">
              <div className="news-card-content">
                <div className="news-card-top">
                  <span className="news-badge" style={{ color: m.color, background: `${m.color}14` }}>{m.icon} {m.label}</span>
                  <span className="news-date">{n.date}</span>
                </div>
                <div className="news-title">{n.title}</div>
                <div className="news-body">{n.body}</div>
                <button className="feed-more" onClick={() => setPost(n)}>อ่านเพิ่มเติม ›</button>
              </div>
              {n.image && (
                <button className="feed-card-imgbtn" onClick={() => setZoom(n)} title="กดดูภาพเต็ม">
                  <img src={n.image} alt={n.title} className="feed-card-img" />
                  <span className="feed-card-imghint">ดูภาพ</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
}

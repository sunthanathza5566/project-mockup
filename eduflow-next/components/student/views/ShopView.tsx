'use client';

import { useState, useEffect } from 'react';
import type { StudentStats, ShopItem } from '@/lib/types';
import { getShopItems, placeOrder } from '@/lib/api/student.api';

interface Props {
  stats: StudentStats;
  showToast: (m: string) => void;
}

export default function ShopView({ stats, showToast }: Props) {
  const [cats,      setCats]      = useState<string[]>([]);
  const [items,     setItems]     = useState<ShopItem[]>([]);
  const [catFilter, setCatFilter] = useState('ทั้งหมด');

  // TODO(PostgreSQL): cart state ควรเก็บใน server session หรือ database
  const [cart, setCart] = useState<Record<number, number>>({});
  const [balance, setBalance] = useState(stats.balance);

  useEffect(() => {
    getShopItems().then(({ cats, items }) => { setCats(cats); setItems(items); });
  }, []);

  const filtered = catFilter === 'ทั้งหมด' ? items : items.filter(i => i.cat === catFilter);
  const cartQty  = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, q]) => {
    const item = items.find(i => i.id === +id);
    return s + (item ? item.price * q : 0);
  }, 0);

  function addItem(id: number) { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); }

  async function checkout() {
    if (balance < cartTotal) { showToast('ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน'); return; }
    const result = await placeOrder('', cart, cartTotal);
    if (result.success) {
      setBalance(result.newBalance);
      setCart({});
      showToast(`✅ สั่งอาหารสำเร็จ! หักเงิน ฿${cartTotal} · รับอาหารช่วงพักกลางวัน`);
    }
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">🛍 ร้านค้าโรงเรียน</h2>
        <p className="stu-page-sub">สั่งอาหารล่วงหน้า · รับช่วงพักกลางวัน 12:00 – 13:00 · ยอดเงิน ฿{balance.toLocaleString('th-TH')}</p>
      </div>

      <div className="stu-shop-cats">
        {cats.map(cat => (
          <button key={cat} className={`stu-filter-chip${catFilter === cat ? ' active' : ''}`} onClick={() => setCatFilter(cat)}>{cat}</button>
        ))}
      </div>

      <div className="stu-shop-grid">
        {filtered.map(item => {
          const qty    = cart[item.id] || 0;
          const inCart = qty > 0;
          return (
            <div
              key={item.id}
              className={`stu-shop-item${!item.avail ? ' sold-out' : inCart ? ' in-cart' : ''}`}
              onClick={() => item.avail ? addItem(item.id) : showToast('สินค้าหมดแล้ว')}
            >
              {!item.avail
                ? <span className="stu-shop-tag stu-shop-tag-out">หมด</span>
                : item.hot ? <span className="stu-shop-tag stu-shop-tag-hot">🔥 ยอดนิยม</span> : null}
              {qty > 0 && <div className="stu-shop-qty">{qty}</div>}
              <div className="stu-shop-emoji">{item.icon}</div>
              <div className="stu-shop-name">{item.name}</div>
              <div className="stu-shop-price">฿{item.price}</div>
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {cartQty > 0 && (
        <div className="stu-cart-bar">
          <div className="stu-cart-info">
            <div className="stu-cart-count">{cartQty} รายการ</div>
            <div className="stu-cart-total">฿{cartTotal}</div>
          </div>
          <div className="stu-cart-actions">
            <button className="stu-cart-clear" onClick={() => setCart({})}>ล้าง</button>
            <button className="stu-cart-checkout" onClick={checkout}>สั่งอาหาร →</button>
          </div>
        </div>
      )}
    </div>
  );
}

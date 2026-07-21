'use client';

import { useState, useEffect } from 'react';
import type { StudentStats, ShopItem, StudentProfile } from '@/lib/types';
import { getShopItems, placeOrder } from '@/lib/api/student.api';
import { getWalletBalance } from '@/lib/api/wallet.store';

interface Props {
  profile: StudentProfile;
  stats: StudentStats;
  showToast: (m: string) => void;
  refreshWallet?: () => void;
  setView?: (v: 'topup') => void;
}

const modalWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(18,10,4,0.6)',
  backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
};
const modalCard: React.CSSProperties = {
  width: 'min(380px, 94vw)', background: 'var(--warm-white)', borderRadius: 16,
  padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
};

export default function ShopView({ profile, showToast, refreshWallet, setView }: Props) {
  const [cats,      setCats]      = useState<string[]>([]);
  const [items,     setItems]     = useState<ShopItem[]>([]);
  const [catFilter, setCatFilter] = useState('ทั้งหมด');
  const [cart,      setCart]      = useState<Record<number, number>>({});
  const [balance,   setBalance]   = useState(0);

  // ── Popups ──
  const [pickedItem,   setPickedItem]   = useState<ShopItem | null>(null); // popup เลือก: ใส่ตะกร้า / ชำระทันที
  const [pickedQty,    setPickedQty]    = useState(1);                     // จำนวนที่เลือกใน popup
  const [checkoutList, setCheckoutList] = useState<{ item: ShopItem; qty: number }[] | null>(null); // หน้ายืนยันชำระเงิน
  const [notEnough,    setNotEnough]    = useState(false); // popup ยอดเงินไม่พอ
  const [receipt,      setReceipt]      = useState<{ list: { item: ShopItem; qty: number }[]; total: number; balance: number } | null>(null);

  const code = profile.studentId;

  useEffect(() => {
    getShopItems().then(({ cats, items }) => { setCats(cats); setItems(items); });
    setBalance(getWalletBalance(code));
  }, [code]);

  const filtered  = catFilter === 'ทั้งหมด' ? items : items.filter(i => i.cat === catFilter);
  const cartQty   = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ item: items.find(i => i.id === +id)!, qty }))
    .filter(x => x.item);
  const cartTotal = cartItems.reduce((s, x) => s + x.item.price * x.qty, 0);

  /** เปิด popup สินค้า พร้อมรีเซ็ตจำนวนเป็น 1 ทุกครั้ง */
  function openItem(item: ShopItem) {
    setPickedQty(1);
    setPickedItem(item);
  }

  function addToCart(item: ShopItem, qty = 1) {
    setCart(c => ({ ...c, [item.id]: (c[item.id] || 0) + qty }));
    showToast(`🛒 ใส่ "${item.name}" × ${qty} ลงตะกร้าแล้ว`);
    setPickedItem(null);
  }

  /** เข้าหน้ายืนยันชำระเงิน (จากปุ่มชำระทันที หรือจากตะกร้า) */
  function openCheckout(list: { item: ShopItem; qty: number }[]) {
    const total = list.reduce((s, x) => s + x.item.price * x.qty, 0);
    if (balance < total) { setNotEnough(true); setPickedItem(null); return; }
    setCheckoutList(list);
    setPickedItem(null);
  }

  async function confirmPayment() {
    if (!checkoutList) return;
    const total = checkoutList.reduce((s, x) => s + x.item.price * x.qty, 0);
    const summary = checkoutList.map(x => `${x.item.name}×${x.qty}`).join(', ');
    const result = await placeOrder(code, summary, total);
    if (!result.success) { setCheckoutList(null); setNotEnough(true); return; }
    setBalance(result.newBalance);
    setCart({});
    setCheckoutList(null);
    setReceipt({ list: checkoutList, total, balance: result.newBalance });
    refreshWallet?.();
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
          const qty = cart[item.id] || 0;
          return (
            <div
              key={item.id}
              className={`stu-shop-item${!item.avail ? ' sold-out' : qty > 0 ? ' in-cart' : ''}`}
              onClick={() => item.avail ? openItem(item) : showToast('สินค้าหมดแล้ว')}
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

      {/* ── แถบตะกร้า ── */}
      {cartQty > 0 && (
        <div className="stu-cart-bar">
          <div className="stu-cart-info">
            <div className="stu-cart-count">{cartQty} รายการ</div>
            <div className="stu-cart-total">฿{cartTotal}</div>
          </div>
          <div className="stu-cart-actions">
            <button className="stu-cart-clear" onClick={() => setCart({})}>ล้าง</button>
            <button className="stu-cart-checkout" onClick={() => openCheckout(cartItems)}>ชำระเงิน →</button>
          </div>
        </div>
      )}

      {/* ── Popup เลือกสินค้า: ใส่ตะกร้า / ชำระเงินทันที ── */}
      {pickedItem && (
        <div style={modalWrap} onClick={() => setPickedItem(null)}>
          <div style={{ ...modalCard, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3.2rem', marginBottom: '0.4rem' }}>{pickedItem.icon}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>{pickedItem.name}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brown-mid)', margin: '0.35rem 0 0.85rem' }}>฿{pickedItem.price}</div>

            {/* ── เลือกจำนวนก่อนทำรายการ ── */}
            <div className="stu-qty-row">
              <button className="stu-qty-btn" onClick={() => setPickedQty(q => Math.max(1, q - 1))} disabled={pickedQty <= 1}>−</button>
              <input
                className="stu-qty-input"
                type="number"
                min={1}
                max={99}
                value={pickedQty}
                onChange={e => setPickedQty(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <button className="stu-qty-btn" onClick={() => setPickedQty(q => Math.min(99, q + 1))} disabled={pickedQty >= 99}>+</button>
            </div>
            <div className="stu-qty-total">รวม ฿{(pickedItem.price * pickedQty).toLocaleString('th-TH')}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button className="stu-hw-submit-btn" style={{ width: '100%' }} onClick={() => addToCart(pickedItem, pickedQty)}>🛒 ใส่ตะกร้า ({pickedQty} ชิ้น)</button>
              <button className="stu-hw-submit-btn" style={{ width: '100%', background: '#2E8B5B' }} onClick={() => openCheckout([{ item: pickedItem, qty: pickedQty }])}>💳 ชำระเงินทันที</button>
              <button className="stu-hw-submit-btn" style={{ width: '100%', background: 'var(--text-muted)' }} onClick={() => setPickedItem(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── หน้ายืนยันการชำระเงิน ── */}
      {checkoutList && (
        <div style={modalWrap}>
          <div style={modalCard}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.85rem', textAlign: 'center' }}>💳 ยืนยันการชำระเงิน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
              {checkoutList.map(({ item, qty }) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', background: 'var(--cream)', borderRadius: 8, padding: '0.45rem 0.7rem' }}>
                  <span>{item.icon}</span>
                  <span style={{ flex: 1, color: 'var(--brown-dark)' }}>{item.name} × {qty}</span>
                  <span style={{ fontWeight: 600 }}>฿{item.price * qty}</span>
                </div>
              ))}
            </div>
            {(() => {
              const total = checkoutList.reduce((s, x) => s + x.item.price * x.qty, 0);
              return (
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ยอดชำระ</span><b style={{ color: 'var(--brown-dark)' }}>฿{total.toLocaleString('th-TH')}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>ยอดเงินในบัญชี</span><span>฿{balance.toLocaleString('th-TH')}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 600 }}><span>คงเหลือหลังชำระ</span><span>฿{(balance - total).toLocaleString('th-TH')}</span></div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="stu-hw-submit-btn" style={{ flex: 1, background: '#2E8B5B' }} onClick={confirmPayment}>✅ ยืนยันชำระเงิน</button>
              <button className="stu-hw-submit-btn" style={{ flex: 1, background: 'var(--text-muted)' }} onClick={() => setCheckoutList(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ใบเสร็จหลังชำระสำเร็จ ── */}
      {receipt && (
        <div style={modalWrap} onClick={() => setReceipt(null)}>
          <div style={{ ...modalCard, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.6rem', marginBottom: '0.4rem' }}>✅</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem' }}>ชำระเงินสำเร็จ!</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '0.5rem' }}>
              {receipt.list.map(x => `${x.item.name}×${x.qty}`).join(' · ')}
            </div>
            <div style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>
              หักเงิน <b>฿{receipt.total.toLocaleString('th-TH')}</b> · คงเหลือ <b style={{ color: 'var(--brown-dark)' }}>฿{receipt.balance.toLocaleString('th-TH')}</b>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>รับสินค้าช่วงพักกลางวัน 12:00 – 13:00</div>
            </div>
            <button className="stu-hw-submit-btn" style={{ width: '100%' }} onClick={() => setReceipt(null)}>ปิด</button>
          </div>
        </div>
      )}

      {/* ── Popup ยอดเงินไม่พอ ── */}
      {notEnough && (
        <div style={modalWrap} onClick={() => setNotEnough(false)}>
          <div style={{ ...modalCard, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.6rem', marginBottom: '0.4rem' }}>⚠️</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--absent)', marginBottom: '0.5rem' }}>ยอดเงินไม่พอชำระรายการ</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '1rem' }}>
              ยอดเงินคงเหลือ ฿{balance.toLocaleString('th-TH')} — กรุณาแจ้งผู้ปกครองเติมเงินก่อนทำรายการ
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="stu-hw-submit-btn" style={{ flex: 1 }} onClick={() => { setNotEnough(false); setView?.('topup'); }}>💰 ไปหน้ากระเป๋าเงิน</button>
              <button className="stu-hw-submit-btn" style={{ flex: 1, background: 'var(--text-muted)' }} onClick={() => setNotEnough(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

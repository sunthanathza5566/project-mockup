/**
 * Wallet Store — กระเป๋าเงินนักเรียน (ใช้ร่วมกัน: ร้านค้า / เติมเงิน / ผู้ปกครอง / web admin)
 *
 * กติกา:
 *   - นักเรียนใช้จ่ายได้อย่างเดียว — เติมเงินได้เฉพาะ "ผู้ปกครอง" (PromptPay) และ "web admin" (กรณีระบบขัดข้อง)
 *   - ยอดไม่พอ = ซื้อไม่ได้ (ฝั่ง UI แสดง popup แจ้งเตือน)
 *
 * TODO(PostgreSQL): tables: wallets(student_code, balance), wallet_transactions(...)
 *   การเติมผ่าน PromptPay จริงต้องต่อ payment gateway + webhook ยืนยันยอด
 */

import { pushSharedNotification } from './assignments.store';
import { logActivity } from './activity.log';

const KEY = 'eduflow_wallet';

export interface WalletTxn {
  at: number;
  type: 'topup-promptpay' | 'topup-admin' | 'purchase';
  amount: number;   // บวก = เข้า, ลบ = ออก
  detail: string;
  by: string;       // ใครทำรายการ เช่น ชื่อผู้ปกครอง / webadmin / นักเรียน
}

interface WalletData {
  balances: Record<string, number>;       // keyed by studentCode
  txns: Record<string, WalletTxn[]>;
}

function isBrowser() { return typeof window !== 'undefined'; }

function load(): WalletData {
  if (!isBrowser()) return { balances: {}, txns: {} };
  const raw = localStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  // seed: นักเรียนตัวอย่าง (student1) มียอดตั้งต้นไว้ทดลองซื้อของ — บัญชีอื่นเริ่มจาก 0
  const seeded: WalletData = {
    balances: { '10021': 250 },
    txns: { '10021': [{ at: Date.now(), type: 'topup-promptpay', amount: 250, detail: 'ยอดตั้งต้น (ข้อมูลตัวอย่าง)', by: 'ระบบ' }] },
  };
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function save(d: WalletData) { if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(d)); }

// TODO(PostgreSQL): SELECT balance FROM wallets WHERE student_code = $1
export function getWalletBalance(code: string): number {
  if (!code) return 0;
  return load().balances[code] ?? 0;
}

export function getWalletTxns(code: string): WalletTxn[] {
  return [...(load().txns[code] || [])].sort((a, b) => b.at - a.at);
}

function record(d: WalletData, code: string, txn: WalletTxn) {
  if (!d.txns[code]) d.txns[code] = [];
  d.txns[code].unshift(txn);
  d.txns[code] = d.txns[code].slice(0, 50);
}

/** เติมเงิน — เรียกได้จากฝั่งผู้ปกครอง (PromptPay) และ web admin เท่านั้น */
// TODO(PostgreSQL): UPDATE wallets SET balance = balance + $1 WHERE student_code = $2 (ตรวจสิทธิ์ด้วย RLS)
export function addWalletFunds(code: string, amount: number, type: 'topup-promptpay' | 'topup-admin', by: string, detail = ''): number {
  const d = load();
  d.balances[code] = (d.balances[code] ?? 0) + amount;
  record(d, code, { at: Date.now(), type, amount, detail: detail || (type === 'topup-promptpay' ? 'เติมเงินผ่าน PromptPay' : 'เติมโดยผู้ดูแลระบบ'), by });
  save(d);
  pushSharedNotification(`student:${code}`, 'info', '💰 เงินเข้ากระเป๋าแล้ว', `${by} เติมเงินให้ ฿${amount.toLocaleString('th-TH')} · ยอดคงเหลือ ฿${d.balances[code].toLocaleString('th-TH')}`);
  return d.balances[code];
}

/** หักเงินตอนซื้อของ — ยอดไม่พอจะไม่หักและคืน ok: false */
// TODO(PostgreSQL): UPDATE wallets SET balance = balance - $1 WHERE student_code = $2 AND balance >= $1
export function deductWalletFunds(code: string, amount: number, detail: string): { ok: boolean; balance: number } {
  const d = load();
  const cur = d.balances[code] ?? 0;
  if (cur < amount) return { ok: false, balance: cur };
  d.balances[code] = cur - amount;
  record(d, code, { at: Date.now(), type: 'purchase', amount: -amount, detail, by: 'นักเรียน' });
  save(d);
  return { ok: true, balance: d.balances[code] };
}

/** web admin เติมเงินตรง — ต้อง verify เลขบัตรประชาชน + รหัสนักเรียน + ชื่อ-นามสกุล ให้ตรงกับที่บันทึกไว้ */
export function adminDirectTopup(
  input: { studentCode: string; citizenId: string; fullName: string; amount: number },
  registry: Record<string, { citizenId: string; name: string }>,
  adminName: string,
): { ok: boolean; error?: string; balance?: number } {
  const rec = registry[input.studentCode];
  if (!rec) return { ok: false, error: 'ไม่พบรหัสนักเรียนนี้ในทะเบียน' };
  if (rec.citizenId !== input.citizenId.replace(/[^0-9]/g, '')) return { ok: false, error: 'เลขบัตรประชาชนไม่ตรงกับที่บันทึกไว้ในระบบ' };
  if (rec.name.trim() !== input.fullName.trim()) return { ok: false, error: 'ชื่อ-นามสกุลไม่ตรงกับที่บันทึกไว้ในระบบ' };
  if (input.amount <= 0) return { ok: false, error: 'จำนวนเงินต้องมากกว่า 0' };
  const balance = addWalletFunds(input.studentCode, input.amount, 'topup-admin', adminName, 'เติมโดย web admin (ยืนยันตัวตนด้วยบัตรประชาชน)');
  logActivity('admin', 'เติมเงินนักเรียน', `${rec.name} (${input.studentCode}) +฿${input.amount.toLocaleString('th-TH')}`);
  return { ok: true, balance };
}

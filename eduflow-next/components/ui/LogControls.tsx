'use client';

/**
 * แถบควบคุมหน้า Log — เลือกจำนวนที่แสดง (20/50/100/ทั้งหมด) + ปุ่มล้าง log
 * ปุ่มล้างจะแสดงเฉพาะเมื่อส่ง onClear เข้ามา (ผู้เรียกเช็คสิทธิ์ web admin ก่อน)
 * pageSize === -1 = แสดงทั้งหมด
 */

interface Props {
  total: number;
  shown: number;
  pageSize: number;
  onPageSize: (n: number) => void;
  onClear?: () => void;
  options?: number[];
}

export default function LogControls({ total, shown, pageSize, onPageSize, onClear, options = [20, 50, 100] }: Props) {
  return (
    <div className="log-controls">
      <span className="log-controls-count">แสดง {shown} จาก {total} รายการ</span>
      <div className="log-controls-right">
        <label className="log-controls-sel">
          แสดง
          <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={-1}>ทั้งหมด</option>
          </select>
          รายการ
        </label>
        {onClear && (
          <button className="log-clear-btn" onClick={onClear}>🗑 ล้าง log</button>
        )}
      </div>
    </div>
  );
}

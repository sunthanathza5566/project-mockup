'use client';

/**
 * Section editor (saas-spec §P9 + friendly-spec §F13 earth) — id = `${cycleId}::${requirementId}` (encode ใน URL)
 * deep link แจ้งเตือนความเห็น `…#comments` → SarWorkspace เปิดแท็บข้าง "ความเห็น" (friendly-spec §F3.3)
 * หัวหน้า: crumbs รอบประเมิน › ปี › ข้อ · h1 "ข้อ x.x ชื่อสั้น" (ตัดด้วย truncateTh 60) + pill สถานะข้อ
 *          sub: รอบ · หลักสูตร · เจ้าของ · กำหนดส่ง (pill เหลือ n วัน)
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  can, daysUntil, getCycle, getProgramme, getRequirement, getSection, isAiEnabled, listComments, listEvidence, listRatings,
  listReviewEvents, listUsers, listVersions, programmeScope,
} from '@/lib/api';
import { Async, Badge, Empty, PageHeader, SectionStatusBadge, useLoad, useMe } from '@/components/aunqa/common';
import SarWorkspace, { resetCommentsDeepLink, type WorkspaceData } from '@/components/aunqa/SarWorkspace';
import Icon from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { decodeParam, fmtDate, truncateTh } from '@/lib/ui/aunqa';

export default function SectionPage() {
  const user = useMe();
  const sid = decodeParam(useParams().id);
  const [cycleId, reqId] = sid.split('::');
  const validId = !!cycleId && !!reqId;  // U3P-1: URL ไม่มี "::" = ไม่ใช่ข้อ
  const [rev, setRev] = useState(0);
  const pendingRemount = useRef(false);

  const q = useLoad<WorkspaceData>(() => {
    if (!validId) throw new Error('ไม่พบข้อนี้');
    const cycle = getCycle(user, cycleId);
    const section = getSection(user, cycleId, reqId);
    const req = getRequirement(reqId);
    if (!req) throw new Error('ไม่พบข้อกำหนดนี้');
    const linked = listEvidence(user, { programmeId: cycle.programmeId, cycleId, requirementId: reqId });
    const linkedIds = new Set(linked.map(e => e.id));
    const canEv = can(user, 'evidence.write', programmeScope(cycle.programmeId));
    const linkable = canEv ? listEvidence(user, { programmeId: cycle.programmeId, cycleId }).filter(e => !linkedIds.has(e.id)) : [];
    let reviewEvents: WorkspaceData['reviewEvents'] = [];
    try { reviewEvents = listReviewEvents(user, cycleId).filter(e => e.targetType === 'section' && e.targetId === section.id); } catch { /* ไม่มีสิทธิ์ */ }
    let ratings: WorkspaceData['ratings'] = [];
    try { ratings = listRatings(user, cycleId); } catch { /* ไม่มีสิทธิ์ดูคะแนน */ }
    return {
      cycle, section, req, linked, linkable,
      versions: listVersions(user, cycleId, reqId).slice().sort((a, b) => b.savedAt - a.savedAt),
      ratings,
      comments: listComments(user, cycleId, reqId),
      names: Object.fromEntries(listUsers(cycle.universityId).map(u => [u.id, u.fullName])),
      aiEnabled: isAiEnabled(cycle.universityId),
      reviewEvents,
    };
  }, [user.id, sid]);

  // remount หลังข้อมูลใหม่โหลดเสร็จ (ไม่ remount ตอน autosave เพื่อไม่ให้เสียตำแหน่งเคอร์เซอร์)
  // ออกจากหน้า → ลืม hash #comments ที่จัดการแล้ว (กดแจ้งเตือนเดิมซ้ำภายหลังต้องเปิดแท็บความเห็นอีก)
  useEffect(() => () => resetCommentsDeepLink(), []);

  useEffect(() => {
    if (pendingRemount.current && q.data) { pendingRemount.current = false; setRev(r => r + 1); }
  }, [q.data]);

  const d = q.data;
  if (!validId) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'รอบประเมิน', href: '/app/cycles' }, { label: 'ไม่พบข้อนี้' }]} title="ไม่พบข้อนี้" />
        <Empty icon="search" title="ไม่พบข้อนี้" text="ลิงก์อาจไม่ครบหรือพิมพ์ผิด — เปิดข้อจากแดชบอร์ดรอบหรือหน้าหลักแทน"
          action={<Button asChild><Link href="/app/cycles">ไปหน้ารอบประเมิน</Link></Button>} />
      </>
    );
  }
  const left = d?.section.due && d.section.status !== 'approved' ? daysUntil(d.section.due) : null;
  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'รอบประเมิน', href: '/app/cycles' },
          ...(d ? [{ label: String(d.cycle.academicYear), href: `/app/cycles/${encodeURIComponent(cycleId)}` }] : []),
          { label: `ข้อ ${reqId}` },
        ]}
        title={d ? `ข้อ ${reqId} ${truncateTh(d.req.textTh, 60)}` : `ข้อ ${reqId}`}
        status={d ? <SectionStatusBadge status={d.section.status} /> : undefined}
        sub={d ? (
          <>
            รอบ {d.cycle.academicYear} · {getProgramme(d.cycle.programmeId)?.nameTh} · เจ้าของ {d.names[d.section.ownerUserId || ''] || 'ยังไม่มอบหมาย'}
            {d.section.due && <> · กำหนดส่ง {fmtDate(d.section.due)}{' '}
              {left !== null && (
                <Badge tone={left < 0 ? 'bad' : left <= 3 ? 'warn' : 'neutral'} icon="clock">
                  {left < 0 ? `เลย ${-left} วัน` : left === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${left} วัน`}
                </Badge>
              )}
            </>}
          </>
        ) : undefined}
        actions={cycleId ? (
          <Button asChild variant="outline">
            <Link href={`/app/cycles/${encodeURIComponent(cycleId)}`}><Icon name="chevron-left" size={20} />แดชบอร์ดรอบ</Link>
          </Button>
        ) : undefined}
      />
      <Async q={q} skeleton="editor">{data => (
        <SarWorkspace key={`${sid}-${rev}`} data={data} user={user} reload={q.reload} remount={() => { pendingRemount.current = true; q.reload(); }} />
      )}</Async>
    </>
  );
}

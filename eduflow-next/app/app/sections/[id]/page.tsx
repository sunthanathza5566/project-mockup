'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  can, getCycle, getProgramme, getRequirement, getSection, isAiEnabled, listComments, listEvidence, listRatings,
  listUsers, listVersions, programmeScope,
} from '@/lib/api';
import { Async, CycleStatusBadge, PageHeader, useLoad, useMe } from '@/components/aunqa/common';
import SarWorkspace, { type WorkspaceData } from '@/components/aunqa/SarWorkspace';
import { decodeParam } from '@/lib/ui/aunqa';

/** S6 SAR editor — id = `${cycleId}::${requirementId}` (encode ใน URL) */
export default function SectionPage() {
  const user = useMe();
  const sid = decodeParam(useParams().id);
  const [cycleId, reqId] = sid.split('::');
  const [rev, setRev] = useState(0);
  const pendingRemount = useRef(false);

  const q = useLoad<WorkspaceData>(() => {
    const cycle = getCycle(user, cycleId);
    const section = getSection(user, cycleId, reqId);
    const req = getRequirement(reqId);
    if (!req) throw new Error('ไม่พบข้อกำหนดนี้');
    const linked = listEvidence(user, { programmeId: cycle.programmeId, cycleId, requirementId: reqId });
    const linkedIds = new Set(linked.map(e => e.id));
    const canEv = can(user, 'evidence.write', programmeScope(cycle.programmeId));
    const linkable = canEv ? listEvidence(user, { programmeId: cycle.programmeId, cycleId }).filter(e => !linkedIds.has(e.id)) : [];
    let ratings: WorkspaceData['ratings'] = [];
    try { ratings = listRatings(user, cycleId); } catch { /* ไม่มีสิทธิ์ดูคะแนน */ }
    return {
      cycle, section, req, linked, linkable,
      versions: listVersions(user, cycleId, reqId).slice().sort((a, b) => b.savedAt - a.savedAt),
      ratings,
      comments: listComments(user, cycleId, reqId),
      names: Object.fromEntries(listUsers(cycle.universityId).map(u => [u.id, u.fullName])),
      aiEnabled: isAiEnabled(cycle.universityId),
    };
  }, [user.id, sid]);

  // remount หลังข้อมูลใหม่โหลดเสร็จ (ไม่ remount ตอน autosave เพื่อไม่ให้เสียตำแหน่งเคอร์เซอร์)
  useEffect(() => {
    if (pendingRemount.current && q.data) { pendingRemount.current = false; setRev(r => r + 1); }
  }, [q.data]);

  return (
    <>
      <PageHeader
        title={<>ข้อ {reqId}</>}
        sub={q.data ? <>รอบ {q.data.cycle.academicYear} · {getProgramme(q.data.cycle.programmeId)?.nameTh} · <CycleStatusBadge status={q.data.cycle.status} /></> : undefined}
        actions={cycleId ? <Link className="aq-btn" href={`/app/cycles/${cycleId}`}>← แดชบอร์ดรอบ</Link> : undefined}
      />
      <Async q={q}>{data => (
        <SarWorkspace key={`${sid}-${rev}`} data={data} user={user} reload={q.reload} remount={() => { pendingRemount.current = true; q.reload(); }} />
      )}</Async>
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { can, getProgrammes, listCycles, programmeScope } from '@/lib/api';
import { useMe } from './common';

/**
 * เลือกหลักสูตร + รอบ ที่ผู้ใช้เข้าถึงได้ (หน้า evidence / metrics / export)
 * กรรมการประเมินเข้าถึงได้เฉพาะรอบที่ได้รับมอบหมาย → ต้องมี cycleId เสมอ
 */
export function useScope() {
  const user = useMe();
  const cycles = useMemo(() => listCycles(user), [user]);
  const programmes = useMemo(
    () => getProgrammes(user.universityId).filter(p =>
      cycles.some(c => c.programmeId === p.id) || can(user, 'read', programmeScope(p.id))),
    [user, cycles],
  );
  const [programmeId, setProgrammeId] = useState('');
  const [cycleId, setCycleIdState] = useState('');

  const pid = programmeId || programmes[0]?.id || '';
  const cyclesOf = cycles.filter(c => c.programmeId === pid);
  const cid = cyclesOf.some(c => c.id === cycleId) ? cycleId : (cyclesOf[0]?.id ?? '');

  return {
    user, programmes, cycles: cyclesOf, programmeId: pid, cycleId: cid,
    setProgrammeId: (id: string) => { setProgrammeId(id); setCycleIdState(''); },
    setCycleId: setCycleIdState,
  };
}

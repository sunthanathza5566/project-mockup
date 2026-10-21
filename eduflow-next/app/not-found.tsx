import NotFoundView from '@/components/ui/NotFoundView';

/** 404 (ADR-UI-001 pages.md P20) — server component ห่อ view ฝั่ง client (เลี่ยงปัญหา build ของ Next 14 กับ not-found แบบ client) */
export default function NotFound() {
  return <NotFoundView />;
}

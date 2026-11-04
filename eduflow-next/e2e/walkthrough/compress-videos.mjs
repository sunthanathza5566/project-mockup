/**
 * TASK-0003 S6b — บีบอัดวิดีโอ walkthrough ใน docs/walkthrough/videos ด้วย ffmpeg ที่ Playwright ติดตั้งไว้
 * (ffmpeg-1013 ของ Playwright มีแค่ encoder VP8/VP9 ไม่มี H.264 → คงเป็น .webm, เปิดได้ใน Chrome/Edge/VLC)
 * ใช้: node e2e/walkthrough/compress-videos.mjs [ชื่อไฟล์.webm ...]   (ไม่ระบุ = ทุกไฟล์ที่ยังไม่บีบ)
 * ไฟล์ที่บีบแล้วจดไว้ใน .compressed.json (ชื่อ + ขนาดหลังบีบ) — ถ้าไฟล์ถูกอัดใหม่ (ขนาดเปลี่ยน) จะบีบใหม่
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '..', '..', '..', 'docs', 'walkthrough', 'videos');
const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : path.join(os.homedir(), '.cache', 'ms-playwright');
const ffdir = fs.readdirSync(base).filter(d => d.startsWith('ffmpeg-')).sort().pop();
const ff = path.join(base, ffdir, process.platform === 'win32' ? 'ffmpeg-win64.exe' : 'ffmpeg-linux');
const stamp = path.join(dir, '.compressed.json');
const done = fs.existsSync(stamp) ? JSON.parse(fs.readFileSync(stamp, 'utf8')) : {};
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.webm'));

for (const f of files) {
  const src = path.join(dir, f);
  const size = fs.statSync(src).size;
  if (done[f] === size) { console.log(`skip ${f}`); continue; }
  const tmp = src.replace(/\.webm$/, '.tmp.webm');
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0',
    '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-an', tmp], { stdio: 'inherit' });
  fs.renameSync(tmp, src);
  done[f] = fs.statSync(src).size;
  console.log(`${f}: ${(size / 1e6).toFixed(1)} MB → ${(done[f] / 1e6).toFixed(1)} MB`);
}
fs.writeFileSync(stamp, JSON.stringify(done, null, 2));

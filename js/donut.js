// ─── DONUT CHART ───

let activeSegment = -1;

function initDonut() {
  const canvas = document.getElementById('donut-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let progress = 0;
  const animate = () => {
    progress = Math.min(progress + 0.03, 1);
    drawDonut(ctx, progress, activeSegment);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - 150;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) - 150;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < 142 && dist > 78) {
      const seg = angleToSegment(x, y);
      if (seg !== activeSegment) {
        activeSegment = seg;
        drawDonut(ctx, 1, activeSegment);
        updateCenterLabel(seg);
        highlightLegend(seg);
      }
    } else if (activeSegment !== -1) {
      activeSegment = -1;
      drawDonut(ctx, 1, -1);
      resetCenterLabel();
      highlightLegend(-1);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    activeSegment = -1;
    drawDonut(ctx, 1, -1);
    resetCenterLabel();
    highlightLegend(-1);
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - 150;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) - 150;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < 142 && dist > 78) {
      const seg = angleToSegment(x, y);
      if (seg !== -1) navigateToSchools(seg);
    }
  });
}

function angleToSegment(x, y) {
  const angle = Math.atan2(y, x);
  const norm = ((angle + Math.PI * 1.5) / (Math.PI * 2) + 1) % 1;
  let acc = 0;
  for (let i = 0; i < donutData.length; i++) {
    acc += donutData[i].pct;
    if (norm <= acc) return i;
  }
  return -1;
}

function drawDonut(ctx, progress, active) {
  ctx.clearRect(0, 0, 300, 300);
  const cx = 150, cy = 150, r = 140, inner = 80;
  let start = -Math.PI / 2;
  donutData.forEach((seg, i) => {
    const sweep = seg.pct * Math.PI * 2 * progress;
    const isActive = i === active;
    const offset = isActive ? 4 : 0;
    const midAngle = start + sweep / 2;
    const ox = Math.cos(midAngle) * offset;
    const oy = Math.sin(midAngle) * offset;
    ctx.beginPath();
    ctx.moveTo(cx + ox + Math.cos(start) * inner, cy + oy + Math.sin(start) * inner);
    ctx.arc(cx + ox, cy + oy, r, start, start + sweep);
    ctx.arc(cx + ox, cy + oy, inner, start + sweep, start, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.globalAlpha = isActive ? 1 : (active === -1 ? 1 : 0.6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, r, start, start + sweep);
    ctx.arc(cx + ox, cy + oy, inner, start + sweep, start, true);
    ctx.strokeStyle = 'rgba(250,247,242,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    start += sweep;
  });
}

function updateCenterLabel(seg) {
  document.getElementById('donut-center-num').textContent = centerVals[seg].split(' ')[0];
  const el = document.getElementById('donut-center-num').nextElementSibling;
  if (el) el.textContent = centerLabels[seg];
}

function resetCenterLabel() {
  document.getElementById('donut-center-num').textContent = '847';
  const el = document.getElementById('donut-center-num').nextElementSibling;
  if (el) el.textContent = 'โรงเรียน';
}

function highlightLegend(seg) {
  document.querySelectorAll('.legend-row').forEach((row, i) => {
    row.classList.toggle('dimmed', seg !== -1 && i !== seg);
  });
}

function animateLegendBars() {
  setTimeout(() => {
    document.querySelectorAll('.leg-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 500);
}

function animateCountUp() {
  document.querySelectorAll('.count-up').forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1600;
    const step = 16;
    const steps = duration / step;
    let current = 0;
    const inc = target / steps;
    const timer = setInterval(() => {
      current = Math.min(current + inc, target);
      el.textContent = target >= 1000
        ? Math.round(current).toLocaleString('th-TH')
        : Math.round(current);
      if (current >= target) clearInterval(timer);
    }, step);
  });
}

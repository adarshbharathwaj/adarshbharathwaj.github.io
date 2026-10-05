(() => {
  const stage = document.querySelector('.lorenz-stage');
  const button = document.querySelector('.motion-toggle');
  if (!stage || !button) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'lorenz-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  // Generate the same Lorenz curve as the static fallback, once.
  const points = [];
  let x = 1, y = 1, z = 1;
  function step() {
    const dx = 10 * (y - x);
    const dy = x * (28 - z) - y;
    const dz = x * y - (8 / 3) * z;
    x += 0.005 * dx;
    y += 0.005 * dy;
    z += 0.005 * dz;
  }
  for (let i = 0; i < 2000; i++) step();
  for (let i = 0; i < 4800; i++) {
    step();
    if (i % 3 === 0) points.push([x, y, z - 25]);
  }

  const projected = new Float32Array(points.length * 2);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  let paused = reducedMotion.matches;
  let visible = false;
  let angle = 0;
  let frame = null;
  let lastTime = null;

  function draw() {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const [px, depth, height] = points[i];
      const u = px * cos + depth * sin;
      const v = -height * Math.cos(0.18) + (depth * cos - px * sin) * Math.sin(0.18);
      projected[i * 2] = u;
      projected[i * 2 + 1] = v;
      minX = Math.min(minX, u); maxX = Math.max(maxX, u);
      minY = Math.min(minY, v); maxY = Math.max(maxY, v);
    }
    const scale = Math.min(350 / (maxX - minX), 300 / (maxY - minY));
    const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
    ctx.clearRect(0, 0, 420, 380);

    ctx.beginPath();
    ctx.moveTo(30, 190); ctx.lineTo(390, 190);
    ctx.moveTo(210, 20); ctx.lineTo(210, 360);
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = '#d9dfd5';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';

    function trace(start, color, width) {
      ctx.beginPath();
      for (let i = start; i < points.length; i++) {
        const u = 210 + (projected[i * 2] - midX) * scale;
        const v = 190 + (projected[i * 2 + 1] - midY) * scale;
        if (i === start) ctx.moveTo(u, v);
        else ctx.lineTo(u, v);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    trace(0, 'rgba(40, 101, 76, 0.32)', 0.8);
    trace(points.length - 210, 'rgba(40, 101, 76, 0.75)', 1.1);
  }

  function resize() {
    const width = stage.getBoundingClientRect().width;
    if (width === 0) return;
    // Cap pixel density to keep the illustration inexpensive on phones.
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(width * 380 / 420 * density);
    ctx.setTransform(canvas.width / 420, 0, 0, canvas.height / 380, 0, 0);
    draw();
  }

  function tick(time) {
    frame = null;
    if (lastTime === null) lastTime = time;
    const elapsed = time - lastTime;
    const interval = 1000 / (coarsePointer.matches ? 24 : 30);
    if (elapsed >= interval) {
      // One complete turn every 48 seconds. Do not jump after a tab sleeps.
      angle = (angle + Math.min(elapsed, 100) * Math.PI * 2 / 48000) % (Math.PI * 2);
      lastTime = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-label', paused ? 'Play Lorenz animation' : 'Pause Lorenz animation');
    const running = !paused && visible && !document.hidden;
    if (running && frame === null) {
      lastTime = null;
      frame = requestAnimationFrame(tick);
    } else if (!running && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
    }
  }

  button.addEventListener('click', () => {
    paused = !paused;
    syncMotion();
  });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncMotion();
  });
  visibilityObserver.observe(stage);

  resize();
  stage.appendChild(canvas);
  stage.classList.add('is-animated');
  button.hidden = false;
  syncMotion();
})();

(() => {
  const root = document.documentElement;
  const sections = [...document.querySelectorAll('main > section')];
  if (sections.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const threshold = 0.2;
  const duration = 340;
  let lastY = window.scrollY;
  let direction = 1;
  let timer = null;
  let frame = null;
  let touching = false;

  function cancel() {
    clearTimeout(timer);
    timer = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    root.classList.remove('is-snapping');
  }

  function ranges() {
    const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const maximum = Math.max(0, root.scrollHeight - window.innerHeight);
    const result = sections.map(section => {
      const rect = section.getBoundingClientRect();
      const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
      const areaTop = rect.top + window.scrollY - margin;
      const bottom = rect.bottom + window.scrollY;
      const start = Math.max(0, Math.min(maximum, areaTop - padding));
      // A taller section needs a free scrolling range to reveal all its content.
      const end = bottom - areaTop > window.innerHeight + 1
        ? Math.max(start, Math.min(maximum, bottom - window.innerHeight))
        : start;
      return { start, end };
    });
    result.push({ start: maximum, end: maximum });
    return result;
  }

  function animate(destination) {
    const from = window.scrollY;
    if (Math.abs(destination - from) < 2) return;
    root.classList.add('is-snapping');
    let started = null;
    function tick(time) {
      if (started === null) started = time;
      const progress = Math.min(1, (time - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, from + (destination - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        frame = null;
        lastY = window.scrollY;
        root.classList.remove('is-snapping');
      }
    }
    frame = requestAnimationFrame(tick);
  }

  function settle() {
    timer = null;
    if (reducedMotion.matches || touching || document.hidden) return;
    const y = window.scrollY;
    const panels = ranges();
    if (panels.some(panel => y >= panel.start - 2 && y <= panel.end + 2)) return;
    for (let i = 0; i < panels.length - 1; i++) {
      const previous = panels[i], next = panels[i + 1];
      if (y <= previous.end || y >= next.start) continue;
      const gap = next.start - previous.end;
      const forward = direction > 0;
      const traveled = forward ? y - previous.end : next.start - y;
      const advance = traveled / gap >= threshold;
      animate(forward === advance ? next.start : previous.end);
      break;
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (!reducedMotion.matches && !touching) timer = setTimeout(settle, 90);
  }

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (frame === null) direction = Math.sign(y - lastY) || direction;
    lastY = y;
    if (frame === null) schedule();
  }, { passive: true });

  // Keep browser input native; a new gesture interrupts the settling animation.
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('pointerdown', cancel, { passive: true });
  window.addEventListener('touchstart', () => { touching = true; cancel(); }, { passive: true });
  function endTouch() { touching = false; schedule(); }
  window.addEventListener('touchend', endTouch, { passive: true });
  window.addEventListener('touchcancel', endTouch, { passive: true });
  document.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) cancel();
  });
  window.addEventListener('resize', () => { cancel(); lastY = window.scrollY; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  window.addEventListener('pageshow', () => { cancel(); lastY = window.scrollY; });

  function syncPreference() {
    cancel();
    root.classList.toggle('early-snap', !reducedMotion.matches);
    lastY = window.scrollY;
  }
  reducedMotion.addEventListener('change', syncPreference);
  syncPreference();
})();

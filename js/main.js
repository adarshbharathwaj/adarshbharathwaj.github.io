console.log("Website loaded successfully!");

const main = document.querySelector('main');
const char = document.querySelector('.nav-character');
const navbar = document.querySelector('.navbar');
const navLinks = Array.from(document.querySelectorAll('.navbar nav a'));

char.classList.add('idle');

let charPos = 0;
const speed = 3;
const keys = { left: false, right: false };
let activeLink = null;
let isMoving = false;
let currentAnimHandler = null;
let animTimer = null;

function clearAnimHandler() {
    if (currentAnimHandler) {
        char.removeEventListener('animationend', currentAnimHandler);
        currentAnimHandler = null;
    }
}

function cancelScheduledAnimation() {
    if (animTimer !== null) {
        clearTimeout(animTimer);
        animTimer = null;
    }
}

function setMovementState(moving) {
    if (moving === isMoving) return;
    isMoving = moving;
    if (moving) {
        clearAnimHandler();
        cancelScheduledAnimation();
        char.classList.remove('idle', 'anim1', 'anim2');
    } else {
        char.classList.remove('anim1', 'anim2');
        char.classList.add('idle');
        scheduleNextAnimation();
    }
}

function getBounds() {
    if (navLinks.length === 0) return { minPos: 0, maxPos: 0 };
    const first = navLinks[0];
    const last = navLinks[navLinks.length - 1];
    const padding = 40;
    const charWidth = char.offsetWidth;
    const charLeft = char.offsetLeft;
    const minPos = first.offsetLeft - padding - charLeft;
    const maxPos = last.offsetLeft + last.offsetWidth + padding - charWidth - charLeft;
    return { minPos, maxPos };
}

function spawnSprite() {
    if (navLinks.length === 0) return;
    const first = navLinks[0];
    const gap = 12;
    charPos = first.offsetLeft - gap - char.offsetWidth - char.offsetLeft;
    const { minPos, maxPos } = getBounds();
    if (charPos < minPos) charPos = minPos;
    if (charPos > maxPos) charPos = maxPos;
    char.style.transform = `translate3d(${charPos}px, 0, 0)`;
}

function getCurrentLink() {
    const charRect = char.getBoundingClientRect();
    const charCenter = charRect.left + charRect.width / 2;
    let best = null;
    let bestDist = Infinity;
    for (const link of navLinks) {
        const r = link.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(charCenter - center);
        if (dist < bestDist) { bestDist = dist; best = link; }
    }
    return best;
}

function updateActiveLink() {
    const link = getCurrentLink();
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove('nav-active');
    if (link) link.classList.add('nav-active');
    activeLink = link;
}

function updateChar() {
    let v = 0;
    if (keys.right) v += speed;
    if (keys.left) v -= speed;
    charPos += v;

    const { minPos, maxPos } = getBounds();
    if (charPos < minPos) charPos = minPos;
    if (charPos > maxPos) charPos = maxPos;

    char.style.transform = `translate3d(${charPos}px, 0, 0)`;
    setMovementState(v !== 0);
    updateActiveLink();
    if (typeof updateLineFromScroll === 'function') updateLineFromScroll();
    requestAnimationFrame(updateChar);
}

const transitionOverlay = document.querySelector('.transition-overlay');
const transitionSvg = document.getElementById('transition-svg');
const SVG_NS = 'http://www.w3.org/2000/svg';
let transitionVivus = null;

// Compute a partial sum of the Riemann zeta function on the critical line:
//   zeta(1/2 + i t) ≈ sum_{n=1..N} 1/n^(1/2 + i t)
// Trace the curve in the complex plane (Re on x, Im on y) as t sweeps a range,
// producing the loopy spirograph that passes near the origin at each nontrivial zero.
function computeZetaSamples(samples, tMin, tMax, terms) {
    const points = new Array(samples + 1);
    const lnTable = new Array(terms + 1);
    const invSqrt = new Array(terms + 1);
    for (let n = 1; n <= terms; n++) {
        lnTable[n] = Math.log(n);
        invSqrt[n] = 1 / Math.sqrt(n);
    }
    for (let i = 0; i <= samples; i++) {
        const t = tMin + (tMax - tMin) * (i / samples);
        let re = 0, im = 0;
        for (let n = 1; n <= terms; n++) {
            re += invSqrt[n] * Math.cos(t * lnTable[n]);
            im -= invSqrt[n] * Math.sin(t * lnTable[n]);
        }
        points[i] = [re, im];
    }
    return points;
}

function pointsToPathD(points, viewW, viewH, pad) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const scale = Math.min((viewW - 2 * pad) / w, (viewH - 2 * pad) / h);
    const offX = (viewW - w * scale) / 2 - minX * scale;
    const offY = (viewH - h * scale) / 2 - minY * scale;
    const mapped = points.map(([x, y]) => [x * scale + offX, y * scale + offY]);
    if (mapped.length === 0) return '';
    if (mapped.length === 1) {
        return `M ${mapped[0][0].toFixed(2)} ${mapped[0][1].toFixed(2)}`;
    }
    // Smooth via quadratic Beziers through segment midpoints: each sample is a
    // control point, and the curve passes through the midpoint of consecutive
    // samples — gives C1-continuity so the stroke reads as one flowing curve.
    let d = `M ${mapped[0][0].toFixed(2)} ${mapped[0][1].toFixed(2)} `;
    for (let i = 1; i < mapped.length - 1; i++) {
        const [cx, cy] = mapped[i];
        const [nx, ny] = mapped[i + 1];
        const mx = (cx + nx) / 2;
        const my = (cy + ny) / 2;
        d += `Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)} `;
    }
    const last = mapped[mapped.length - 1];
    d += `L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
    return d;
}

// Split the zeta trace at the heights of the first nontrivial zeros so each
// "loop" of the curve becomes its own <path> element. Vivus then animates them
// in cascade (delayed mode) — first loop draws, second begins before the first
// is done, and so on, giving a wave-like reveal of the full curve.
const ZETA_T_MAX = 32;
const ZETA_ZEROS = [14.134725, 21.022040, 25.010858, 30.424876];
const ZETA_SPLITS = [0, ...ZETA_ZEROS, ZETA_T_MAX];
const ZETA_TERMS = 80;
const ZETA_SAMPLES_PER_UNIT_T = 24;

function computeBoundsFromAllSegments(segments) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const seg of segments) {
        for (const [x, y] of seg) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    return { minX, maxX, minY, maxY };
}

function buildSegmentPath(points, scale, offX, offY) {
    if (points.length === 0) return '';
    const mapped = points.map(([x, y]) => [x * scale + offX, y * scale + offY]);
    if (mapped.length === 1) {
        return `M ${mapped[0][0].toFixed(2)} ${mapped[0][1].toFixed(2)}`;
    }
    let d = `M ${mapped[0][0].toFixed(2)} ${mapped[0][1].toFixed(2)} `;
    for (let i = 1; i < mapped.length - 1; i++) {
        const [cx, cy] = mapped[i];
        const [nx, ny] = mapped[i + 1];
        const mx = (cx + nx) / 2;
        const my = (cy + ny) / 2;
        d += `Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)} `;
    }
    const last = mapped[mapped.length - 1];
    d += `L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
    return d;
}

if (transitionSvg && typeof Vivus !== 'undefined') {
    const segments = [];
    for (let i = 0; i < ZETA_SPLITS.length - 1; i++) {
        const tStart = ZETA_SPLITS[i];
        const tEnd = ZETA_SPLITS[i + 1];
        const samples = Math.max(40, Math.round((tEnd - tStart) * ZETA_SAMPLES_PER_UNIT_T));
        segments.push(computeZetaSamples(samples, tStart, tEnd, ZETA_TERMS));
    }
    const { minX, maxX, minY, maxY } = computeBoundsFromAllSegments(segments);
    const viewW = 100, viewH = 60, pad = 3;
    const w = (maxX - minX) || 1;
    const h = (maxY - minY) || 1;
    const scale = Math.min((viewW - 2 * pad) / w, (viewH - 2 * pad) / h);
    const offX = (viewW - w * scale) / 2 - minX * scale;
    const offY = (viewH - h * scale) / 2 - minY * scale;

    for (const seg of segments) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('class', 'transition-path');
        path.setAttribute('d', buildSegmentPath(seg, scale, offX, offY));
        transitionSvg.appendChild(path);
    }

    transitionVivus = new Vivus('transition-svg', {
        type: 'delayed',
        duration: 200,
        start: 'manual',
        animTimingFunction: Vivus.EASE_IN_OUT
    });
    transitionVivus.setFrameProgress(0);
}

function smoothScrollTo(target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Scroll-driven line animation, cumulative across the entire page.
//
// Two simple, fully decoupled mappings:
//   1. progress = scrollTop / maxScroll  (one continuous global meter,
//      so the curve never resets — it's the same line picking up where
//      it left off)
//   2. opacity  = distance-to-nearest-section, normalized
//      (line is invisible at section snap points, fully visible at
//      pause snap points and during smooth-scroll between them)
//
// No cycle logic, no per-step snap math. Sampled every animation frame so
// it's robust to whatever the browser does between snap points.
const sectionElements = Array.from(document.querySelectorAll('main .snap-section'));

function updateLineFromScroll() {
    if (!transitionVivus || !transitionOverlay) return;
    const vh = main.clientHeight;
    if (vh === 0) return;
    const scrollTop = main.scrollTop;
    const maxScroll = main.scrollHeight - vh;
    if (maxScroll <= 0) {
        transitionOverlay.style.opacity = 0;
        return;
    }

    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    let minDist = Infinity;
    for (const sec of sectionElements) {
        const d = Math.abs(scrollTop - sec.offsetTop);
        if (d < minDist) minDist = d;
    }
    const distRatio = minDist / vh;
    const opacity = Math.max(0, Math.min(1, (distRatio - 0.08) / 0.3));

    transitionVivus.setFrameProgress(progress);
    transitionOverlay.style.opacity = opacity;
}

let scrollRafScheduled = false;
main.addEventListener('scroll', () => {
    if (!scrollRafScheduled) {
        scrollRafScheduled = true;
        requestAnimationFrame(() => {
            updateLineFromScroll();
            scrollRafScheduled = false;
        });
    }
}, { passive: true });

function activateCurrentLink() {
    const link = getCurrentLink();
    if (!link) return;
    const href = link.getAttribute('href');
    const target = href ? document.querySelector(href) : null;
    if (target) smoothScrollTo(target);
}

const SURPRISE_WORD = 'surprise';
let typedBuffer = '';

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'Up') {
        e.preventDefault();
        if (!e.repeat) activateCurrentLink();
    }
    else if (/^[a-zA-Z]$/.test(e.key)) {
        typedBuffer = (typedBuffer + e.key.toLowerCase()).slice(-SURPRISE_WORD.length);
        if (typedBuffer === SURPRISE_WORD) {
            typedBuffer = '';
            window.location.href = 'surprise/';
        }
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowLeft') keys.left = false;
});

navLinks.forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) smoothScrollTo(target);
    });
});

function playRandomAnimation() {
    if (isMoving) return;
    clearAnimHandler();

    const anims = ['anim1', 'anim2'];
    const chosenAnim = anims[Math.floor(Math.random() * anims.length)];

    char.classList.remove('idle', 'anim1', 'anim2');
    void char.offsetWidth;
    char.classList.add(chosenAnim);

    const handler = () => {
        char.classList.remove(chosenAnim);
        if (!isMoving) char.classList.add('idle');
        clearAnimHandler();
    };
    currentAnimHandler = handler;
    char.addEventListener('animationend', handler);
}

function scheduleNextAnimation() {
    cancelScheduledAnimation();
    if (isMoving) return;
    const delay = Math.random() * 4000 + 4000;
    animTimer = setTimeout(() => {
        animTimer = null;
        if (isMoving) return;
        playRandomAnimation();
        scheduleNextAnimation();
    }, delay);
}

function preloadImages() {
    const images = [
        'assets/images/idle-sheet.png',
        'assets/images/anim1-sheet.png',
        'assets/images/anim2-sheet.png'
    ];
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    char.classList.add('idle');
    spawnSprite();
    updateLineFromScroll();
    requestAnimationFrame(updateChar);
    setTimeout(scheduleNextAnimation, 3000);
});

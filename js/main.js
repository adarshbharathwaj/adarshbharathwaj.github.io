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
    requestAnimationFrame(updateChar);
}

const transitionOverlay = document.querySelector('.transition-overlay');
const transitionPath = document.querySelector('.transition-path');
let transitionPathLength = 0;

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

if (transitionPath) {
    // t up to ~32 traces past the first 5 nontrivial zeros: 14.13, 21.02, 25.01, 30.42
    const zetaPoints = computeZetaSamples(700, 0, 32, 80);
    transitionPath.setAttribute('d', pointsToPathD(zetaPoints, 100, 60, 3));
    transitionPathLength = transitionPath.getTotalLength();
    transitionPath.style.strokeDasharray = transitionPathLength;
    transitionPath.style.strokeDashoffset = transitionPathLength;
}

function smoothScrollTo(target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Scrubbed line animation driven by scrollTop.
//
// Layout: [section][pause][pause][section][pause][pause]... — every snap-point
// is one viewport tall, with two pauses between sections so the draw spans
// two wheel-ticks instead of one. Each section transition is a 3-step cycle:
//   step 0 (section -> pause-a): draw 0% -> 50%
//   step 1 (pause-a  -> pause-b): draw 50% -> 100% (full graph held at end)
//   step 2 (pause-b  -> next section): line stays full, opacity fades to 0
function updateLineFromScroll() {
    if (!transitionPath || !transitionOverlay) return;
    const vh = main.clientHeight;
    if (vh === 0) return;
    const scrollTop = main.scrollTop;
    const unit = scrollTop / vh;
    const step = Math.floor(unit);
    const frac = unit - step;
    const cycleStep = step % 3;

    let progress, opacity;
    if (cycleStep === 0) {
        progress = frac * 0.5;
        opacity = Math.min(frac * 3, 1);
    } else if (cycleStep === 1) {
        progress = 0.5 + frac * 0.5;
        opacity = 1;
    } else {
        progress = 1;
        opacity = Math.max(1 - frac * 1.6, 0);
    }

    transitionPath.style.strokeDashoffset = transitionPathLength * (1 - progress);
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

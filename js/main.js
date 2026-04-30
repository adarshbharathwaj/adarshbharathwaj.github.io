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
    const navWidth = navbar.getBoundingClientRect().width;
    const charWidth = char.offsetWidth;
    const naturalOffset = char.offsetLeft;
    const padding = 8;
    const minPos = padding - naturalOffset;
    const maxPos = navWidth - charWidth - padding - naturalOffset;
    return { minPos, maxPos };
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

function smoothScrollTo(target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
    char.style.transform = 'translate3d(0, 0, 0)';
    requestAnimationFrame(updateChar);
    setTimeout(scheduleNextAnimation, 3000);
});

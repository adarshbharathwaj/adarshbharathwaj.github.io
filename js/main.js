console.log("Website loaded successfully!");

const main = document.querySelector('main');
const char = document.querySelector('.nav-character');
const navbar = document.querySelector('.navbar');
const navLinks = Array.from(document.querySelector('.navbar nav a'));

char.classList.add('idle');

let charPos = 0;
const speed = 3;
const keys = { left : false, right : false };
let activeLink = null;

function getBounds() {
    const navRect = navbar.getBoundingClientRect();
    const charRect = char.getBoundingClientRect();
    const naturalLeft = charRect.left - charPos;
    const padding = 8;
    const minPos = navRect.left + padding - naturalLeft;
    const maxPos = navRect.right - charRect.width - padding - naturalLeft;
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
        if (dist < bestDist) {
            bestDist = dist;
            best = link;
        }
        return best;
    }
}

function updateActiveLink() {
    const link = getCurrentLink();
    if (link === activeLink)  return;
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
    updateActiveLink();
    requestAnimationFrame(updateChar);
}

function smoothScrollTo(target) {
    const start = main.scrollTop;
    const end = target.offsetTop;
    const duration = 500;
    const startTime = performance.now();
    function animateScroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        main.scrollTop = start + (end - start) * ease;
        if (elapsed < duration) requestAnimationFrame(animateScroll);
    }
    requestAnimationFrame(animateScroll);
}

function activateCurrentLink() {
    const link = activeLink || getCurrentLink();
    if (!link) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (target) smoothScrollTo(target);
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowUp') { activateCurrentLink(); e.preventDefault(); }
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
    const anims = ['anim1', 'anim2'];
    const chosenAnim = anims[Math.floor(Math.random() * anims.length)];
    char.classList.remove('idle', 'anim1', 'anim2');

    void char.offsetWidth;

    char.classList.add(chosenAnim);

    const handler = () => {
        char.classList.remove(chosenAnim);
        char.classList.add('idle');
        char.removeEventListener('animationend', handler);
    };


    char.addEventListener('animationend', handler);
}

function scheduleNextAnimation() {
    const delay = Math.random() * 4000 + 4000;
    setTimeout(() => {
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
console.log("Website loaded successfully!");

const main = document.querySelector('main');
const char = document.querySelector('.nav-character');

char.classList.add('idle');
char.style.transform = 'translateX(0px)';

let charPos = 0;
let velocity = 0;
const friction = 0.8;
const speed = 2;
const maxOffset = 100;

function updateChar() {
    velocity *= friction;
    charPos += velocity;

    charPos = Math.max(-maxOffset, Math.min(maxOffset, charPos));

    char.style.transform = `translate(${charPos}px)`;
    requestAnimationFrame(updateChar);
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') velocity = speed;
    if (e.key == 'ArrowLeft') velocity = -speed;
    char.style.transform = `translateX(${charPos}px)`;
});

updateChar();

document.querySelectorAll('.navbar a').forEach( anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;

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
    });
});

function playRandomAnimation() {
    const anims = ['anim1', 'anim2'];
    const chosenAnim = anims[Math.floor(Math.random() * anims.length)];

    if (char.classList.contains(chosenAnim)) return;

    char.classList.remove('idle', 'anim1', 'anim2');
    void char.offsetWidth;

    char.classList.add(chosenAnim);

    const handler = () => {
        char.classList.remove(chosenAnim);
        char.classList.add('idle');
        char.removeEventListener('animationend', handler);
    }


    char.addEventListener('animationend', handler);
}

function scheduleNextAnimation() {
    const delay = Math.random() * 4000 + 4000;
    setTimeout( () => {
        playRandomAnimation();
        scheduleNextAnimation();
    }, delay);
}

window.addEventListener('DOMContentLoaded', () => {
    char.classList.add('idle');
    char.style.transform = 'translateX(0px)';
    updateChar();
    setTimeout(scheduleNextAnimation, 3000);
});
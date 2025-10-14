console.log("Website loaded successfully!");

const main = document.querySelector('main');
const char = document.querySelector('.nav-character');

let charPos = 0;
let velocity = 0;
const friction = 0.8;
const speed = 2;

function updateChar() {
    velocity *= friction;
    charPos += velocity;
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
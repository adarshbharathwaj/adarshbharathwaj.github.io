console.log("Website loaded successfully!");

const main = document.querySelector('main');
const char = document.querySelector('.nav-character');

let charPos = 0;
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') charPos += 10;
    if (e.key == 'ArrowLeft') charPos -= 10;
    char.style.transform = `translateX(${charPos}px)`;
});

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
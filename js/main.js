console.log("Website loaded successfully!");

const char = document.querySelector('.nav-character');

let charPos = 0;
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') charPos += 10;
    if (e.key == 'ArrowLeft') charPos -= 10;
    char.style.transform = `translateX(${charPos}px)`;
});
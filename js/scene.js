import * as THREE from './three.module.min.js';

// Lorenz strange attractor — slow-orbiting camera background scene with
// scroll-driven camera panning via GSAP ScrollTrigger.
//
// Numerical integration of the Lorenz system (sigma=10, rho=28, beta=8/3)
// produces the classic butterfly. We carry a circular trail of N recent
// integration steps in a Float32Array; each frame, copyWithin shifts the
// buffer left by one point, the latest integration result is written at the
// head, and a static color gradient gives the trail its "bright head, faded
// tail" look.

const canvas = document.getElementById('bg-canvas');
if (canvas) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Lorenz parameters: classic chaotic regime
    const SIGMA = 10;
    const RHO   = 28;
    const BETA  = 8 / 3;
    const DT    = 0.005;
    const STEPS_PER_FRAME = 4;

    let state = [1.0, 1.0, 1.0];

    function step() {
        const [x, y, z] = state;
        const dx = SIGMA * (y - x);
        const dy = x * (RHO - z) - y;
        const dz = x * y - BETA * z;
        state = [x + dx * DT, y + dy * DT, z + dz * DT];
    }

    // Burn-in so we start ON the attractor (not on the transient leading to it)
    for (let i = 0; i < 2000; i++) step();

    const N = 4000;
    const positions = new Float32Array(N * 3);
    const colors    = new Float32Array(N * 3);

    // Map Lorenz axes -> Three.js axes so the attractor's natural vertical
    // (Lorenz Z, ~0..50) becomes Three.js Y (up). Centered around origin.
    function writeHead(idx) {
        positions[idx * 3]     = state[0];
        positions[idx * 3 + 1] = state[2] - 25;
        positions[idx * 3 + 2] = state[1];
    }

    for (let i = 0; i < N; i++) {
        step();
        writeHead(i);
    }

    // Static color gradient toward gold #e6c821 = (0.902, 0.784, 0.129).
    // Higher exponent (2.4) produces a sharper falloff so most of the trail
    // is dim and only the leading head reads bright — visually thinner.
    const GOLD_R = 0.902;
    const GOLD_G = 0.784;
    const GOLD_B = 0.129;
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const intensity = Math.pow(t, 2.4);
        colors[i * 3]     = intensity * GOLD_R;
        colors[i * 3 + 1] = intensity * GOLD_G;
        colors[i * 3 + 2] = intensity * GOLD_B;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    // Lower opacity reduces the additive bloom so the line reads thinner
    // overall (WebGL ignores stroke-width on Line, so opacity is the lever).
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Camera state: scroll progress 0..1 drives a helical orbit (~1.5 turns
    // around the attractor while rising) plus a slow constant drift so the
    // scene never feels frozen when the user is stationary.
    const ORBIT_RADIUS = 70;
    const SCROLL_TURNS = 1.5;
    const HEIGHT_START = -10;
    const HEIGHT_END   = 35;
    const DRIFT_SPEED  = 0.0004; // rad/frame

    const cameraScroll = { progress: 0 };
    let driftAngle = 0;

    // GSAP ScrollTrigger: tie cameraScroll.progress to scroll position of
    // <main> (our scroll container, not window). Scrub: 0.6 adds a tiny
    // rubber-band lag so the camera glides instead of locking 1:1 to scroll.
    const main = document.querySelector('main');
    if (window.gsap && window.ScrollTrigger && main) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.timeline({
            scrollTrigger: {
                scroller: main,
                trigger: main,
                start: 'top top',
                end: () => `+=${main.scrollHeight - main.clientHeight}`,
                scrub: 0.6
            }
        }).to(cameraScroll, { progress: 1, duration: 1, ease: 'none' });
    }

    function tick() {
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
            positions.copyWithin(0, 3);
            step();
            writeHead(N - 1);
        }
        geometry.attributes.position.needsUpdate = true;

        driftAngle += DRIFT_SPEED;
        const angle = cameraScroll.progress * Math.PI * 2 * SCROLL_TURNS + driftAngle;
        const height = HEIGHT_START + cameraScroll.progress * (HEIGHT_END - HEIGHT_START);
        camera.position.set(
            Math.cos(angle) * ORBIT_RADIUS,
            height,
            Math.sin(angle) * ORBIT_RADIUS
        );
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    tick();
}

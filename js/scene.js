import * as THREE from './three.module.min.js';

// Lorenz strange attractor — slow-orbiting camera background scene.
//
// Numerical integration of the Lorenz system (sigma=10, rho=28, beta=8/3)
// produces the classic butterfly. We carry a circular trail of N recent
// integration steps in a Float32Array; each frame, copyWithin shifts the
// buffer left by one point, the latest integration result is written at the
// head, and a static color gradient gives the trail its "bright head, faded
// tail" look. AdditiveBlending + thin lines is enough to read as a glowing
// curve on a dark background without needing any post-processing.

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
    // (Lorenz Z, ~0..50) becomes Three.js Y (up). Centered around origin by
    // subtracting 25 from Z.
    function writeHead(idx) {
        positions[idx * 3]     = state[0];
        positions[idx * 3 + 1] = state[2] - 25;
        positions[idx * 3 + 2] = state[1];
    }

    for (let i = 0; i < N; i++) {
        step();
        writeHead(i);
    }

    // Static color gradient: index 0 (oldest) faintest, index N-1 (newest) full
    // cyan #00ffc8 = (0, 1.0, 0.78). As the buffer shifts each frame, points
    // age toward index 0, so a point's brightness naturally fades over time.
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const intensity = Math.pow(t, 1.6);
        colors[i * 3]     = 0;
        colors[i * 3 + 1] = intensity * 1.0;
        colors[i * 3 + 2] = intensity * 0.78;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Slow orbital camera: ~100 sec per revolution at 60 fps, slight elevation
    // for a 3/4 view of the butterfly.
    const ORBIT_RADIUS = 70;
    const ORBIT_HEIGHT = 10;
    const ORBIT_SPEED  = 0.001;
    let orbitAngle = 0;

    function tick() {
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
            positions.copyWithin(0, 3);
            step();
            writeHead(N - 1);
        }
        geometry.attributes.position.needsUpdate = true;

        orbitAngle += ORBIT_SPEED;
        camera.position.set(
            Math.cos(orbitAngle) * ORBIT_RADIUS,
            ORBIT_HEIGHT,
            Math.sin(orbitAngle) * ORBIT_RADIUS
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

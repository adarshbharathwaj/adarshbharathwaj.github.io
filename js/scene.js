import * as THREE from './three.module.min.js';

// Lorenz strange attractor with scroll-driven camera choreography.
//
// Each section transition follows a 3-phase pattern:
//   1) Dive — camera plunges in close to the attractor and starts following
//      a point on the curve trail (followStrength ramps 0 -> 1).
//   2) Follow — camera trails behind a recent point on the curve, looking
//      ahead toward the head, so it reads as flying along the trace.
//   3) Pull-out — camera swings back out to the next section's framing pose
//      (followStrength ramps back 1 -> 0).
//
// The camera position each frame is a lerp between an "orbit" pose
// (radius/angle/height around origin) and a "follow" pose (offset from a
// trail point). followStrength selects between them. The lookAt target
// likewise lerps between origin and the head of the curve.

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

    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // ---- Camera state driven by GSAP timeline -------------------------------
    // Section views use orbitRadius (far framing). Mid-transition views use a
    // small orbitRadius and followStrength = 1 to engage the curve-follow path.
    const cam = {
        orbitAngle:     0,
        orbitRadius:    50,   // base section framing — closer = bigger attractor
        orbitHeight:    5,
        followStrength: 0     // 0 = orbit, 1 = trail behind curve
    };

    const SECTION_RADIUS = 50;
    const CLOSE_RADIUS   = 14;
    const DRIFT_SPEED    = 0.0004;

    let driftAngle = 0;

    // Reusable Vector3s so the tick loop allocates nothing per frame.
    const orbitPos     = new THREE.Vector3();
    const followPos    = new THREE.Vector3();
    const headPos      = new THREE.Vector3();
    const lookAtTarget = new THREE.Vector3();
    const tmpDir       = new THREE.Vector3();
    const tmpSide      = new THREE.Vector3();
    const upVec        = new THREE.Vector3(0, 1, 0);

    const main = document.querySelector('main');
    if (window.gsap && window.ScrollTrigger && main) {
        gsap.registerPlugin(ScrollTrigger);

        // Total scroll = 4 sections × vh − vh = 3·vh. Three transitions, each
        // ~1/3 of the timeline, broken into dive (5%) + follow (22%) + pull (6%).
        const tl = gsap.timeline({
            scrollTrigger: {
                scroller: main,
                trigger: main,
                start: 'top top',
                end: () => `+=${main.scrollHeight - main.clientHeight}`,
                scrub: 0.5
            }
        });

        function addTransition(diveAngle, followAngle, settleAngle, settleHeight) {
            tl.to(cam, {
                orbitRadius: CLOSE_RADIUS,
                orbitAngle: diveAngle,
                orbitHeight: 0,
                followStrength: 1,
                duration: 0.06,
                ease: 'power2.in'
            });
            tl.to(cam, {
                orbitAngle: followAngle,
                orbitHeight: 4,
                duration: 0.22,
                ease: 'none'
            });
            tl.to(cam, {
                orbitRadius: SECTION_RADIUS,
                orbitAngle: settleAngle,
                orbitHeight: settleHeight,
                followStrength: 0,
                duration: 0.05,
                ease: 'power2.out'
            });
        }

        // Three transitions, each rotates the orbit by ~half a turn and lands
        // at a distinct angle/height for the next section. No two settle poses
        // are alike, so each section feels like a different vantage point.
        addTransition(Math.PI * 0.4, Math.PI * 0.9, Math.PI * 1.1, -10);
        addTransition(Math.PI * 1.5, Math.PI * 2.0, Math.PI * 2.2,   8);
        addTransition(Math.PI * 2.6, Math.PI * 3.1, Math.PI * 3.3,  22);
    }

    function tick() {
        // Integrate Lorenz, shift trail buffer
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
            positions.copyWithin(0, 3);
            step();
            writeHead(N - 1);
        }
        geometry.attributes.position.needsUpdate = true;

        driftAngle += DRIFT_SPEED;

        // Orbit pose around origin
        const a = cam.orbitAngle + driftAngle;
        orbitPos.set(
            Math.cos(a) * cam.orbitRadius,
            cam.orbitHeight,
            Math.sin(a) * cam.orbitRadius
        );

        // Follow pose: trail behind a recent point on the curve, look ahead
        // toward a more recent point (so the camera reads as flying along the
        // trace). Side-offset keeps the camera from being inside the line.
        const trailIdx = N - 1 - 120;
        const aheadIdx = N - 1 - 30;
        followPos.set(
            positions[trailIdx * 3],
            positions[trailIdx * 3 + 1],
            positions[trailIdx * 3 + 2]
        );
        headPos.set(
            positions[aheadIdx * 3],
            positions[aheadIdx * 3 + 1],
            positions[aheadIdx * 3 + 2]
        );
        tmpDir.copy(headPos).sub(followPos).normalize();
        tmpSide.copy(tmpDir).cross(upVec).normalize().multiplyScalar(7);
        followPos.add(tmpSide);

        // Blend between orbit and follow per cam.followStrength
        camera.position.copy(orbitPos).lerp(followPos, cam.followStrength);
        // lerp(origin, headPos, t) === headPos * t  (origin is zero)
        lookAtTarget.copy(headPos).multiplyScalar(cam.followStrength);
        camera.lookAt(lookAtTarget);

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

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ensure renderer canvas is visible
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';

// Game state
let score = 0;
let gameStarted = false;
let difficulty = 'easy';
let droneSpeed = 0.1;
let spawnFrequency = 2000;
let maxDrones = 10;
let lastSpawn = 0;
let stationHealth = 100; // Added health for the nuclear station

// Difficulty settings
const difficultySettings = {
    easy: { speed: 0.1, frequency: 2000, maxDrones: 10 },
    medium: { speed: 0.2, frequency: 1500, maxDrones: 15 },
    hard: { speed: 0.3, frequency: 1000, maxDrones: 20 }
};

// Sound setup (initialize after user interaction)
let synth;
let droneSound;

async function initializeAudio() {
    try {
        await Tone.start();
        synth = new Tone.Synth().toDestination();
        droneSound = new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }
        }).toDestination();

        // Start drone sounds
        setInterval(playDroneSound, 2000);
    } catch (e) {
        console.error("Audio initialization failed:", e);
    }
}

function playDroneSound() {
    if (droneSound && gameStarted) {
        droneSound.triggerAttackRelease("C2", "8n", undefined, 0.3);
    }
}

function playExplosionSound() {
    if (synth && gameStarted) {
        synth.triggerAttackRelease("C4", "16n", undefined, 0.5);
    }
}

// Lighting (increased intensity for better visibility)
const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Increased intensity
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Increased intensity
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Create ground
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a472a });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -10;
scene.add(ground);

// Add trees
function createTree(x, z) {
    const treeGroup = new THREE.Group();
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2800 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    const topGeometry = new THREE.ConeGeometry(2, 6, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x0b5345 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 5;
    treeGroup.add(trunk);
    treeGroup.add(top);
    treeGroup.position.set(x, -8, z);
    return treeGroup;
}

for (let i = 0; i < 50; i++) {
    const tree = createTree(
        Math.random() * 160 - 80,
        Math.random() * 160 - 80
    );
    scene.add(tree);
}

// Nuclear station with three domes (moved to the right side)
const stationGroup = new THREE.Group();
const baseGeometry = new THREE.BoxGeometry(30, 10, 15);
const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const baseBuilding = new THREE.Mesh(baseGeometry, baseMaterial);

function createDome(x) {
    const domeGeometry = new THREE.SphereGeometry(8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshStandardMaterial({ color: 0xa0a0a0 });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(x, 5, 0);
    return dome;
}

stationGroup.add(baseBuilding);
stationGroup.add(createDome(-10));
stationGroup.add(createDome(0));
stationGroup.add(createDome(10));
stationGroup.position.set(50, -5, -50);
scene.add(stationGroup);

// Crosshair (centered scope)
const scopeGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
const scopeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
scope.position.z = -2;

const verticalLineGeometry = new THREE.PlaneGeometry(0.01, 0.2);
const verticalLine = new THREE.Mesh(verticalLineGeometry, scopeMaterial);
verticalLine.position.z = -2;

const horizontalLineGeometry = new THREE.PlaneGeometry(0.2, 0.01);
const horizontalLine = new THREE.Mesh(horizontalLineGeometry, scopeMaterial);
horizontalLine.position.z = -2;

camera.add(scope);
camera.add(verticalLine);
camera.add(horizontalLine);
scene.add(camera);

// RC Plane drones (increased base size)
const drones = [];
function createDrone() {
    const droneGroup = new THREE.Group();

    // Increased base scale for all components
    const baseScale = 2; // Doubled the size (adjustable)

    // Fuselage (longer and narrower)
    const fuselageGeometry = new THREE.CylinderGeometry(0.4 * baseScale, 0.4 * baseScale, 8 * baseScale, 12);
    const droneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const fuselage = new THREE.Mesh(fuselageGeometry, droneMaterial);
    fuselage.rotation.z = Math.PI / 2;

    // Wings (angled for a more realistic look)
    const wingGeometry = new THREE.BoxGeometry(10 * baseScale, 0.2 * baseScale, 2 * baseScale);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.y = 0.2 * baseScale;

    // Tail (vertical stabilizer)
    const tailGeometry = new THREE.BoxGeometry(0.2 * baseScale, 2 * baseScale, 1 * baseScale);
    const tail = new THREE.Mesh(tailGeometry, droneMaterial);
    tail.position.x = -4 * baseScale;
    tail.position.y = 1 * baseScale;

    // Horizontal stabilizer
    const hStabGeometry = new THREE.BoxGeometry(3 * baseScale, 0.2 * baseScale, 1 * baseScale);
    const hStab = new THREE.Mesh(hStabGeometry, droneMaterial);
    hStab.position.x = -4 * baseScale;

    // Propeller (small cone at the front for visual effect)
    const propGeometry = new THREE.ConeGeometry(0.3 * baseScale, 1 * baseScale, 8);
    const prop = new THREE.Mesh(propGeometry, droneMaterial);
    prop.position.x = 4 * baseScale;
    prop.rotation.z = Math.PI;

    droneGroup.add(fuselage);
    droneGroup.add(wing);
    droneGroup.add(tail);
    droneGroup.add(hStab);
    droneGroup.add(prop);

    // Store initial scale for dynamic scaling
    droneGroup.userData.initialScale = baseScale;
    return droneGroup;
}

// Spawn drones from higher altitude
function spawnDrone() {
    if (drones.length >= maxDrones) return;

    const drone = createDrone();
    const radius = 100;
    const theta = Math.random() * Math.PI * 2; // Random angle around the station
    const height = 50 + Math.random() * 50; // Spawn between 50 and 100 units high
    const x = stationGroup.position.x + radius * Math.cos(theta);
    const y = height; // High altitude spawn
    const z = stationGroup.position.z + radius * Math.sin(theta);
    drone.position.set(x, y, z);
    drones.push(drone);
    scene.add(drone);
}

// Explosion effect
function createExplosion(position) {
    const particles = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff4500 : 0xff8c00,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        particle.lifetime = 1.0;
        particles.push(particle);
        scene.add(particle);
    }
    return particles;
}

// Tracer shots array
const tracers = [];
const tracerGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 32);
const tracerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });

// Target lock ring (improved with pulsing effect)
const lockRingGeometry = new THREE.RingGeometry(2, 2.2, 32); // Slightly larger for bigger drones
const lockRingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
const lockRing = new THREE.Mesh(lockRingGeometry, lockRingMaterial);
scene.add(lockRing);

// Camera position (closer to the domes for visibility)
camera.position.set(50, 5, 10); // Moved closer to the domes (x:50 matches station, z:10 brings it nearer)
camera.lookAt(new THREE.Vector3(50, 0, -50)); // Ensure camera faces the station initially

// Mouse controls for aiming and shooting
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isMouseDown = false;
let lastFire = 0;
const fireRate = 0.05; // Rapid fire rate

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update camera rotation with constraints
    const sensitivity = 0.002;
    camera.rotation.y -= event.movementX * sensitivity;
    camera.rotation.x -= event.movementY * sensitivity;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 4, Math.PI / 4);
    camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -Math.PI / 3, Math.PI / 3);
});

document.addEventListener('mousedown', async () => {
    if (!gameStarted) {
        gameStarted = true;
        await initializeAudio();
    }
    isMouseDown = true;
});

document.addEventListener('mouseup', () => isMouseDown = false);

function fireTracer() {
    const tracer = new THREE.Mesh(tracerGeometry, tracerMaterial);
    const startPos = new THREE.Vector3(0, 0, -2);
    startPos.applyQuaternion(camera.quaternion);
    startPos.add(camera.position);
    tracer.position.copy(startPos);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.normalize();

    scene.add(tracer);
    tracers.push({
        mesh: tracer,
        direction: direction,
        speed: 100
    });
}

// Particles array for explosions
let activeParticles = [];

// Update UI elements
function updateUI() {
    document.getElementById('droneCount').textContent = drones.length;
    document.getElementById('score').textContent = score;
    document.getElementById('difficultyDisplay').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

// Check for collisions between tracers and drones
function checkCollisions() {
    tracers.forEach((tracer, tIndex) => {
        drones.forEach((drone, dIndex) => {
            // Adjust hit distance for larger drones
            const hitDistance = 6; // Increased due to larger drone size
            if (tracer.mesh.position.distanceTo(drone.position) < hitDistance) {
                const explosion = createExplosion(drone.position.clone());
                activeParticles.push(explosion);
                playExplosionSound();
                scene.remove(drone);
                drones.splice(dIndex, 1);
                scene.remove(tracer.mesh);
                tracers.splice(tIndex, 1);
                score += 100;
                updateUI();
            }
        });
    });
}

// Animation loop
let pulseTime = 0;
function animate() {
    requestAnimationFrame(animate);

    // Pulse effect for lock ring
    pulseTime += 0.05;
    lockRingMaterial.opacity = 0.5 + 0.3 * Math.sin(pulseTime);

    // Spawn drones based on frequency
    const now = performance.now();
    if (now - lastSpawn > spawnFrequency) {
        spawnDrone();
        lastSpawn = now;
    }

    // Handle continuous firing
    if (isMouseDown) {
        const now = performance.now() / 1000;
        if (now - lastFire > fireRate) {
            fireTracer();
            lastFire = now;
        }
    }

    // Move drones towards the nuclear station (targeting the domes specifically)
    drones.forEach(drone => {
        // Choose a random dome as the target
        const domePositions = [
            new THREE.Vector3(stationGroup.position.x - 10, stationGroup.position.y + 5, stationGroup.position.z),
            new THREE.Vector3(stationGroup.position.x, stationGroup.position.y + 5, stationGroup.position.z),
            new THREE.Vector3(stationGroup.position.x + 10, stationGroup.position.y + 5, stationGroup.position.z)
        ];
        const targetPos = domePositions[Math.floor(Math.random() * 3)];

        // Calculate direction and move
        const direction = targetPos.clone().sub(drone.position).normalize();
        drone.position.add(direction.multiplyScalar(droneSpeed));

        // Gradually descend towards target height
        if (drone.position.y > targetPos.y + 5) {
            drone.position.y -= 0.1;
        }

        // Rotate drone to face target
        drone.lookAt(targetPos);
        drone.rotation.y += Math.PI / 2;

        // Scale drone based on distance to station (larger as it gets closer)
        const distanceToStation = drone.position.distanceTo(stationGroup.position);
        const maxDistance = 100; // Starting distance (spawn radius)
        const minScale = drone.userData.initialScale; // Starting scale
        const maxScale = minScale * 2; // Maximum scale when very close
        const scaleFactor = THREE.MathUtils.clamp(1 - (distanceToStation / maxDistance), 0, 1);
        const newScale = THREE.MathUtils.lerp(minScale, maxScale, scaleFactor);
        drone.scale.set(newScale, newScale, newScale);
    });

    // Update lock-on ring to nearest drone (improved targeting)
    let nearestDrone = null;
    let minDistance = Infinity;
    drones.forEach(drone => {
        if (!drone) return; // Skip if drone is null/undefined
        const distance = camera.position.distanceTo(drone.position);
        if (distance < minDistance && drone.visible) {
            minDistance = distance;
            nearestDrone = drone;
        }
    });
    if (nearestDrone) {
        lockRing.position.copy(nearestDrone.position);
        lockRing.lookAt(camera.position);
        // Scale lock ring with drone size
        const droneScale = nearestDrone.scale.x;
        lockRing.scale.set(droneScale, droneScale, droneScale);
        lockRing.visible = true;
    } else {
        lockRing.visible = false;
    }

    // Update tracers
    tracers.forEach((tracer, index) => {
        tracer.mesh.position.add(tracer.direction.multiplyScalar(tracer.speed * 0.016));
        if (tracer.mesh.position.distanceTo(camera.position) > 100) {
            scene.remove(tracer.mesh);
            tracers.splice(index, 1);
        }
    });

    // Update explosion particles
    activeParticles.forEach((particles, index) => {
        let allExpired = true;
        particles.forEach(particle => {
            if (particle.lifetime > 0) {
                particle.position.add(particle.velocity);
                particle.lifetime -= 0.016;
                particle.material.opacity = particle.lifetime;
                allExpired = false;
            } else {
                scene.remove(particle);
            }
        });
        if (allExpired) {
            activeParticles.splice(index, 1);
        }
    });

    // Check for collisions
    checkCollisions();

    // Check for game over conditions
    if (drones.length === 0 && score > 0) {
        alert('Victory! All drones destroyed!\nFinal Score: ' + score);
        window.location.reload();
    }

    drones.forEach(drone => {
        if (drone.position.distanceTo(stationGroup.position) < 15) {
            alert('Game Over! The nuclear station was destroyed!\nFinal Score: ' + score);
            window.location.reload();
        }
    });

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Set difficulty (global function for HTML buttons)
function setDifficulty(level) {
    difficulty = level;
    droneSpeed = difficultySettings[level].speed;
    spawnFrequency = difficultySettings[level].frequency;
    maxDrones = difficultySettings[level].maxDrones;
    drones.forEach(drone => scene.remove(drone));
    drones.length = 0;
    updateUI();
}

// Initialize UI and start the game
setDifficulty('easy');
updateUI();
animate();
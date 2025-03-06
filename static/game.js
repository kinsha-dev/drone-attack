// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Game state
let score = 0;
let gameStarted = false;
let difficulty = 'easy';
let droneSpeed = 0.1;
let spawnFrequency = 2000;
let maxDrones = 10;
let lastSpawn = 0;

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
    await Tone.start();
    synth = new Tone.Synth().toDestination();
    droneSound = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }
    }).toDestination();

    // Start drone sounds
    setInterval(playDroneSound, 2000);
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

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
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

// Pointer arrow to show target (small cone)
const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 32);
const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const pointerArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
scene.add(pointerArrow);

// RC Plane drones (more detailed shape)
const drones = [];
function createDrone() {
    const droneGroup = new THREE.Group();

    // Fuselage (longer and narrower)
    const fuselageGeometry = new THREE.CylinderGeometry(0.4, 0.4, 8, 12);
    const droneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const fuselage = new THREE.Mesh(fuselageGeometry, droneMaterial);
    fuselage.rotation.z = Math.PI / 2;

    // Wings (angled for a more realistic look)
    const wingGeometry = new THREE.BoxGeometry(10, 0.2, 2);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.y = 0.2;

    // Tail (vertical stabilizer)
    const tailGeometry = new THREE.BoxGeometry(0.2, 2, 1);
    const tail = new THREE.Mesh(tailGeometry, droneMaterial);
    tail.position.x = -4;
    tail.position.y = 1;

    // Horizontal stabilizer
    const hStabGeometry = new THREE.BoxGeometry(3, 0.2, 1);
    const hStab = new THREE.Mesh(hStabGeometry, droneMaterial);
    hStab.position.x = -4;

    // Propeller (small cone at the front for visual effect)
    const propGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const prop = new THREE.Mesh(propGeometry, droneMaterial);
    prop.position.x = 4;
    prop.rotation.z = Math.PI;

    droneGroup.add(fuselage);
    droneGroup.add(wing);
    droneGroup.add(tail);
    droneGroup.add(hStab);
    droneGroup.add(prop);
    return droneGroup;
}

// Spawn drones closer to the horizon
function spawnDrone() {
    if (drones.length >= maxDrones) return;

    const drone = createDrone();
    const radius = 100;
    const theta = Math.random() * Math.PI * 2; // Random angle around the horizon
    const height = -5 + Math.random() * 5; // Low height near the horizon (slightly above ground)
    const x = stationGroup.position.x + radius * Math.cos(theta);
    const y = height; // Keep drones low
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

// Camera position (first-person view)
camera.position.set(0, 2, 20);

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
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 4, Math.PI / 4); // Vertical limit
    camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -Math.PI / 3, Math.PI / 3); // Horizontal limit
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
            const hitDistance = 3;
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
function animate() {
    requestAnimationFrame(animate);

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

        // Keep drones low while moving
        if (drone.position.y > targetPos.y) {
            drone.position.y -= 0.05; // Gradually descend if too high
        }

        // Rotate drone to face target
        drone.lookAt(targetPos);
        drone.rotation.y += Math.PI / 2;
    });

    // Update pointer arrow to point at the nearest drone
    let nearestDrone = null;
    let minDistance = Infinity;
    drones.forEach(drone => {
        const distance = camera.position.distanceTo(drone.position);
        if (distance < minDistance) {
            minDistance = distance;
            nearestDrone = drone;
        }
    });
    if (nearestDrone) {
        pointerArrow.position.copy(camera.position);
        pointerArrow.position.z -= 3; // Position in front of camera
        pointerArrow.lookAt(nearestDrone.position);
    } else {
        pointerArrow.position.set(0, -100, 0); // Hide off-screen if no drones
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
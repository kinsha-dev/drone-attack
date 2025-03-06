// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Set initial size to match device screen
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ensure renderer canvas is visible and responsive
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';

// Game state
let score = 0;
let gameStarted = false;
let difficulty = 'easy';
let droneSpeed = 0.1;
let spawnFrequency = 2000;
let maxDrones = 10;
let lastSpawn = 0;
let stationHealth = 100;
let isPaused = false;
let gameOver = false;

// Health recovery settings
const healthRecoveryRate = 0.5;
const healthRecoveryDelay = 1000;
let lastDamageTime = 0;

// Environmental hazard settings (storm clouds)
const stormClouds = [];
const maxStormClouds = 3;
const stormSpawnFrequency = 10000;
let lastStormSpawn = 0;
const stormDamageRadius = 20;
const stormDamageToDrones = 1;
const stormLightningChance = 0.01;
const stormLightningDamage = 5;

// Camera shake settings
let shakeTime = 0;
const shakeDuration = 2;
const shakeIntensity = 0.5;

// Input control state
const isTouchDevice = 'ontouchstart' in window; // Detect touch device
const mouse = new THREE.Vector2();
let joystickTouchId = null;
let fireTouchId = null;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickDeltaX = 0;
let joystickDeltaY = 0;
let lastFire = 0;
const fireRate = 0.2;

// Difficulty settings
const difficultySettings = {
    easy: { speed: 0.1, frequency: 2000, maxDrones: 10 },
    medium: { speed: 0.2, frequency: 1500, maxDrones: 15 },
    hard: { speed: 0.3, frequency: 1000, maxDrones: 20 }
};

// Sound setup (initialize after user interaction)
let synth;
let droneSound;
let nuclearSynth;

async function initializeAudio() {
    try {
        await Tone.start();
        synth = new Tone.Synth().toDestination();
        droneSound = new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }
        }).toDestination();

        nuclearSynth = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 1, sustain: 0, release: 2 }
        }).toDestination();
        nuclearSynth.volume.value = 5;

        setInterval(playDroneSound, 2000);
    } catch (e) {
        console.error("Audio initialization failed:", e);
    }
}

function playDroneSound() {
    if (droneSound && gameStarted && !isPaused && !gameOver) {
        droneSound.triggerAttackRelease("C2", "8n", undefined, 0.3);
    }
}

function playExplosionSound() {
    if (synth && gameStarted && !isPaused && !gameOver) {
        synth.triggerAttackRelease("C4", "16n", undefined, 0.5);
    }
}

function playNuclearExplosionSound() {
    if (nuclearSynth && gameStarted && !isPaused) {
        nuclearSynth.triggerAttackRelease("C1", "2n", undefined, 1.0);
    }
}

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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

// Nuclear station with three domes
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

// RC Plane drones
const drones = [];
function createDrone() {
    const droneGroup = new THREE.Group();
    const baseScale = 2;

    const fuselageGeometry = new THREE.CylinderGeometry(0.4 * baseScale, 0.4 * baseScale, 8 * baseScale, 12);
    const droneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const fuselage = new THREE.Mesh(fuselageGeometry, droneMaterial);
    fuselage.rotation.z = Math.PI / 2;

    const wingGeometry = new THREE.BoxGeometry(10 * baseScale, 0.2 * baseScale, 2 * baseScale);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.y = 0.2 * baseScale;

    const tailGeometry = new THREE.BoxGeometry(0.2 * baseScale, 2 * baseScale, 1 * baseScale);
    const tail = new THREE.Mesh(tailGeometry, droneMaterial);
    tail.position.x = -4 * baseScale;
    tail.position.y = 1 * baseScale;

    const hStabGeometry = new THREE.BoxGeometry(3 * baseScale, 0.2 * baseScale, 1 * baseScale);
    const hStab = new THREE.Mesh(hStabGeometry, droneMaterial);
    hStab.position.x = -4 * baseScale;

    const propGeometry = new THREE.ConeGeometry(0.3 * baseScale, 1 * baseScale, 8);
    const prop = new THREE.Mesh(propGeometry, droneMaterial);
    prop.position.x = 4 * baseScale;
    prop.rotation.z = Math.PI;

    droneGroup.add(fuselage);
    droneGroup.add(wing);
    droneGroup.add(tail);
    droneGroup.add(hStab);
    droneGroup.add(prop);

    droneGroup.userData.initialScale = baseScale;
    droneGroup.userData.health = 10;
    return droneGroup;
}

// Spawn drones
function spawnDrone() {
    if (drones.length >= maxDrones) return;

    const drone = createDrone();
    const radius = 100;
    const theta = Math.random() * Math.PI * 2;
    const height = 50 + Math.random() * 50;
    const x = stationGroup.position.x + radius * Math.cos(theta);
    const y = height;
    const z = stationGroup.position.z + radius * Math.sin(theta);
    drone.position.set(x, y, z);
    drones.push(drone);
    scene.add(drone);
}

// Storm cloud creation
function createStormCloud() {
    const cloudGeometry = new THREE.SphereGeometry(15, 16, 16);
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.7 });
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    
    const x = Math.random() * 160 - 80;
    const z = Math.random() * 160 - 80;
    const y = 60 + Math.random() * 20;
    cloud.position.set(x, y, z);

    cloud.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        0,
        (Math.random() - 0.5) * 0.05
    );
    return cloud;
}

// Spawn storm clouds
function spawnStormCloud() {
    if (stormClouds.length >= maxStormClouds) return;

    const cloud = createStormCloud();
    stormClouds.push(cloud);
    scene.add(cloud);
}

// Explosion effect (regular)
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

// Nuclear explosion effect
let nuclearCloud = null;
function createNuclearExplosion(position) {
    const largeExplosionParticles = [];
    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff4500 : 0xffff00,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
        particle.lifetime = 2.0;
        largeExplosionParticles.push(particle);
        scene.add(particle);
    }

    const cloudGroup = new THREE.Group();
    const stemGeometry = new THREE.CylinderGeometry(5, 10, 20, 32);
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.8 });
    const stem = new THREE.Mesh(stemGeometry, cloudMaterial);
    stem.position.y = 10;
    cloudGroup.add(stem);

    const capGeometry = new THREE.SphereGeometry(20, 32, 32, 0, Math.PI * 2, 0, Math.PI / 3);
    const cap = new THREE.Mesh(capGeometry, cloudMaterial);
    cap.position.y = 20;
    cloudGroup.add(cap);

    cloudGroup.position.copy(position);
    cloudGroup.userData.lifetime = 5.0;
    nuclearCloud = cloudGroup;
    scene.add(nuclearCloud);

    playNuclearExplosionSound();
    shakeTime = shakeDuration;

    return largeExplosionParticles;
}

// Target lock ring
const lockRingGeometry = new THREE.RingGeometry(2, 2.2, 32);
const lockRingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
const lockRing = new THREE.Mesh(lockRingGeometry, lockRingMaterial);
scene.add(lockRing);

// Camera position
const initialCameraPosition = new THREE.Vector3(50, 5, 10);
camera.position.copy(initialCameraPosition);
camera.lookAt(new THREE.Vector3(50, 0, -50));

// Input controls
const raycaster = new THREE.Raycaster();

// Mouse controls (for non-touch devices)
if (!isTouchDevice) {
    document.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (!isPaused && !gameOver) {
            const sensitivity = 0.002;
            camera.rotation.y -= event.movementX * sensitivity;
            camera.rotation.x -= event.movementY * sensitivity;
            camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 4, Math.PI / 4);
            camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -Math.PI / 3, Math.PI / 3);
        }
    });

    document.addEventListener('mousedown', async () => {
        if (!gameStarted) {
            gameStarted = true;
            await initializeAudio();
        }
        if (!isPaused && !gameOver) {
            fireShot();
        }
    });
}

// Touch controls (for touch devices)
if (isTouchDevice) {
    document.addEventListener('touchstart', (event) => {
        if (!gameStarted) {
            gameStarted = true;
            initializeAudio();
        }
        if (!isPaused && !gameOver) {
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i];
                if (touch.clientX < window.innerWidth / 2 && joystickTouchId === null) {
                    joystickTouchId = touch.identifier;
                    joystickStartX = touch.clientX;
                    joystickStartY = touch.clientY;
                    joystickDeltaX = 0;
                    joystickDeltaY = 0;
                } else if (touch.clientX >= window.innerWidth / 2 && fireTouchId === null) {
                    fireTouchId = touch.identifier;
                    fireShot();
                }
            }
        }
    });

    document.addEventListener('touchmove', (event) => {
        if (!isPaused && !gameOver) {
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i];
                if (touch.identifier === joystickTouchId) {
                    joystickDeltaX = touch.clientX - joystickStartX;
                    joystickDeltaY = touch.clientY - joystickStartY;
                }
            }
        }
    });

    document.addEventListener('touchend', (event) => {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                joystickTouchId = null;
                joystickDeltaX = 0;
                joystickDeltaY = 0;
            } else if (touch.identifier === fireTouchId) {
                fireTouchId = null;
            }
        }
    });
}

// Pause game when tabbed out
document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
    if (isPaused) {
        console.log("Game paused - tabbed out");
    } else {
        console.log("Game resumed - tabbed back in");
    }
});

function fireShot() {
    const now = performance.now() / 1000;
    if (now - lastFire < fireRate) return;
    lastFire = now;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(drones, true);
    if (intersects.length > 0) {
        const intersectedDrone = intersects[0].object.parent;
        if (drones.includes(intersectedDrone)) {
            const explosion = createExplosion(intersectedDrone.position.clone());
            activeParticles.push(explosion);
            playExplosionSound();
            const droneIndex = drones.indexOf(intersectedDrone);
            scene.remove(intersectedDrone);
            drones.splice(droneIndex, 1);
            score += 100;
            updateUI();
        }
    }
}

// Particles array for explosions
let activeParticles = [];

// Update UI elements
function updateUI() {
    document.getElementById('droneCount').textContent = drones.length;
    document.getElementById('score').textContent = score;
    document.getElementById('difficultyDisplay').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    const healthBar = document.getElementById('healthBar');
    if (healthBar) {
        healthBar.style.width = `${stationHealth}%`;
        if (stationHealth > 50) {
            healthBar.style.backgroundColor = 'green';
        } else if (stationHealth > 20) {
            healthBar.style.backgroundColor = 'yellow';
        } else {
            healthBar.style.backgroundColor = 'red';
        }
    }
}

// Animation loop
let pulseTime = 0;
function animate() {
    requestAnimationFrame(animate);

    if (isPaused || (gameOver && shakeTime <= 0)) return;

    pulseTime += 0.05;
    lockRingMaterial.opacity = 0.5 + 0.3 * Math.sin(pulseTime);

    const now = performance.now();
    if (now - lastSpawn > spawnFrequency) {
        spawnDrone();
        lastSpawn = now;
    }

    if (now - lastStormSpawn > stormSpawnFrequency) {
        spawnStormCloud();
        lastStormSpawn = now;
    }

    // Touch-based aiming (only on touch devices)
    if (isTouchDevice && joystickTouchId !== null) {
        const sensitivity = 0.002;
        camera.rotation.y -= joystickDeltaX * sensitivity;
        camera.rotation.x -= joystickDeltaY * sensitivity;
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 4, Math.PI / 4);
        camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -Math.PI / 3, Math.PI / 3);
    }

    let dronesNearStation = false;
    drones.forEach((drone, index) => {
        const domePositions = [
            new THREE.Vector3(stationGroup.position.x - 10, stationGroup.position.y + 5, stationGroup.position.z),
            new THREE.Vector3(stationGroup.position.x, stationGroup.position.y + 5, stationGroup.position.z),
            new THREE.Vector3(stationGroup.position.x + 10, stationGroup.position.y + 5, stationGroup.position.z)
        ];
        const targetPos = domePositions[Math.floor(Math.random() * 3)];

        const direction = targetPos.clone().sub(drone.position).normalize();
        drone.position.add(direction.multiplyScalar(droneSpeed));

        if (drone.position.y > targetPos.y + 5) {
            drone.position.y -= 0.1;
        }

        drone.lookAt(targetPos);
        drone.rotation.y += Math.PI / 2;

        const distanceToStation = drone.position.distanceTo(stationGroup.position);
        const maxDistance = 100;
        const minScale = drone.userData.initialScale;
        const maxScale = minScale * 2;
        const scaleFactor = THREE.MathUtils.clamp(1 - (distanceToStation / maxDistance), 0, 1);
        const newScale = THREE.MathUtils.lerp(minScale, maxScale, scaleFactor);
        drone.scale.set(newScale, newScale, newScale);

        if (distanceToStation < 15) {
            const explosion = createExplosion(drone.position.clone());
            activeParticles.push(explosion);
            playExplosionSound();
            scene.remove(drone);
            drones.splice(index, 1);
            stationHealth -= 10;
            lastDamageTime = now;
            updateUI();
            dronesNearStation = true;
        } else {
            stormClouds.forEach(cloud => {
                const distanceToCloud = drone.position.distanceTo(cloud.position);
                if (distanceToCloud < stormDamageRadius) {
                    drone.userData.health -= stormDamageToDrones * 0.016;
                    if (drone.userData.health <= 0) {
                        const explosion = createExplosion(drone.position.clone());
                        activeParticles.push(explosion);
                        playExplosionSound();
                        scene.remove(drone);
                        drones.splice(index, 1);
                        score += 50;
                        updateUI();
                    }
                }
            });
        }
    });

    stormClouds.forEach((cloud, index) => {
        cloud.position.add(cloud.userData.velocity);

        if (Math.abs(cloud.position.x) > 100 || Math.abs(cloud.position.z) > 100) {
            scene.remove(cloud);
            stormClouds.splice(index, 1);
            return;
        }

        if (Math.random() < stormLightningChance) {
            const distanceToStation = cloud.position.distanceTo(stationGroup.position);
            if (distanceToStation < 50) {
                stationHealth -= stormLightningDamage;
                lastDamageTime = now;
                const explosion = createExplosion(stationGroup.position.clone());
                activeParticles.push(explosion);
                playExplosionSound();
                updateUI();
            }
        }
    });

    if (!dronesNearStation && stationHealth < 100 && now - lastDamageTime > healthRecoveryDelay) {
        stationHealth += healthRecoveryRate * 0.016;
        stationHealth = Math.min(stationHealth, 100);
        updateUI();
    }

    if (stationHealth <= 0 && !gameOver) {
        gameOver = true;
        const nuclearExplosion = createNuclearExplosion(stationGroup.position.clone());
        activeParticles.push(nuclearExplosion);
        setTimeout(() => {
            alert('Game Over! The nuclear station was destroyed!\nFinal Score: ' + score);
            window.location.reload();
        }, 3000);
    }

    let nearestDrone = null;
    let minDistance = Infinity;
    drones.forEach(drone => {
        if (!drone) return;
        const distance = camera.position.distanceTo(drone.position);
        if (distance < minDistance && drone.visible) {
            minDistance = distance;
            nearestDrone = drone;
        }
    });
    if (nearestDrone) {
        lockRing.position.copy(nearestDrone.position);
        lockRing.lookAt(camera.position);
        const droneScale = nearestDrone.scale.x;
        lockRing.scale.set(droneScale, droneScale, droneScale);
        lockRing.visible = true;
    } else {
        lockRing.visible = false;
    }

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

    if (nuclearCloud && nuclearCloud.userData.lifetime > 0) {
        nuclearCloud.userData.lifetime -= 0.016;
        nuclearCloud.children.forEach(child => {
            if (child === nuclearCloud.children[0]) {
                child.scale.y += 0.02;
            } else {
                child.scale.x += 0.05;
                child.scale.z += 0.05;
                child.scale.y += 0.01;
                child.position.y += 0.1;
            }
            child.material.opacity = nuclearCloud.userData.lifetime / 5.0;
        });
        if (nuclearCloud.userData.lifetime <= 0) {
            scene.remove(nuclearCloud);
            nuclearCloud = null;
        }
    }

    if (shakeTime > 0) {
        const shakeFactor = shakeTime / shakeDuration;
        camera.position.x = initialCameraPosition.x + (Math.random() - 0.5) * shakeIntensity * shakeFactor;
        camera.position.y = initialCameraPosition.y + (Math.random() - 0.5) * shakeIntensity * shakeFactor;
        camera.position.z = initialCameraPosition.z + (Math.random() - 0.5) * shakeIntensity * shakeFactor;
        shakeTime -= 0.016;
        if (shakeTime <= 0) {
            camera.position.copy(initialCameraPosition);
        }
    }

    if (drones.length === 0 && score > 0) {
        alert('Victory! All drones destroyed!\nFinal Score: ' + score);
        window.location.reload();
    }

    renderer.render(scene, camera);
}

// Handle window resizing for all devices
function resizeRenderer() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initial resize and resize event listener
resizeRenderer(); // Set initial size explicitly
window.addEventListener('resize', resizeRenderer);

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
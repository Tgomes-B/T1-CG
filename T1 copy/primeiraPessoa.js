import { adicionarInimigoCena } from './inimigo.js';
import { loadEnemyOBJ } from './enemy.js';
import { setupAreaChave, criaChave, recriarPilarComChave } from './areaChave.js';
import { moveElevador, setupArea2, movePorta,setupCacodemonElimination } from './areaElevada.js';
import { movePortaoH } from './areaHangar.js';
import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';
import { CSS2DRenderer } from '../build/jsm/renderers/CSS2DRenderer.js';
import { adicionarBossGLB } from './boss.js';
import { FireEffect } from './Effects.js';

export { isPaused };

// Função auxiliar para encontrar objetos colidíveis
function findCollidables(object, result = []) {
    if (object.userData && object.userData.isCollidable) {
        result.push(object);
    }
    if (object.children && object.children.length > 0) {
        for (const child of object.children) {
            findCollidables(child, result);
        }
    }
    return result;
}
let isPaused = false;
let isRunning = false;
let canJump = false;
let stats, renderer, scene, camera, controls, clock;
let areaChaveData;
let playerHasKey = false;
let spotLightHelper, areas;
let moveForward = false, moveBackward = false, moveLeft = false, 
    moveRight = false, moveUp = false, moveDown = false;

let currentWeaponIndex = 0;
const gravity = 9.8; 
let velocityY = 0;   
const speed = 20;
const WEAPONS = {
    launcher: {
        name: "launcher",
        fireRate: 500,
        showProjectile: true,
        sprite: null,
        spritesheet: "images/sprites/spriteLauncher.png",
        frames: 3,
        create: createRocketLauncherSprite
    },
    chaingun: {
        name: "chaingun",
        fireRate: 100,
        showProjectile: false,
        sprite: null,
        spritesheet: "images/sprites/chaingun.png",
        frames: 3,
        create: createChaingunSprite
    }
};
let currentWeapon = WEAPONS.launcher;
const weaponNames = Object.keys(WEAPONS);

function init() {
    stats = new Stats();
    renderer = initRenderer("rgb(70, 150, 240)");
    scene = new THREE.Scene();
    window.scene = scene; 
    camera = createCamera();

    const loader = new THREE.TextureLoader();
    const skyTexture = loader.load('./images/SkyboxT3/SkyBox2.png');
    skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = skyTexture;

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();
    setupInitialCameraPosition();
    clock = new THREE.Clock();

    window.labelRenderer = new CSS2DRenderer();
    window.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    window.labelRenderer.domElement.style.position = 'absolute';
    window.labelRenderer.domElement.style.top = '0';
    window.labelRenderer.domElement.style.left = '0';
    window.labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(window.labelRenderer.domElement);

    setupEnvironment();
    setupLightingAndCollision();
    setupGameElements();
    setupEventListeners();
}

function setupInitialCameraPosition() {
    controls.getObject().position.set(10, 7, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(
        lookAtTarget, 
        controls.getObject().position
    ).normalize();
    controls.getObject().rotation.y = Math.atan2(direction.x, direction.z);
}

function setupEnvironment() {
    ({ areas } = criaAreasRampas(scene));
    criaParedes(scene);

    const area1 = areas[0];
    const areaLimits = {
        safeMinX: 115,
        safeMaxX: 235,
        safeMinY: 4,
        safeMaxY: 30,
        safeMinZ: -215,
        safeMaxZ: -95
    };

    const enemiesArea1 = [];
    const numEnemies = 5;
    const enemyPositions = [];
    const margin = 15; 

    for (let i = 0; i < numEnemies; i++) {
        enemyPositions.push({
            x: Math.random() * (areaLimits.safeMaxX - areaLimits.safeMinX - 2 * margin) + areaLimits.safeMinX + margin,
            y: Math.random() * (areaLimits.safeMaxY - areaLimits.safeMinY - 2 * margin) + areaLimits.safeMinY + margin,
            z: Math.random() * (areaLimits.safeMaxZ - areaLimits.safeMinZ - 2 * margin) + areaLimits.safeMinZ + margin
        });
    }
    
    let loadedCount = 0;
    enemyPositions.forEach((enemyPos) => {
        loadEnemyOBJ('images/sprites/skull/skull.obj', enemyPos, (enemy) => {
            enemy.position.set(enemyPos.x, enemyPos.y, enemyPos.z);
            scene.add(enemy);
            enemiesArea1.push(enemy);
            if (enemy.userData.boxHelper) scene.add(enemy.userData.boxHelper);
            loadedCount++;
            if (loadedCount === enemyPositions.length) {
                areaChaveData = setupAreaChave(scene, area1, enemiesArea1);

                // ESCONDE A TELA DE LOADING QUANDO TUDO CARREGAR
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) loadingScreen.style.display = 'none';
            }
        });
    });

    setupArea2(scene);

    const torresArea2 = [];
    scene.traverse(obj => {
        if (obj.name === "torre") torresArea2.push(obj);
    });

    const posicoesArea2 = torresArea2.slice(0, 3).map(torre => {
        return {
            x: torre.position.x + 9,
            y: torre.position.y + (torre.geometry ? torre.geometry.parameters.height / 2 + 7 : 20),
            z: torre.position.z
        };
    });
    adicionarInimigoCena(scene, posicoesArea2, () => {
        setTimeout(() => {
            setupCacodemonElimination(scene);
        }, 0);
    });

    const posBoss = new THREE.Vector3(-180, 12, -180);
    adicionarBossGLB(scene, '../0_assetsT3/objects/pain/painElemental.glb', posBoss);
}

function setupLightingAndCollision() {
    setupCollision(scene);
    scene.updateMatrixWorld(true);
    spotLightHelper = setupLighting(scene);
}

function setupGameElements() {
    setupCrosshair();
    currentWeapon.create(); // Adiciona o sprite da arma inicial
    setupShooting(camera, scene, controls, () => currentWeapon, areas);
}

function createCamera() {
    const cam = new THREE.PerspectiveCamera(
        45, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    cam.position.set(-5, 40, -5);
    cam.lookAt(new THREE.Vector3(0, 40, 0));
    cam.name = "camera";
    scene.add(cam);
    return cam;
}

function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.code, true));
    window.addEventListener('keyup', (event) => movementControls(event.code, false));
    window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

    window.addEventListener('keydown', (event) => {
        movementControls(event.code, true);
        if (event.code === "Digit1") {
            currentWeaponIndex = 0;
            switchWeaponByIndex(currentWeaponIndex);
        }
        if (event.code === "Digit2") {
            currentWeaponIndex = 1;
            switchWeaponByIndex(currentWeaponIndex);
        }
    });
    
    window.addEventListener('wheel', (event) => {
        if (event.deltaY < 0) {
            currentWeaponIndex = (currentWeaponIndex + 1) % weaponNames.length;
        } else if (event.deltaY > 0) {
            currentWeaponIndex = (currentWeaponIndex - 1 + weaponNames.length) % weaponNames.length;
        }
        switchWeaponByIndex(currentWeaponIndex);
    });
}

function setupCrosshair() {
    let crosshair = document.getElementById('crosshair');
    if (!crosshair) {
        crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        Object.assign(crosshair.style, {
            position: 'fixed',
            width: '20px',
            height: '20px',
            background: 'url(images/crosshair.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: '1000',
            display: 'none'
        });
        document.body.appendChild(crosshair);
    } else {
        crosshair.style.display = 'none';
    }
}

function switchWeaponByIndex(index) {
    if (index < 0 || index >= weaponNames.length) return;
    const weaponName = weaponNames[index];
    const weapon = WEAPONS[weaponName];
    if (!weapon) return;
    if (currentWeapon.name === weaponName) return;
    removeCurrentWeaponVisual();
    currentWeapon = weapon;
    currentWeapon.create();
}

function createRocketLauncherSprite() {
    const frames = WEAPONS.launcher.frames;
    const texture = new THREE.TextureLoader().load(WEAPONS.launcher.spritesheet);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / frames, 1); // Mostra só 1 frame
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.name = "launcher";
    sprite.scale.set(1.5, 2, 1.5);
    sprite.position.set(0, -1, -3);
    camera.add(sprite);

    WEAPONS.launcher.sprite = sprite;
    WEAPONS.launcher.spriteTexture = texture;
    WEAPONS.launcher.currentFrame = 0;
}

function createChaingunSprite() {
    const frames = WEAPONS.chaingun.frames;
    const texture = new THREE.TextureLoader().load(WEAPONS.chaingun.spritesheet);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / frames, 1);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.name = "chaingun_sprite";
    sprite.scale.set(1.5, 2, 1.5);
    sprite.position.set(0, -1, -3);
    camera.add(sprite);

    WEAPONS.chaingun.sprite = sprite;
    WEAPONS.chaingun.spriteTexture = texture;
    WEAPONS.chaingun.currentFrame = 0;
}

function removeCurrentWeaponVisual() {
    const gun = camera.getObjectByName("launcher");
    if (gun) camera.remove(gun);
    const rocketSprite = camera.getObjectByName("rocketlauncher_sprite");
    if (rocketSprite) camera.remove(rocketSprite);
    const chaingunSprite = camera.getObjectByName("chaingun_sprite");
    if (chaingunSprite) camera.remove(chaingunSprite);
}

function setupControls() {
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock(), false);

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'block';
    });

    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';
    });

    scene.add(controls.getObject());
}

function movementControls(key, value) {
    switch (key) {
        case 'KeyW': case 'ArrowUp': moveForward = value; break;
        case 'KeyS': case 'ArrowDown': moveBackward = value; break;
        case 'KeyA': case 'ArrowLeft': moveLeft = value; break;
        case 'KeyD': case 'ArrowRight': moveRight = value; break;
        case 'Space': moveUp = value; break;
        /*        case 'Space':
            if (value && canJump) {
                velocityY = speed * 1.2; 
                canJump = false;
            }
            break; */
        case 'ShiftLeft':
        case 'ShiftRight':
            isRunning = value;
            break;
    }
}

export function moveAnimate(delta) {
    //Lógica de perseguição
    scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy && obj.userData.state) {
            // Identificação de tipo
            const isSkull = obj.name === "enemy" || obj.userData.name === "enemy" || obj.userData.enemyType === "skull";
            const isBoss = obj.userData.enemyType === "boss" || obj.userData.tipo === "boss";
            const isCacodemon = obj.name === "cacodemon" || obj.userData.enemyType === "cacodemon";

            // Calcula distância
            const playerObj = controls.getObject();
            const enemyPos = obj.position.clone();
            const playerPos = playerObj.position.clone();
            const dist = enemyPos.distanceTo(playerPos);

            // --- Máquina de estados expandida ---
            // 1. Transição para pursuing se detectar player
            if ((obj.userData.state === "patrol" || obj.userData.state === "returning") && dist <= obj.userData.detectionRadius) {
                obj.userData.state = "pursuing";
                if (isCacodemon || isBoss) {
                    obj.userData.cacoMovePhase = 0;
                    obj.userData.cacoMoveTimer = 0;
                    obj.userData.cacoLateralDir = Math.random() < 0.5 ? -1 : 1;
                }
            }
            // 2. Se perdeu o player, volta para returning
            if (obj.userData.state === "pursuing" && dist > (obj.userData.detectionRadius * 1.5)) {
                obj.userData.state = "returning";
            }
            // 3. Se chegou na origem, volta para patrulha
            if (obj.userData.state === "returning" && obj.userData.originalPosition) {
                const toOrigin = obj.position.clone().sub(obj.userData.originalPosition);
                if (toOrigin.length() < 1.5) {
                    obj.userData.state = "patrol";
                }
            }

            // --- Lógica de patrulha ---
            if (obj.userData.state === "patrol" && obj.userData.patrolArea) {
                // Cacodemon: patrulha lenta e deliberada
                if (isCacodemon || isBoss) {
                    if (!obj.userData.patrolTarget || obj.position.distanceTo(obj.userData.patrolTarget) < 1.2) {
                        // Sorteia novo ponto dentro da patrolArea
                        const min = obj.userData.patrolArea.min;
                        const max = obj.userData.patrolArea.max;
                        obj.userData.patrolTarget = new THREE.Vector3(
                            min.x + Math.random() * (max.x - min.x),
                            min.y + Math.random() * (max.y - min.y),
                            min.z + Math.random() * (max.z - min.z)
                        );
                    }
                    // Move suavemente para patrolTarget
                    const dir = obj.userData.patrolTarget.clone().sub(obj.position);
                    dir.y = 0; // Mantém patrulha horizontal
                    if (dir.length() > 0.1) dir.normalize();
                    const move = dir.clone().multiplyScalar(3 * delta); // lento
                    // Testa colisão
                    const collidables = [];
                    findCollidables(scene, collidables);
                    const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                    const tempBox = obj.userData.collisionBox.clone();
                    tempBox.translate(move);
                    let collides = validCollidables.some(o => tempBox.intersectsBox(o.userData.collisionBox));
                    if (!collides) {
                        obj.position.add(move);
                    }
                    // Rotação suave
                    if (dir.lengthSq() > 0.001) {
                        let yaw = Math.atan2(dir.x, dir.z);
                        obj.rotation.y += (yaw - obj.rotation.y) * 0.1;
                    }
                } else if (isSkull) {
                    // Skull: patrulha rápida e zigue-zague
                    if (!obj.userData.patrolTarget || obj.position.distanceTo(obj.userData.patrolTarget) < 1.0) {
                        const min = obj.userData.patrolArea.min;
                        const max = obj.userData.patrolArea.max;
                        obj.userData.patrolTarget = new THREE.Vector3(
                            min.x + Math.random() * (max.x - min.x),
                            min.y + Math.random() * (max.y - min.y),
                            min.z + Math.random() * (max.z - min.z)
                        );
                        obj.userData.zigzagDir = Math.random() < 0.5 ? -1 : 1;
                    }
                    let dir = obj.userData.patrolTarget.clone().sub(obj.position);
                    dir.y = 0;
                    if (dir.length() > 0.1) dir.normalize();
                    // Adiciona zigue-zague lateral
                    let perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
                    let zigzag = perp.multiplyScalar(Math.sin(performance.now() * 0.003) * 1.5 * obj.userData.zigzagDir);
                    let move = dir.clone().multiplyScalar(5 * delta).add(zigzag.multiplyScalar(delta));
                    // Testa colisão
                    const collidables = [];
                    findCollidables(scene, collidables);
                    const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                    const tempBox = obj.userData.collisionBox.clone();
                    tempBox.translate(move);
                    let collides = validCollidables.some(o => tempBox.intersectsBox(o.userData.collisionBox));
                    if (!collides) {
                        obj.position.add(move);
                    }
                    // Rotação suave
                    if (dir.lengthSq() > 0.001) {
                        let yaw = Math.atan2(dir.x, dir.z);
                        obj.rotation.y += (yaw - obj.rotation.y) * 0.18;
                    }
                }
                // Atualiza caixa de colisão
                if (obj.userData.collisionBox) {
                    obj.userData.collisionBox.setFromObject(obj);
                }
                // Barra de hp
                obj.traverse(child => {
                    if (child.userData && child.userData.isHealthBar && child instanceof THREE.Object3D) {
                        child.position.x = 0;
                        child.position.z = 0;
                        child.position.y = obj.userData.baseY + (obj.userData.healthBarOffsetY || 7);
                    }
                });
                return; // Não executa lógica de pursuit/combate
            }

            // --- Lógica de retorno à origem ---
            if (obj.userData.state === "returning" && obj.userData.originalPosition) {
                let dir = obj.userData.originalPosition.clone().sub(obj.position);
                dir.y = 0;
                if (dir.length() > 0.1) dir.normalize();
                let move = dir.clone().multiplyScalar(5 * delta);
                // Testa colisão
                const collidables = [];
                findCollidables(scene, collidables);
                const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                const tempBox = obj.userData.collisionBox.clone();
                tempBox.translate(move);
                let collides = validCollidables.some(o => tempBox.intersectsBox(o.userData.collisionBox));
                if (!collides) {
                    obj.position.add(move);
                }
                // Rotação suave
                if (dir.lengthSq() > 0.001) {
                    let yaw = Math.atan2(dir.x, dir.z);
                    obj.rotation.y += (yaw - obj.rotation.y) * 0.15;
                }
                // Atualiza caixa de colisão
                if (obj.userData.collisionBox) {
                    obj.userData.collisionBox.setFromObject(obj);
                }
                // Barra de hp
                obj.traverse(child => {
                    if (child.userData && child.userData.isHealthBar && child instanceof THREE.Object3D) {
                        child.position.x = 0;
                        child.position.z = 0;
                        child.position.y = obj.userData.baseY + (obj.userData.healthBarOffsetY || 7);
                    }
                });
                return;
            }

            // Salva posição original do Cacodemon/Boss se ainda não salva
            if ((isCacodemon || isBoss) && !obj.userData.originalPosition) {
                obj.userData.originalPosition = obj.position.clone();
            }

            // Detecção e mudança de estado
            if (obj.userData.state === "idle" && dist <= obj.userData.detectionRadius) {
                obj.userData.state = "pursuing";
                if (isCacodemon || isBoss) {
                    obj.userData.cacoMovePhase = 0;
                    obj.userData.cacoMoveTimer = 0;
                    obj.userData.cacoLateralDir = Math.random() < 0.5 ? -1 : 1;
                }
            }
            // Se player fugiu demais, volta para idle
            if (obj.userData.state === "pursuing" && dist > (obj.userData.detectionRadius * 1.5)) {
                obj.userData.state = "idle";
                if (isCacodemon && obj.userData.originalPosition) {
                    obj.userData.returning = true;
                }
            }
            // Perseguição
            if (obj.userData.state === "pursuing") {
                // --- Lógica específica para Skull (Lost Soul) ---
                if (isSkull) {
                    // Inicia o dash se não estiver em um
                    if (!obj.userData.isDashing) {
                        // Calcula direção do dash uma única vez
                        obj.userData.dashDirection = playerPos.clone().sub(obj.position).normalize();
                        obj.userData.isDashing = true;
                        obj.userData.lastDashTime = performance.now();
                        obj.userData.initialDashPosition = obj.position.clone(); // Guarda posição inicial do dash
                        obj.userData.maxDashDistance = 1800; // 1800 unidades
                    }
                    
                    // Move na direção travada do dash
                    if (obj.userData.isDashing) {
                        const dashSpeed = obj.userData.dashSpeed * 2; // Aumenta a velocidade do dash
                        const moveVec = obj.userData.dashDirection.clone().multiplyScalar(dashSpeed * delta);
                        
                        // Verifica colisão com ambiente (incluindo chão, ignora apenas jogador)
                        const collidables = [];
                        findCollidables(scene, collidables);
                        const validCollidables = collidables.filter(o => 
                            o !== obj && 
                            o.userData.collisionBox && 
                            o.userData.isCollidable &&
                            o.name !== "camera" // Ignora apenas o jogador
                        );
                        
                        // Testa colisão com ambiente
                        const tempBox = obj.userData.collisionBox.clone();
                        tempBox.translate(moveVec);
                        
                        // Verifica se atingiu a distância máxima
                        const distanceTraveled = obj.position.distanceTo(obj.userData.initialDashPosition);
                        const maxDistanceReached = distanceTraveled >= obj.userData.maxDashDistance;
                        
                        // Verifica colisão com objetos do ambiente
                        const collides = validCollidables.some(o => 
                            tempBox.intersectsBox(o.userData.collisionBox)
                        );
                        
                        if (collides || maxDistanceReached) {
                            if (collides) {
                                // Ricocheteia na direção oposta
                                obj.userData.dashDirection.multiplyScalar(-1);
                            }
                            // Muda para estado de retorno após colisão ou distância máxima
                            obj.userData.isDashing = false;
                            obj.userData.state = "returning";
                        } else {
                            // Move normalmente
                            obj.position.add(moveVec);
                        }
                        
                        // Atualiza a rotação para a direção do movimento
                        if (obj.userData.dashDirection.lengthSq() > 0.001) {
                            const yaw = Math.atan2(obj.userData.dashDirection.x, obj.userData.dashDirection.z);
                            obj.rotation.y = yaw;
                        }
                    }
                    
                    // Atualiza a caixa de colisão
                    if (obj.userData.collisionBox) {
                        obj.userData.collisionBox.setFromObject(obj);
                    }
                    
                    // Pula o resto da lógica de perseguição para o Skull
                    return;
                }
                
                // --- Lógica para outros inimigos (Cacodemon, Boss, etc) ---
                let targetY = playerPos.y;
                if (isCacodemon || isBoss) {
                    // Oscilação vertical (respiração)
                    const now = performance.now() * 0.001;
                    const osc = Math.sin(now * 2 * Math.PI / 2.5) * 3; // ±3 unidades, ciclo ~2.5s
                    targetY += 5.0 + osc; // Cacodemon sempre acima e oscilando
                }
                // Busca altura máxima possível entre obj.position.y e targetY sem atravessar bounding boxes, mas faz o movimento suave (lerp)
                const collidablesY = [];
                findCollidables(scene, collidablesY);
                const validCollidablesY = collidablesY.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                // Calcula o próximo Y desejado (lerp)
                let lerpFactor = 0.07;
                if (isCacodemon || isBoss) {
                    lerpFactor = 0.035; // Mais suave para Cacodemon/Boss
                }
                let desiredY = obj.position.y + (targetY - obj.position.y) * lerpFactor;
                // Testa se pode mover para desiredY sem atravessar bounding boxes
                let tempBoxY = obj.userData.collisionBox.clone();
                tempBoxY.translate(new THREE.Vector3(0, desiredY - obj.position.y, 0));
                let collidesY = validCollidablesY.some(o => tempBoxY.intersectsBox(o.userData.collisionBox));
                if (!collidesY) {
                    obj.position.y = desiredY;
                } else {
                    // Se colide, tenta se aproximar do máximo permitido na direção do targetY, mas sempre suavemente
                    let directionY = Math.sign(targetY - obj.position.y);
                    let stepY = 0.1 * directionY;
                    let lastSafeY = obj.position.y;
                    for (let i = 1; i <= 10; i++) {
                        let tryY = obj.position.y + stepY * i;
                        let tempBoxTry = obj.userData.collisionBox.clone();
                        tempBoxTry.translate(new THREE.Vector3(0, tryY - obj.position.y, 0));
                        let collidesTry = validCollidablesY.some(o => tempBoxTry.intersectsBox(o.userData.collisionBox));
                        if (collidesTry) {
                            break;
                        }
                        lastSafeY = tryY;
                        if ((directionY > 0 && lastSafeY >= targetY) || (directionY < 0 && lastSafeY <= targetY)) {
                            break;
                        }
                    }
                    // Move suavemente até o máximo permitido sem colisão
                    obj.position.y = lastSafeY;
                }

                // --- Padrão de movimento especial do Cacodemon ---
                let moveSpeed;
                if (isCacodemon || isBoss) {
                    moveSpeed = 8 * delta; // Velocidade padrão de combate

                    // Parâmetro de distância preferida
                    const preferredDistance = 38; // unidades (preferência por ficar ainda mais longe)
                    const distanceToPlayer = obj.position.clone().setY(0).distanceTo(playerPos.clone().setY(0));

                    // Ciclo de movimento Doom 2
                    if (!obj.userData.cacoMovePhase && obj.userData.cacoMovePhase !== 0) obj.userData.cacoMovePhase = 0;
                    if (!obj.userData.cacoMoveTimer) obj.userData.cacoMoveTimer = 0;
                    if (!obj.userData.cacoLateralDir) obj.userData.cacoLateralDir = Math.random() < 0.5 ? -1 : 1;
                    // Definir duração do movimento para cada ciclo
                    if (!obj.userData.cacoMoveDuration || obj.userData.cacoMovePhase === 0) {
                        // Distribuição triangular invertida para favorecer valores curtos
                        function triRandMin(min, max, mode) {
                            // mode = min para favorecer valores curtos
                            const u = Math.random();
                            if (u < (mode - min) / (max - min)) {
                                return min + Math.sqrt(u * (max - min) * (mode - min));
                            } else {
                                return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
                            }
                        }
                        if (obj.userData.cacoMoveVertical === 0) {
                            // Lateral puro: ainda mais curto e suave
                            obj.userData.cacoMoveDuration = triRandMin(0.5, 1.1, 0.5); // 0.5 a 1.1s
                            obj.userData.cacoMoveAmplitude = triRandMin(0.8, 1.5, 0.8); // 0.8 a 1.5x
                        } else {
                            // Outros movimentos: mantém range anterior
                            obj.userData.cacoMoveDuration = triRandMin(0.7, 2.1, 0.7);
                            obj.userData.cacoMoveAmplitude = triRandMin(1.2, 2.6, 1.2);
                        }

                        // Sorteio do tipo de movimento: lateral puro (70%), lateral-diagonal para cima (18%), vertical puro (12%)
                        let r = Math.random();
                        if (r < 0.7) {
                            obj.userData.cacoMoveVertical = 0; // lateral puro
                        } else if (r < 0.88) {
                            obj.userData.cacoMoveVertical = 1; // lateral-diagonal para cima
                        } else {
                            obj.userData.cacoMoveVertical = 2; // vertical puro
                        }
                        // Alternância entre direita/esquerda
                        if (obj.userData.cacoMoveVertical === 0) {
                            if (typeof obj.userData.lastLateralDir === "undefined") obj.userData.lastLateralDir = obj.userData.cacoLateralDir;
                            // 60% de chance de alternar o lado (mais tempo em cada direção)
                            if (Math.random() < 0.6) {
                                obj.userData.cacoLateralDir = -obj.userData.lastLateralDir;
                            }
                            obj.userData.lastLateralDir = obj.userData.cacoLateralDir;
                            
                            // Aumenta a duração do movimento lateral
                            if (obj.userData.cacoMoveVertical === 0) {
                                obj.userData.cacoMoveDuration = triRandMin(1.2, 2.0, 1.2); // Aumenta a duração do movimento lateral
                            }
                        }
                    }
                    // Escolher tipo de movimento
                    if (!obj.userData.cacoMoveType || obj.userData.cacoMovePhase === 0) {
                        if (distanceToPlayer < preferredDistance - 6) {
                            obj.userData.cacoMoveType = 2; // recuo (só se MUITO colado)
                        } else if (distanceToPlayer > preferredDistance + 8) {
                            obj.userData.cacoMoveType = 3; // aproxima (só se MUITO longe)
                        } else {
                            // Se está na faixa confortável, só movimentos laterais
                            obj.userData.cacoMoveType = 1; // lateral
                        }
                    }

                    obj.userData.cacoMoveTimer += delta;
                    // Fases: 0-virar para lado/trás, 1-mover lateral/trás, 2-parar para atirar, 3-girar para player
                    let moveVec = new THREE.Vector3();
                    if (obj.userData.cacoMovePhase === 0) {
                        if (obj.userData.cacoMoveType === 2) {
                            // Vai para trás, olhar para trás do vetor player
                            let backDir = obj.position.clone().setY(0).sub(playerPos.clone().setY(0)).normalize();
                            let yaw = Math.atan2(backDir.x, backDir.z);
                            // Reduz a velocidade de rotação para 40% do valor original (0.3 -> 0.12)
                            obj.rotation.y += (yaw - obj.rotation.y) * 0.12;
                            moveVec.copy(backDir);
                            obj.userData.lastMoveWasBackward = true; // Marca que o último movimento foi para trás
                            
                            // Aumenta o tempo de movimento para trás
                            if (obj.userData.cacoMoveTimer > 0.3 + Math.random() * 0.3) {  // Aumenta o tempo mínimo e máximo
                                obj.userData.cacoMovePhase = 1;
                                obj.userData.cacoMoveTimer = 0;
                            }
                        } else {
                            // Vai para o lado (lateral), olhar para o lado
                            let perp = new THREE.Vector3(-(playerPos.z - obj.position.z), 0, playerPos.x - obj.position.x).normalize().multiplyScalar(obj.userData.cacoLateralDir);
                            let yaw = Math.atan2(perp.x, perp.z);
                            let rotLerp = 0.3;
                            obj.rotation.y += (yaw - obj.rotation.y) * rotLerp;
                            moveVec.copy(perp);
                        }
                        if (obj.userData.cacoMoveTimer > 0.2 + Math.random() * 0.2) {
                            obj.userData.cacoMovePhase = 1;
                            obj.userData.cacoMoveTimer = 0;
                        }
                    } else if (obj.userData.cacoMovePhase === 1) {
                        // Movimento de amplitude variável, com possibilidade de vertical/diagonal
                        let amp = obj.userData.cacoMoveAmplitude || 2.0;
                        // Reduz a velocidade de movimento em 40%
                        let adjustedMoveSpeed = moveSpeed * 0.6;
                        
                        if (obj.userData.cacoMoveType === 2) {
                            let backDir = obj.position.clone().setY(0).sub(playerPos.clone().setY(0)).normalize();
                            obj.position.add(backDir.multiplyScalar(adjustedMoveSpeed * amp * 0.8)); // Mais lento ainda para trás
                            moveVec.copy(backDir);
                        } else if (obj.userData.cacoMoveType === 1) {
                            let perp = new THREE.Vector3(-(playerPos.z - obj.position.z), 0, playerPos.x - obj.position.x).normalize().multiplyScalar(obj.userData.cacoLateralDir);
                            if (obj.userData.cacoMoveVertical === 0) {
                                // Lateral puro
                                {
    let desloc = moveSpeed * amp;
    if (Math.abs(desloc) < 0.15) desloc = 0.15 * Math.sign(desloc);
    obj.position.add(perp.multiplyScalar(desloc));
}
                                moveVec.copy(perp);
                            } else if (obj.userData.cacoMoveVertical === 1) {
                                // Lateral-diagonal para cima
                                let diag = perp.clone().add(new THREE.Vector3(0, 1, 0)).normalize();
                                {
    let desloc = moveSpeed * amp;
    if (Math.abs(desloc) < 0.15) desloc = 0.15 * Math.sign(desloc);
    obj.position.add(diag.multiplyScalar(desloc));
}
                                moveVec.copy(diag);
                            } else if (obj.userData.cacoMoveVertical === 2) {
                                // Vertical puro
                                let vert = new THREE.Vector3(0, 1, 0);
                                {
    let desloc = moveSpeed * amp;
    if (Math.abs(desloc) < 0.15) desloc = 0.15 * Math.sign(desloc);
    obj.position.add(vert.multiplyScalar(desloc));
}
                                moveVec.copy(vert);
                            }
                        } else if (obj.userData.cacoMoveType === 3) {
                            let toPlayer = playerPos.clone().setY(0).sub(obj.position.clone().setY(0)).normalize();
                            obj.position.add(toPlayer.multiplyScalar(moveSpeed * (amp * 0.5)));
                            moveVec.copy(toPlayer);
                        }
                        // Olhar para a direção do movimento (mais suave)
                        if (moveVec.lengthSq() > 0.001) {
                            let yaw = Math.atan2(moveVec.x, moveVec.z);
                            // Reduz a velocidade de rotação para 40% do valor original (0.4 -> 0.16)
                            obj.rotation.y += (yaw - obj.rotation.y) * 0.16;
                        }
                        // Aumenta a duração de cada fase de movimento em 50%
                        if (obj.userData.cacoMoveTimer > obj.userData.cacoMoveDuration * 1.5) {
                            obj.userData.cacoMovePhase = 2;
                            obj.userData.cacoMoveTimer = 0;
                        }
                    } else if (obj.userData.cacoMovePhase === 2) {
                        // Gira suavemente para o player para atirar
                        let toPlayer = playerPos.clone().setY(0).sub(obj.position.clone().setY(0)).normalize();
                        let yaw = Math.atan2(toPlayer.x, toPlayer.z);
                        let prevYaw = obj.rotation.y;
                        // Reduz a velocidade de rotação para 40% do valor original (0.5 -> 0.2)
                        obj.rotation.y += (yaw - obj.rotation.y) * 0.2;
                        
                        // Se acabou de entrar nesta fase, reseta o flag de tiro
                        if (!obj.userData.inShootingPhase) {
                            obj.userData.inShootingPhase = true;
                            obj.userData.hasFiredInThisPhase = false;
                            // Reseta o flag de movimento para trás no início da fase de tiro
                            obj.userData.lastMoveWasBackward = false;
                        }
                        
                        // Atira um projétil quando estiver alinhado com o jogador e o último movimento não foi para trás
                        if (!obj.userData.hasFiredInThisPhase && Math.abs(yaw - obj.rotation.y) < 0.1 && !obj.userData.lastMoveWasBackward) {
                            obj.userData.hasFiredInThisPhase = true;
                            

                            // Cria o projétil com menos polígonos para melhor desempenho
                            const projectile = new THREE.Mesh(
                                new THREE.SphereGeometry(0.5, 6, 4), // Reduzindo a complexidade da esfera
                                new THREE.MeshBasicMaterial({
                                    color: 0xff6600,
                                    transparent: true,
                                    opacity: 0.8, // Opacidade ligeiramente reduzida
                                })
                            );
                            
                            // Posição inicial: frente do Cacodemon
                            const offset = new THREE.Vector3(0, 0, -1.5)
                                .applyQuaternion(obj.quaternion);
                            projectile.position.copy(obj.position).add(offset);
                            
                            // Cria o efeito de fogo ao redor do projétil com menos partículas
                            const fireEffect = new FireEffect(projectile, scene, {
                                radius: 0.8,   // Menor raio para melhor desempenho
                                height: 0.8,   // Menor altura para melhor desempenho
                                count: 6       // Metade das partículas originais
                            });
                            

                            // Armazena a referência para remoção posterior
                            projectile.userData.fireEffect = fireEffect;
                            

                            // Direção: do Cacodemon para o jogador
                            const direction = playerPos.clone()
                                .sub(obj.position)
                                .normalize();
                            
                            // Define a velocidade do projétil (muito mais lento para dar tempo de desviar)
                            projectile.userData = {
                                velocity: direction.multiplyScalar(15 * 0.016), // Velocidade muito reduzida
                                damage: 10, // Dano do projétil
                                isEnemyProjectile: true,
                                fireEffect: fireEffect,
                                maxDistance: 200, // Distância máxima antes de começar a desaparecer
                                fadeStartDistance: 150, // Distância para começar o fade-out
                                initialPosition: projectile.position.clone() // Guarda a posição inicial
                            };
                            
                            // Adiciona à cena e ao array de projéteis
                            scene.add(projectile);
                            if (!window.enemyProjectiles) window.enemyProjectiles = [];
                            window.enemyProjectiles.push(projectile);
                        }
                        if (obj.userData.cacoMoveTimer > 0.18 + Math.random() * 0.12) {
                            obj.userData.cacoMovePhase = 3;
                            obj.userData.cacoMoveTimer = 0;
                        }
                    } else if (obj.userData.cacoMovePhase === 3) {
                        // Placeholder para tiro
                        if (!obj.userData.cacoJustShot) {
                            // console.log("Cacodemon atirando!");
                            obj.userData.cacoJustShot = true;
                        }
                        if (obj.userData.cacoMoveTimer > 0.22) {
                            obj.userData.cacoMovePhase = 0;
                            obj.userData.cacoMoveTimer = 0;
                            obj.userData.cacoLateralDir = Math.random() < 0.5 ? -1 : 1;
                            obj.userData.cacoMoveType = undefined;
                            obj.userData.cacoJustShot = false;
                            obj.userData.inShootingPhase = false; // Reseta para permitir tiro no próximo ciclo
                        }
                    }
                    // Movimento para manter distância preferida: se está na faixa ideal, não avança nem recua!
                    let toPlayer = playerPos.clone().setY(obj.position.y).sub(obj.position).setY(0);
                    let distXZ = toPlayer.length();
                    let direction = toPlayer.normalize();
                    if (distXZ > preferredDistance + 8) {
                        // Só se aproxima se estiver MUITO além da distância preferida
                        obj.position.add(direction.multiplyScalar(moveSpeed * 0.85));
                    } else if (distXZ < preferredDistance - 6) {
                        // Só recua se estiver MUITO colado
                        let backDir = obj.position.clone().setY(0).sub(playerPos.clone().setY(0)).normalize();
                        obj.position.add(backDir.multiplyScalar(moveSpeed * 2.5));
                    } // Se está na faixa confortável, só movimentos laterais/trás do ciclo

                    // Fora de perseguição, gira para direção do deslocamento (idle)
                    if (obj.userData.state !== "pursuing") {
                        let vel = obj.userData.lastMoveVec || new THREE.Vector3(1,0,0);
                        if (vel.lengthSq() > 0.001) {
                            let yaw = Math.atan2(vel.x, vel.z);
                            obj.rotation.y += (yaw - obj.rotation.y) * 0.2;
                        }
                    }

                } else {
                    // Gira inimigo para olhar para o player
                    const lookVec = playerPos.clone().sub(obj.position);
                    let targetYaw = Math.atan2(lookVec.x, lookVec.z);
                    if (isBoss) {
                        targetYaw -= Math.PI / 2; // Boss: gira 90 graus para a ESQUERDA
                    }
                    obj.rotation.y += (targetYaw - obj.rotation.y) * 0.25;
                }

                // --- Velocidade diferenciada ---
                if (isSkull) {
                    moveSpeed = obj.userData.dashing ? 20 * delta : 13 * delta; // Dash mais rápido
                } else if (isBoss) {
                    moveSpeed = 7 * delta; // Boss: mais rápido que antes, ainda o mais lento
                } else if (isCacodemon || isBoss) {
                    // já definido acima
                } else {
                    moveSpeed = 8 * delta; // Default
                }
                // Para Skull: inicia dash se cooldown ok e linha reta livre
                if (isSkull && !obj.userData.dashing && (!obj.userData.lastDash || performance.now() - obj.userData.lastDash > 1200)) {
                    // Raycast entre Skull e player
                    let dashDir = playerPos.clone().setY(obj.position.y).sub(obj.position).setY(0).normalize();
                    let ray = new THREE.Raycaster(obj.position, dashDir, 0, dist);
                    const collidables = [];
                    findCollidables(scene, collidables);
                    const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                    let intersects = ray.intersectObjects(validCollidables, true);
                    if (intersects.length === 0) {
                        obj.userData.dashing = true;
                        obj.userData.lastDash = performance.now();
                    }
                }
                // Cooldown após dash
                if (isSkull && obj.userData.dashing && obj.userData.lastDash && performance.now() - obj.userData.lastDash > 300) {
                    obj.userData.dashing = false;
                }
                // Move na direção do jogador (apenas XZ)
                let direction = playerPos.clone().setY(obj.position.y).sub(obj.position).setY(0).normalize();
                let nextPos = obj.position.clone().add(direction.clone().multiplyScalar(moveSpeed));
                let moved = false;
                // Coleta obstáculos do mapa (não considera outros inimigos)
                const collidables = [];
                findCollidables(scene, collidables);
                const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                // Testa colisão na próxima posição
                let tempBox = obj.userData.collisionBox.clone();
                tempBox.translate(direction.clone().multiplyScalar(moveSpeed));
                let collides = validCollidables.some(o => tempBox.intersectsBox(o.userData.collisionBox));
                if (!collides) {
                    obj.position.add(direction.multiplyScalar(moveSpeed));
                    moved = true;
                } else {
                    // Se for voador, tenta subir/descer/lateralizar para contornar obstáculo
                    if (isCacodemon || isBoss) {
                        // Tenta subir até 3 unidades para passar por cima
                        let tried = false;
                        for (let dy = 1; dy <= 3; dy++) {
                            let tempBoxUp = obj.userData.collisionBox.clone();
                            tempBoxUp.translate(new THREE.Vector3(direction.x, dy, direction.z).multiplyScalar(moveSpeed));
                            if (!validCollidables.some(o => tempBoxUp.intersectsBox(o.userData.collisionBox))) {
                                obj.position.add(new THREE.Vector3(direction.x, dy, direction.z).multiplyScalar(moveSpeed));
                                tried = true;
                                moved = true;
                                break;
                            }
                        }
                        // Se não conseguiu subir, tenta descer até 3 unidades
                        if (!tried) {
                            for (let dy = -1; dy >= -3; dy--) {
                                let tempBoxDown = obj.userData.collisionBox.clone();
                                tempBoxDown.translate(new THREE.Vector3(direction.x, dy, direction.z).multiplyScalar(moveSpeed));
                                if (!validCollidables.some(o => tempBoxDown.intersectsBox(o.userData.collisionBox))) {
                                    obj.position.add(new THREE.Vector3(direction.x, dy, direction.z).multiplyScalar(moveSpeed));
                                    tried = true;
                                    moved = true;
                                    break;
                                }
                            }
                        }
                        // Se não conseguiu subir/descer, tenta lateralizar (desviar para o lado)
                        if (!tried) {
                            let perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
                            for (let side = -1; side <= 1; side += 2) {
                                let tempBoxSide = obj.userData.collisionBox.clone();
                                tempBoxSide.translate(perp.clone().multiplyScalar(moveSpeed * side));
                                if (!validCollidables.some(o => tempBoxSide.intersectsBox(o.userData.collisionBox))) {
                                    obj.position.add(perp.clone().multiplyScalar(moveSpeed * side));
                                    moved = true;
                                    break;
                                }
                            }
                        }
                    }
                    // Lost Soul (Skull): dash só se linha reta estiver livre
                    if (isSkull && obj.userData.dashing) {
                        // Raycast entre Skull e player
                        let ray = new THREE.Raycaster(obj.position, direction, 0, dist);
                        let intersects = ray.intersectObjects(validCollidables, true);
                        if (intersects.length === 0) {
                            obj.position.add(direction.multiplyScalar(moveSpeed * 2)); // dash mais rápido
                            moved = true;
                        } else {
                            obj.userData.dashing = false; // cancela dash se obstruído
                        }
                    }
                }
                // Atualiza caixa de colisão
                if (obj.userData.collisionBox) {
                    obj.userData.collisionBox.setFromObject(obj);
                }
                // Barra de hp segue o inimigo
                obj.traverse(child => {
                    if (child.userData && child.userData.isHealthBar && child instanceof THREE.Object3D) {
                        child.position.x = 0;
                        child.position.z = 0;
                        child.position.y = obj.userData.baseY + (obj.userData.healthBarOffsetY || 7);
                    }
                });
            }
        }
    });

    const playerObj = controls.getObject();
    const alturaPlayer = 2;
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const moveVec = new THREE.Vector3();

    if (moveForward) moveVec.add(forward);
    if (moveBackward) moveVec.add(forward.clone().negate());
    if (moveRight) moveVec.add(right);
    if (moveLeft) moveVec.add(right.clone().negate());
    if (moveVec.lengthSq() > 0) moveVec.normalize();

    const originalPos = playerObj.position.clone();
    let currentSpeed = isRunning ? speed * 2 : speed;
    let tryPos = originalPos.clone().add(moveVec.clone().multiplyScalar(currentSpeed * delta));
    playerObj.position.copy(tryPos);

    let playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );

    const collidables = [];
    findCollidables(scene, collidables);
    const validCollidables = collidables.filter(obj => 
        obj.name !== "camera" && obj.userData.collisionBox && obj.userData.isCollidable
    );
    
    let collided = validCollidables.some(obj => 
        playerBox.intersectsBox(obj.userData.collisionBox)
    );

    if (collided) {
        let stepped = false;
        const maxStep = 1.5;
        const stepIncrement = 0.1;
        for (let step = stepIncrement; step <= maxStep; step += stepIncrement) {
            playerObj.position.y += step;
            let playerBoxStep = new THREE.Box3().setFromCenterAndSize(
                playerObj.position.clone(),
                new THREE.Vector3(0.3, alturaPlayer, 0.3)
            );
            let collidedStep = validCollidables.some(obj =>
                playerBoxStep.intersectsBox(obj.userData.collisionBox)
            );
            if (!collidedStep) {
                stepped = true;
                break;
            }
            playerObj.position.y -= step;
        }
        if (!stepped) {
            playerObj.position.copy(originalPos);
        }
    }

    if (moveUp) velocityY = speed;
    if (moveDown) velocityY = -speed;

    const downRay = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    const walkableSurfaces = scene.children.filter(obj =>
        obj.name === 'ground' ||
        obj.name === 'topo_colisao' ||
        obj.name === 'elevador' ||
        obj.name === 'bloco1' ||
        obj.name === 'bloco2'||
        (obj.name && obj.name.startsWith('ramp'))
    );
    const surfaceIntersects = downRay.intersectObjects(walkableSurfaces, false);

    if (surfaceIntersects.length > 0) {
        const surfaceY = surfaceIntersects[0].point.y;
        const playerFeet = playerObj.position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;
        if (diff < 1.5) {
            if (velocityY < 0) velocityY = 0;
            playerObj.position.y = THREE.MathUtils.lerp(
                playerObj.position.y,
                surfaceY + alturaPlayer,
                0.1
            );
            canJump = true; // <-- Permite pular
        } else {
            velocityY -= gravity * delta;
            playerObj.position.y += velocityY * delta;
            canJump = false;
        }
    } else {
        velocityY -= gravity * delta;
        playerObj.position.y += velocityY * delta;
        canJump = false;
    }

    // Direção para o raycaster baseada na direção da câmera
    const playerDirection = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const frontRay = new THREE.Raycaster(
        playerObj.position.clone(),
        playerDirection,
        0,
        5 // Aumentei a distância para melhor detecção
    );

    if (areaChaveData && areaChaveData.getChaveAnimada && typeof areaChaveData.getChaveAnimada === "function") {
        const chave = areaChaveData.getChaveAnimada();
        if (chave && chave.userData && chave.userData.isCollectable) {
            if (!chave.userData.collisionBox) {
                chave.userData.collisionBox = new THREE.Box3();
            }
            chave.userData.collisionBox.setFromObject(chave);
    
            // Checa colisão com o pilar
            const pilar = scene.getObjectByName('bloco2');
            if (
                pilar &&
                pilar.userData.collisionBox &&
                playerBox.intersectsBox(pilar.userData.collisionBox)
            ) {
                chave.parent.remove(chave);
                chave.userData.isCollectable = false;
                playerHasKey = true;
            }
        }
        if (chave && chave.userData && !chave.userData.isCollectable) {
            const portas = scene.children.filter(obj => obj.name === 'porta');
            portas.forEach(porta => { movePorta(porta, frontRay); });
        }
    }

    const blocoElevado = scene.getObjectByName('bloco1');
    if (playerHasKey && blocoElevado) {
        const distancia = controls.getObject().position.distanceTo(blocoElevado.position);
        if (distancia < 3 && !blocoElevado.userData.chaveColocada) {
            const chave = criaChave('red');
            chave.position.set(45, 5, 0);
            scene.add(chave);
            blocoElevado.userData.chaveColocada = true;
            playerHasKey = false;
        }
    }
    //move o elevador
    const elevador = scene.getObjectByName('elevador');
    const sensor = scene.children.filter(obj => obj.name === 'DesceElevador');
    sensor.forEach(sensor => { moveElevador(elevador, downRay, sensor, controls); });

    // portao area 3
    const hangar = scene.getObjectByName('hangar');
    if (hangar) {
        const portas = [];
        hangar.traverse((child) => {
            if (child.name === 'porta') {
                portas.push(child);
            }
        });
        
        if (portas.length >= 2) {
            movePortaoH(portas[0], portas[1], frontRay);
        } else if (portas.length > 0) {
            console.warn('Apenas', portas.length, 'porta(s) encontrada(s) no hangar');
        }
    } else {
    }
}

function render() {
    stats.update();
    const delta = clock.getDelta();

    scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy) {
            obj.traverse(child => {
                if (child.userData && child.userData.isHealthBar) {
                    child.lookAt(camera.position);
                }
            });
        }
    });

    if (controls.isLocked) {
        moveAnimate(delta);
        updateProjectiles(delta);
        
        // Atualiza projéteis dos inimigos
        if (window.enemyProjectiles) {
            for (let i = window.enemyProjectiles.length - 1; i >= 0; i--) {
                const proj = window.enemyProjectiles[i];
                if (!proj || !proj.userData) {
                    window.enemyProjectiles.splice(i, 1);
                    continue;
                }
                
                // Atualiza posição
                proj.position.add(proj.userData.velocity);
                
                // Verifica colisão com o jogador
                const player = controls.getObject();
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    player.position.clone().add(new THREE.Vector3(0, 1, 0)),
                    new THREE.Vector3(1, 2, 1)
                );
                
                const projBox = new THREE.Box3().setFromCenterAndSize(
                    proj.position,
                    new THREE.Vector3(1, 1, 1)
                );
                
                if (playerBox.intersectsBox(projBox)) {
                    // Aplica dano ao jogador
                    if (typeof window.playerTakeDamage === 'function') {
                        window.playerTakeDamage(proj.userData.damage || 10);
                    }
                    
                    // Remove o efeito de fogo se existir
                    if (proj.userData.fireEffect) {
                        proj.userData.fireEffect.dispose();
                    }
                    // Remove o projétil
                    scene.remove(proj);
                    window.enemyProjectiles.splice(i, 1);
                    continue;
                }
                
                // Calcula a distância percorrida pelo projétil
                const distanceTraveled = proj.position.distanceTo(proj.userData.initialPosition);
                
                // Aplica fade-out baseado na distância (igual ao efeito dos Skulls)
                if (distanceTraveled > proj.userData.fadeStartDistance) {
                    const fadeRange = proj.userData.maxDistance - proj.userData.fadeStartDistance;
                    const fadeAmount = 1 - ((distanceTraveled - proj.userData.fadeStartDistance) / fadeRange);
                    
                    // Aplica o fade ao material do projétil
                    if (proj.material) {
                        proj.material.opacity = 0.9 * fadeAmount;
                        proj.material.needsUpdate = true;
                    }
                    
                    // Ajusta a opacidade do efeito de fogo (usando a mesma abordagem dos Skulls)
                    if (proj.userData.fireEffect) {
                        const particles = proj.userData.fireEffect.particles;
                        if (particles) {
                            particles.forEach(particle => {
                                if (particle.material) {
                                    particle.material.opacity = fadeAmount;
                                    particle.material.transparent = true;
                                    particle.material.needsUpdate = true;
                                }
                            });
                        }
                    }
                }
                
                // Remove projéteis que passaram da distância máxima
                if (distanceTraveled > proj.userData.maxDistance) {
                    // Remove o efeito de fogo se existir
                    if (proj.userData.fireEffect) {
                        proj.userData.fireEffect.dispose();
                    }
                    scene.remove(proj);
                    window.enemyProjectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }

    if (window.labelRenderer && controls.isLocked) {
    window.labelRenderer.render(scene, camera);
}

// Atualiza efeito de fogo dos Skulls e projéteis
scene.traverse(obj => {
    if (obj.userData) {
        // Atualiza fogo dos Skulls
        if (obj.userData.enemyType === 'skull' && obj.userData.fireEffect) {
            obj.userData.fireEffect.update(delta);
        }
        // Atualiza fogo dos projéteis
        if (obj.userData.isEnemyProjectile && obj.userData.fireEffect) {
            obj.userData.fireEffect.update(delta);
        }
    }
});

if (areaChaveData && areaChaveData.animandoBloco && areaChaveData.blocoAnimado && areaChaveData.chaveAnimada) {
    areaChaveData.tempoAnimacao += delta;
    let t = Math.min(areaChaveData.tempoAnimacao / areaChaveData.duracaoAnimacao, 1);

    // ... (rest of the code remains the same)
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
        // Interpolação entre posição inicial e final
        const blocoY0 = -4;
        const blocoY1 = 4;
        areaChaveData.blocoAnimado.position.y = blocoY0 + (blocoY1 - blocoY0) * t;

        if (t >= 1) {
            areaChaveData.animandoBloco = false;
            areaChaveData.blocoAnimado.position.y = areaChaveData.posFinalBloco;
            areaChaveData.blocoAnimado.userData.animacaoFinalizada = true;
            areaChaveData.chaveAnimada.position.y = areaChaveData.posFinalChave;
            recriarPilarComChave();
        }
    }
        if (
            areaChaveData &&
            !areaChaveData.animandoBloco &&
            areaChaveData.chaveAnimada
        ) {
            const chave = areaChaveData.getChaveAnimada();
            chave.position.y = 4 + Math.sin(performance.now() * 0.002) * 1.2;
        }
    
        if (scene.userData.animandoTorre && scene.userData.torreEspecial && scene.userData.chaveAmarela) {
            scene.userData.tempoAnimacaoTorre += delta;
            let t = Math.min(scene.userData.tempoAnimacaoTorre / 2.5, 1);
        
            // EaseOutCubic (opcional)
            t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
            // Torre sobe
            const y0 = scene.userData.torreEspecialY0;
            const y1 = scene.userData.torreEspecialY1;
            scene.userData.torreEspecial.position.y = y0 + (y1 - y0) * t;
            scene.userData.torreEspecial.userData.collisionBox.setFromObject(scene.userData.torreEspecial);
        
            if (t >= 1) {
                scene.userData.animandoTorre = false;
                scene.userData.animandoChaveAmarela = true; // inicia animação da chave
                scene.userData.tempoAnimacaoChaveAmarela = 0;
            }
        }
        if (scene.userData.animandoChaveAmarela && scene.userData.chaveAmarela) {
            scene.userData.tempoAnimacaoChaveAmarela += delta;
            let t = Math.min(scene.userData.tempoAnimacaoChaveAmarela / 3, 1); // 1.2s para cair
        
            // Posição inicial: logo acima do topo da torre
            // Posição final: topo da torre (altura/2)
            const alturaTorre = scene.userData.torreEspecial.geometry.parameters.height;
            const yTopo = alturaTorre - 15;
            const yFinal = alturaTorre - 38;
        
            scene.userData.chaveAmarela.position.y = yTopo + (yFinal - yTopo) * t;
        
            if (t >= 1) {
                scene.userData.animandoChaveAmarela = false;
                scene.userData.chaveAmarela.position.y = yFinal;
                scene.userData.chaveAmarelaFlutuando = true;
            }
        }
        if (
            scene.userData.chaveAmarela &&
            scene.userData.chaveAmarelaFlutuando // só flutua se a flag estiver ativa
        ) {
            const torre = scene.userData.torreEspecial;
            if (torre) {
                const alturaTorre = torre.geometry.parameters.height;
                const baseY = alturaTorre - 38; // baseY igual ao yFinal da animação de queda
                scene.userData.chaveAmarela.position.y =
                    baseY + Math.sin(performance.now() * 0.002) * 1.2;
            }
        }
        

    if (spotLightHelper) spotLightHelper.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function main() {
    init();
    render();
}

main();
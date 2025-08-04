import { adicionarInimigoCena } from './inimigo.js';
import { loadEnemyOBJ } from './enemy.js';
import { setupAreaChave, criaChave, recriarPilarComChave } from './areaChave.js';
import { moveElevador, setupArea2, movePorta,setupCacodemonElimination } from './areaElevada.js';
import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';
import { CSS2DRenderer } from '../build/jsm/renderers/CSS2DRenderer.js';
import { adicionarBossGLB } from './boss.js';

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
        spritesheet: null,
        create: createGun
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
    const skyTexture = loader.load('./images/SkyBoxT3/SkyBox2.png');
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
        // Espera um frame para garantir que os inimigos estão na cena
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
    createGun();
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
    const chaingunSprite = camera.getObjectByName("chaingun_sprite");
    if (chaingunSprite) camera.remove(chaingunSprite);
}

function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.name = "launcher";
    gun.position.set(0.01, -0.4, -1);
    gun.rotation.x = -Math.PI / 2;
    controls.getObject().add(gun);
    camera.add(gun);
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
        case 'ShiftLeft': moveDown = value; break;
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
            // Detecção e mudança de estado
            if (obj.userData.state === "idle" && dist <= obj.userData.detectionRadius) {
                obj.userData.state = "pursuing";
            }
            // Se player fugiu demais, volta para idle
            if (obj.userData.state === "pursuing" && dist > (obj.userData.detectionRadius * 1.5)) {
                obj.userData.state = "idle";
            }
            // Perseguição
            if (obj.userData.state === "pursuing") {
                // --- Ajuste de direção e altura ---
                let targetY = playerPos.y;
                if (isCacodemon) {
                    targetY += 5.0; // Cacodemon ainda mais acima do jogador
                }
                if (isSkull) {
                    targetY += 1.2; // Skull (Lost Soul) ligeiramente mais alto
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

                // Gira inimigo para olhar para o player
                const lookVec = playerPos.clone().sub(obj.position);
                let targetYaw = Math.atan2(lookVec.x, lookVec.z);
                if (isBoss) {
                    targetYaw -= Math.PI / 2; // Boss: gira 90 graus para a ESQUERDA
                }
                obj.rotation.y += (targetYaw - obj.rotation.y) * 0.25;

                // --- Velocidade diferenciada ---
                let moveSpeed;
                if (isSkull) {
                    moveSpeed = obj.userData.dashing ? 20 * delta : 13 * delta; // Dash mais rápido
                } else if (isBoss) {
                    moveSpeed = 7 * delta; // Boss: mais rápido que antes, ainda o mais lento
                } else if (isCacodemon) {
                    moveSpeed = 10 * delta; // Cacodemon: mais rápido que antes
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
    let tryPos = originalPos.clone().add(moveVec.clone().multiplyScalar(speed * delta));
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
        } else {
            velocityY -= gravity * delta;
            playerObj.position.y += velocityY * delta;
        }
    } else {
        velocityY -= gravity * delta;
        playerObj.position.y += velocityY * delta;
    }

    const frontRay = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(1, 0, 0),
        0,
        2
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
    const elevadores = scene.children.filter(obj => obj.name === 'elevador');
    elevadores.forEach(elevador => { moveElevador(elevador, downRay, frontRay); });
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
    }

    if (window.labelRenderer && controls.isLocked) {
        window.labelRenderer.render(scene, camera);
    }

    if (areaChaveData && areaChaveData.animandoBloco && areaChaveData.blocoAnimado && areaChaveData.chaveAnimada) {
        areaChaveData.tempoAnimacao += delta;
        let t = Math.min(areaChaveData.tempoAnimacao / areaChaveData.duracaoAnimacao, 1);

        // EaseOutCubic
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
        // Interpolação entre posição inicial e final
        const blocoY0 = -4;
        const blocoY1 = 6;
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
            let t = Math.min(scene.userData.tempoAnimacaoChaveAmarela / 1.2, 1); // 1.2s para cair
        
            // Posição inicial: logo acima do topo da torre
            // Posição final: topo da torre (altura/2)
            const alturaTorre = scene.userData.torreEspecial.geometry.parameters.height;
            const yTopo = alturaTorre - 25;
            const yFinal = alturaTorre - 35;
        
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
                const baseY = alturaTorre - 35; // baseY igual ao yFinal da animação de queda
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
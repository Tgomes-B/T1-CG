import { adicionarInimigoCena } from './inimigo.js';
import { loadEnemyOBJ } from './enemy.js';
import { setupAreaChave, criaChave, recriarPilarComChave,criaBlocoChave } from './areaChave.js';
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
import { adicionaPrediosArea4, checaTeleportePortais,getPredioColiders, checaColisaoPredios, prediosData,getPredioColidersFromScene, criaParedesArea4, desceParedesArea4 } from './area4.js';
import { criaSoldier } from './Soldier.js';
import { checaPortalVermelho } from './area4.js';
export { isPaused };

function updateHUD() {
    const healthElement = document.getElementById("health");
    healthElement.style.width = playerHealth + "%";
    if (playerHealth > 60) {
      healthElement.style.background = "limegreen";
    } else if (playerHealth > 30) {
      healthElement.style.background = "yellow";
    } else {
      healthElement.style.background = "red";
    }
    document.getElementById("ammo").textContent = "Ammo: " + playerAmmo;
  
    // Retrato estilo Doom
    const face = document.getElementById("player-face");
    if (playerHealth > 60) {
      face.src = "images/faces/face100.png";
    } else if (playerHealth > 30) {
      face.src = "images/faces/face50.png";
    } else {
      face.src = "images/image.png";
    }
  }

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
let prediosLoaded = false;
export let jogoFinalizado = false;
let vaiDesce = false; 
let canJump = false;
let isRunning = false;
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
    window.camera = camera;
    window.renderer = renderer;

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

function mostraMensagemFinal() {
    const div = document.createElement('div');
    div.innerText = "Você finalizou o jogo!";
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.fontSize = '3em';
    div.style.color = '#ff2222';
    div.style.background = 'rgba(0,0,0,0.7)';
    div.style.padding = '40px 80px';
    div.style.borderRadius = '20px';
    div.style.zIndex = '9999';

    // Esconde ESC/instructions/blocker
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    if (blocker) blocker.style.display = 'none';
    if (instructions) instructions.style.display = 'none';

    // Botão de restart
    const btn = document.createElement('button');
    btn.innerText = "Reiniciar";
    btn.style.display = 'block';
    btn.style.margin = '40px auto 0 auto';
    btn.style.fontSize = '2em';
    btn.style.padding = '20px 40px';
    btn.style.background = '#222';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.cursor = 'pointer';
    btn.onclick = () => location.reload();

    div.appendChild(btn);
    document.body.appendChild(div);
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

    let loadedEnemies = 0;
    let areaChaveLoaded = false;
    let prediosLoaded = false;

    function tryHideLoading() {
        console.log('loadedEnemies:', loadedEnemies, 'areaChaveLoaded:', areaChaveLoaded, 'prediosLoaded:', prediosLoaded);
        if (loadedEnemies === enemyPositions.length && areaChaveLoaded && prediosLoaded) {
            if (window.camera && window.renderer) {
                const posInicial = window.camera.position.clone();
                const lookInicial = window.camera.getWorldDirection(new THREE.Vector3()).clone();

                window.camera.position.set(areas[3].position.x, areas[3].position.y + 10, areas[3].position.z + 10);
                window.camera.lookAt(areas[3].position.x, areas[3].position.y + 5, areas[3].position.z);

                window.renderer.render(scene, window.camera);

                window.camera.position.copy(posInicial);
                window.camera.lookAt(posInicial.x + lookInicial.x, posInicial.y + lookInicial.y, posInicial.z + lookInicial.z);
            }

            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'none';
        }
    }

    // Carrega inimigos com fallback de erro
    enemyPositions.forEach((enemyPos) => {
        loadEnemyOBJ('images/sprites/skull/skull.obj', enemyPos, (enemy) => {
            enemy.position.set(enemyPos.x, enemyPos.y, enemyPos.z);
            scene.add(enemy);
            enemiesArea1.push(enemy);
            if (enemy.userData.boxHelper) scene.add(enemy.userData.boxHelper);
            loadedEnemies++;
            if (loadedEnemies === enemyPositions.length) {
                areaChaveData = setupAreaChave(scene, area1, enemiesArea1);
                areaChaveLoaded = true;
                tryHideLoading();
            }
        }, () => { // fallback em caso de erro
            loadedEnemies++;
            if (loadedEnemies === enemyPositions.length) {
                areaChaveData = setupAreaChave(scene, area1, enemiesArea1);
                areaChaveLoaded = true;
                tryHideLoading();
            }
        });
    });

    adicionaPrediosArea4(scene, areas[3], controls, () => {
        if (window.camera && window.renderer) {
            const posInicial = window.camera.position.clone();
            const lookInicial = window.camera.getWorldDirection(new THREE.Vector3()).clone();
    
            window.camera.position.set(areas[3].position.x, areas[3].position.y + 10, areas[3].position.z + 10);
            window.camera.lookAt(areas[3].position.x, areas[3].position.y + 5, areas[3].position.z);
            console.log('prewarm');
    
            window.renderer.render(scene, window.camera);
    
            window.camera.position.copy(posInicial);
            window.camera.lookAt(posInicial.x + lookInicial.x, posInicial.y + lookInicial.y, posInicial.z + lookInicial.z);
        }
    
        prediosLoaded = true;
        tryHideLoading();
    });
    criaParedesArea4(scene, areas[3]);
    setupArea2(scene);

    const torresArea2 = [];
    criaSoldier(areas[2].position.clone().add(new THREE.Vector3(0, 10, 0)), scene);
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

    criaPilarChaveAzul(scene);
}

// Função para criar o pilar da chave azul
function criaPilarChaveAzul(scene) {
    // Cria o pilar
    const pilarAzul = criaBlocoChave(3); // Use um número diferente do pilar vermelho
    pilarAzul.name = 'pilarChaveAzul';

    /*// Cria a chave azul
    const chaveAzul = criaChave('blue');
    chaveAzul.position.set(0, 4, 0); // Posição relativa ao topo do pilar
    chaveAzul.userData.isCollectable = true;

    // Adiciona a chave ao pilar
    pilarAzul.add(chaveAzul);*/

    // Adiciona o pilar à cena
    scene.add(pilarAzul);
}

const music = document.getElementById('doomMusic');

instructions.addEventListener('click', () => {
    if (music) {
        music.volume = 0.3;
        if (music.paused) music.play(); // Só toca se estiver pausada
    }
    if (!jogoFinalizado) controls.lock();
}, false);

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
    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyF') {
            const portalRed = scene.getObjectByName('portalRed');
            if (portalRed) {
                fadeInOpacity(portalRed, 1, 1500); // Transição para opacidade 1 em 1.5s
                // Também faz para o centro do portal
                portalRed.parent.children.forEach(child => {
                    if (child.name === 'portalRed' || (child.material && child.material.color && child.material.color.equals(new THREE.Color(0xff2222)))) {
                        fadeInOpacity(child, 1, 1500);
                    }
                });
            }
        }
        if (jogoFinalizado) {
            event.preventDefault();
            return;
        }
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

    window.addEventListener('keyup', (event) => {
        if (jogoFinalizado) {
            event.preventDefault();
            return;
        }
        movementControls(event.code, false);
    });

    window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

    window.addEventListener('wheel', (event) => {
        if (jogoFinalizado) {
            event.preventDefault();
            return;
        }
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
    const music = document.getElementById('doomMusic');

    instructions.addEventListener('click', () => {
        if (music) {
            music.volume = 0.3;
            music.play();
        }
        if (!jogoFinalizado) controls.lock();
    }, false);

    controls.addEventListener('lock', () => {
        if (jogoFinalizado) {
            controls.unlock();
            return;
        }
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'block';
    });

    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyQ') {
            const music = document.getElementById('doomMusic');
            if (music) {
                music.muted = !music.muted;
            }
        }
    });

    controls.addEventListener('unlock', () => {
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');
        if (jogoFinalizado) {
            if (blocker) blocker.style.display = 'none';
            if (instructions) instructions.style.display = 'none';
            const crosshair = document.getElementById('crosshair');
            if (crosshair) crosshair.style.display = 'none';
            return;
        }
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

/**
 * Faz transição de opacidade para deixar o objeto visível.
 * @param {THREE.Object3D} obj - Objeto transparente
 * @param {number} targetOpacity - Opacidade final (ex: 1)
 * @param {number} duration - Duração em ms (ex: 1000)
 */
export function fadeInOpacity(obj, targetOpacity = 1, duration = 1000) {
    if (!obj) return;
    obj.traverse(child => {
        if (child.material && 'opacity' in child.material) {
            child.material.transparent = true;
            const start = child.material.opacity;
            const startTime = performance.now();
            function animate() {
                const now = performance.now();
                const t = Math.min((now - startTime) / duration, 1);
                child.material.opacity = start + (targetOpacity - start) * t;
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    child.material.opacity = targetOpacity;
                }
            }
            animate();
        }
    });
}

export function moveAnimate(delta) {
    if (jogoFinalizado) return;
    const playerObj = controls.getObject();
    const hangar = scene.getObjectByName('hangar');
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

    const predioColiders = getPredioColidersFromScene(scene);

    if (checaColisaoPredios(playerObj, predioColiders)) {
        playerObj.position.copy(originalPos);
    }

    let playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );  
    
    checaTeleportePortais(
        controls.getObject(),
        scene.getObjectByName('portalBlue'),
        scene.getObjectByName('portalOrange'),
        predioColiders
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

                const chaveSound = document.getElementById('chaveSound');
                if (chaveSound) {
                    chaveSound.currentTime = 0;
                    chaveSound.play();
                }
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

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC') {
        vaiDesce = true;
    }
});

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

    
    // desce a parede
    if (vaiDesce) {
        desceParedesArea4(scene, 0, 0.01);
    }

    if (!jogoFinalizado && checaPortalVermelho(controls.getObject(), scene)) {
        jogoFinalizado = true;
        mostraMensagemFinal();
        controls.unlock();
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
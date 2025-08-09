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
let isPaused = false;
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
        spritesheet: "images/sprites/rocketLauncher.png",
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
        case 'ShiftLeft': moveDown = value; break;
    }
}

export function moveAnimate(delta) {
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
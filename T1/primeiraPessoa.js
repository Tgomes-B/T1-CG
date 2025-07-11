/**
 * Configuração principal do jogo em primeira pessoa.
 * @module primeiraPessoa
 */
import { adicionarInimigoCena } from './inimigo.js';
import { createEnemy, loadEnemyOBJ, updateEnemyBehavior } from './enemy.js';
import { setupAreaChave } from './areaChave.js';
import { setupArea2 as setupArea2 } from './areaElevada.js';
import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';

let stats, renderer, scene, camera, controls, clock;
let areaChaveData;
let spotLightHelper, areas, ramp, ground, walls;
let moveForward = false, moveBackward = false, moveLeft = false, 
    moveRight = false, moveUp = false, moveDown = false;

let currentWeaponIndex = 0;
const gravity = 9.8; 
let velocityY = 0;   
const speed = 20;
const WEAPONS = {
    launcher: {
        name: "launcher",
        fireRate: 500, // ms
        showProjectile: true,
        sprite: null,
        spritesheet: null, // não precisa para lançador
        create: createGun // Função para criar o modelo da arma
    },
    chaingun: {
        name: "chaingun",
        fireRate: 50, // ms (20 tiros por segundo)
        showProjectile: false,
        sprite: null,
        spritesheet: "images/sprites/chaingun.png",
        frames:3,
        create: createChaingunSprite // Função para criar o sprite da chaingun
    }
};
let currentWeapon = WEAPONS.launcher;
const weaponNames = Object.keys(WEAPONS); 

/**
 * Inicializa a cena, câmera, controles e objetos do jogo.
 */
function init() {
    stats = new Stats();
    renderer = initRenderer("rgb(70, 150, 240)");
    scene = new THREE.Scene();
    window.scene = scene; 
    camera = createCamera();

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();
    setupInitialCameraPosition();
    clock = new THREE.Clock();

    setupEnvironment();
    setupLightingAndCollision();
    setupGameElements();
    setupEventListeners();
}

/**
 * Configura a posição inicial da câmera.
 */
function setupInitialCameraPosition() {
    controls.getObject().position.set(10, 7, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(
        lookAtTarget, 
        controls.getObject().position
    ).normalize();
    controls.getObject().rotation.y = Math.atan2(direction.x, direction.z);
}

/**
 * Configura o ambiente do jogo.
 * caminho antigo: images/sprites/2025.1_T2_Assets/cacodemon.glb
 */
function setupEnvironment() {
    ({ areas, ramp, ground } = criaAreasRampas(scene));
    walls = criaParedes(scene);

    // Aguarda as torres serem criadas
    setTimeout(() => {
        const torresArea2 = areas[1].children.filter(obj => obj.name === "torre");
        // Pegue 3 torres (exemplo: as 3 primeiras)
        const torresParaInimigos = torresArea2.slice(0, 3);
        torresParaInimigos.forEach(torre => {
            const pos = {
                x: torre.position.x,
                y: torre.position.y + (torre.geometry.parameters.height / 2) + 2,
                z: torre.position.z
            };
            adicionarInimigoCena(areas[1], 'images/sprites/teste/cacodemonanimations.glb', pos);
        });
    }, 0);

    areaChaveData = setupAreaChave(scene, areas[0]);
    setupArea2(areas[1], scene);
}

/**
 * Configura iluminação e colisões.
 */
function setupLightingAndCollision() {
    setupCollision(scene);
    spotLightHelper = setupLighting(scene);
}

/**
 * Configura elementos do jogo como mira e arma.
 */
function setupGameElements() {
    setupCrosshair();
    createGun();
    setupShooting(camera, scene, controls, () => currentWeapon);
}

/**
 * Cria e configura a câmera do jogo.
 * @returns {THREE.PerspectiveCamera} A câmera configurada.
 */
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

/**
 * Configura os event listeners do jogo.
 */
function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.code, true));
    window.addEventListener('keyup', (event) => movementControls(event.code, false));
    window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

    window.addEventListener('keydown', (event) => {
        movementControls(event.code, true);
        if (event.code === "Digit1") {
            currentWeaponIndex = 0; // Launcher
            switchWeaponByIndex(currentWeaponIndex);
        }
        if (event.code === "Digit2") {
            currentWeaponIndex = 1; // Chaingun
            switchWeaponByIndex(currentWeaponIndex);
        }
    });
    
    window.addEventListener('wheel', (event) => {
        if (event.deltaY < 0) { // Scroll up
            currentWeaponIndex = (currentWeaponIndex + 1) % weaponNames.length;
        } else if (event.deltaY > 0) { // Scroll down
            currentWeaponIndex = (currentWeaponIndex - 1 + weaponNames.length) % weaponNames.length;
        }
        switchWeaponByIndex(currentWeaponIndex);
    });
    
}

/**
 * Cria e configura a mira na tela.
 */
function setupCrosshair() {
    let crosshair = document.getElementById('crosshair');
    if (!crosshair) {
        crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        Object.assign(crosshair.style, {
            position: 'fixed',
            width: '20px',
            height: '20px',
            background: 'url(../T1/images/crosshair.png)',
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
    if (index < 0 || index >= weaponNames.length) {
        console.error(`Índice de arma inválido: ${index}`);
        return;
    }

    const weaponName = weaponNames[index];
    const weapon = WEAPONS[weaponName];

    if (!weapon) {
        console.error(`Arma "${weaponName}" não encontrada.`);
        return;
    }

    if (currentWeapon.name === weaponName) return;

    // Remove arma anterior
    removeCurrentWeaponVisual();

    // Atualiza a arma atual
    currentWeapon = weapon;

    // Cria o visual da nova arma
    currentWeapon.create();
}

function createChaingunSprite() {
    const frames = WEAPONS.chaingun.frames;
    const texture = new THREE.TextureLoader().load(WEAPONS.chaingun.spritesheet);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / frames, 1); // 4 frames na horizontal
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.name = "chaingun_sprite";
    sprite.scale.set(1.5, 2, 1.5);
    sprite.position.set(0, -1, -3);
    camera.add(sprite);

    // Guarda referência para animação
    WEAPONS.chaingun.sprite = sprite;
    WEAPONS.chaingun.spriteTexture = texture;
    WEAPONS.chaingun.currentFrame = 0;
}
function removeCurrentWeaponVisual() {
    // Remove mesh ou sprite da câmera
    const gun = camera.getObjectByName("launcher");
    if (gun) camera.remove(gun);
    const chaingunSprite = camera.getObjectByName("chaingun_sprite");
    if (chaingunSprite) camera.remove(chaingunSprite);
}

/**
 * Cria o modelo da arma do jogador
 */
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

/**
 * Configura os controles de movimento e bloqueio do ponteiro.
 */
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

/**
 * Adiciona iluminação ambiente básica à cena.
 * @param {THREE.Scene} scene - A cena a ser iluminada.
 */
function initDefaultBasicLight(scene) {
    const light = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(light);
}

/**
 * Atualiza os controles de movimento com base nas teclas pressionadas.
 * @param {string} key - Código da tecla pressionada.
 * @param {boolean} value - Se a tecla foi pressionada (true) ou solta (false).
 */
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
/**
 * Atualiza a posição do jogador e verifica colisões.
 * @param {number} delta - Tempo decorrido desde o último frame.
 */
export function moveAnimate(delta) {
    const playerObj = controls.getObject();
    const alturaPlayer = 2;
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const moveVec = new THREE.Vector3();

    // 1. Calcula vetor de movimento
    if (moveForward) moveVec.add(forward);
    if (moveBackward) moveVec.add(forward.clone().negate());
    if (moveRight) moveVec.add(right);
    if (moveLeft) moveVec.add(right.clone().negate());
    if (moveVec.lengthSq() > 0) moveVec.normalize();

    // 2. Tenta mover normalmente
    const originalPos = playerObj.position.clone();
    let tryPos = originalPos.clone().add(moveVec.clone().multiplyScalar(speed * delta));
    playerObj.position.copy(tryPos);

    let playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );

    const collidables = scene.children.filter(obj =>
        obj.userData && obj.userData.isCollidable && obj.name !== "camera"
    );

    let collided = collidables.some(obj =>
        obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
    );

    // 3. Se colidiu, tenta auto step (subir degrau/área)
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
            let collidedStep = collidables.some(obj =>
                obj.userData.collisionBox && playerBoxStep.intersectsBox(obj.userData.collisionBox)
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

    // 4. Movimento vertical manual (pulo/crouch)
    if (moveUp) velocityY = speed; // Pulo
    if (moveDown) velocityY = -speed; // Descida manual

    // 5. Alinha os pés ao chão/área usando raycast
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
        (obj.name && obj.name.startsWith('ramp'))
    );
    const surfaceIntersects = downRay.intersectObjects(walkableSurfaces, false);

    if (surfaceIntersects.length > 0) {
        const surfaceY = surfaceIntersects[0].point.y;
        const playerFeet = playerObj.position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;
    
        if (diff < 1.5) {
            // Ajusta ao chão suavemente
            if (velocityY < 0) {
                velocityY = 0; // Zera a velocidade de queda
            }
            playerObj.position.y = THREE.MathUtils.lerp(
                playerObj.position.y,
                surfaceY + alturaPlayer,
                0.1 // Taxa de suavização
            );
        } else {
            // Aplica gravidade se estiver acima do chão
            velocityY -= gravity * delta;
            playerObj.position.y += velocityY * delta;
        }
    } else {
        // Aplica gravidade se não houver interseção
        velocityY -= gravity * delta;
        playerObj.position.y += velocityY * delta;
    }
}

/**
 * Loop principal de renderização do jogo.
 */
function render() {
    stats.update();
    const delta = clock.getDelta();

    // Fazer barras de vida olharem para a câmera
    scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy) {
            // Encontrar a barra de vida na hierarquia
            obj.traverse(child => {
                if (child.userData && child.userData.isHealthBar) {
                    child.lookAt(camera.position);
                }
            });
        }
    });

    // Atualiza animações dos inimigos
    scene.traverse(obj => {
        if (obj.userData && obj.userData.mixer) {
            obj.userData.mixer.update(delta);
        }
    
        if (obj.userData && obj.userData.isEnemy) {
            const playerPos = controls.getObject().position;
            const enemyPos = obj.position;
            const dist = playerPos.distanceTo(enemyPos);

            const boxSize = 7.57; // mesmo valor usado na criação
            const boxHeight = 10; // Aumentar altura da caixa de colisão
            const boxCenter = obj.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
            if (
                obj.userData &&
                obj.userData.collisionBox instanceof THREE.Box3 &&
                obj.userData.collisionBox.min && obj.userData.collisionBox.max
            ) {
                obj.userData.collisionBox.min.copy(min);
                obj.userData.collisionBox.max.copy(max);
            
                // Atualiza o helper visual
                if (
                    obj.userData.boxHelper &&
                    obj.userData.boxHelper.box instanceof THREE.Box3
                ) {
                    obj.userData.boxHelper.box.copy(obj.userData.collisionBox);
                    obj.userData.boxHelper.updateMatrixWorld(true);
                }
            }
            // Troca de estado: idle -> perseguir
            if (obj.userData.state === "idle" && dist < obj.userData.detectionRadius) {
                obj.userData.state = "perseguir";
            }
    
            // Troca de estado: perseguir -> idle (desistir)
            if (obj.userData.state === "perseguir" && dist > obj.userData.detectionRadius + 10) {
                obj.userData.state = "idle";
            }
    
            // Idle: flutuando
            if (obj.userData.state === "idle") {
                const targetY = obj.userData.baseY + Math.sin(performance.now() * 0.001) * 2;
                obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.1);
            }
    
            // Perseguir: vai atrás do player
            if (obj.userData.state === "perseguir") {
                // Movimento horizontal: direção XZ
                const dir = new THREE.Vector3().subVectors(playerPos, enemyPos);
                dir.y = 0; // Ignorar altura para movimento horizontal
                const distance = dir.length();
                
                if (distance > 5) { // distância mínima para não grudar
                    dir.normalize();
                    obj.position.add(dir.multiplyScalar(5 * delta));
                }
                
                // Movimento vertical: ajusta suavemente a altura do inimigo para a altura do jogador
                const targetHeight = playerPos.y;
                const heightDifference = targetHeight - obj.position.y;
                const verticalSpeed = 0.05; // Velocidade de ajuste vertical
                obj.position.y += heightDifference * verticalSpeed * delta * 60; // delta * 60 para taxa constante
                
                // Rotaciona para olhar para o player (horizontalmente)
                const angle = Math.atan2(playerPos.x - enemyPos.x, playerPos.z - enemyPos.z);
                obj.rotation.y = angle;
            }
        }
    });

    if (controls.isLocked) {
        moveAnimate(delta);
        updateProjectiles(delta);

                // Atualiza comportamento dos inimigos
                const enemies = scene.children.filter(obj => obj.name === "enemy");
                for(const enemy of enemies) {
                    updateEnemyBehavior(enemy, controls.getObject(), scene, delta);
                }
    }

    if (areaChaveData && areaChaveData.getChaveAnimada()) {
        const chave = areaChaveData.getChaveAnimada();
        const baseY = areaChaveData.getBaseY();
        chave.position.y = baseY + Math.sin(performance.now() * 0.002) * 1.2; // 1.2 é a amplitude
    }

    if (spotLightHelper) spotLightHelper.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

/**
 * Função principal que inicia o jogo.
 */
function main() {
    init();
    render();
}

main();
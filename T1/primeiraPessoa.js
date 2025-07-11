/** 
 * Configuração principal do jogo em primeira pessoa.
 * @module primeiraPessoa
 */
import { adicionarInimigoCena } from './inimigo.js';
import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';
import { CSS2DRenderer, CSS2DObject } from '../build/jsm/renderers/CSS2DRenderer.js';

let stats, renderer, scene, camera, controls, clock;
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
    adicionarInimigoCena(scene, 'images/sprites/teste/cacodemonanimations.glb', { x: 100, y: 20, z: 100 });
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
    const alturaPlayer = 7;
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Calcular movimento total
    const moveVec = new THREE.Vector3();
    if (moveForward) moveVec.add(forward);
    if (moveBackward) moveVec.add(forward.clone().negate());
    if (moveRight) moveVec.add(right);
    if (moveLeft) moveVec.add(right.clone().negate());
    
    if (moveVec.length() > 0) {
        moveVec.normalize();
    }
    
    const collidables = scene.children.filter(obj =>
        obj.userData && obj.userData.isCollidable && obj.name !== "camera"
    );
    
    const originalPos = playerObj.position.clone();
    
    // Movimento completo (direção combinada)
    playerObj.position.x += moveVec.x * speed * delta;
    playerObj.position.z += moveVec.z * speed * delta;
    
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );
    
    if (collidables.some(obj => 
        obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
    )) {
        // Se colidiu, tentar movimento em X separadamente
        playerObj.position.z = originalPos.z;
        playerBox.setFromCenterAndSize(
            playerObj.position.clone(),
            new THREE.Vector3(0.3, alturaPlayer, 0.3)
        );
        
        if (collidables.some(obj => 
            obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
        )) {
            playerObj.position.x = originalPos.x;
        }
        
        // Se colidiu em X, tentar movimento em Z separadamente
        playerObj.position.x = originalPos.x;
        playerObj.position.z += moveVec.z * speed * delta;
        playerBox.setFromCenterAndSize(
            playerObj.position.clone(),
            new THREE.Vector3(0.3, alturaPlayer, 0.3)
        );
        
        if (collidables.some(obj => 
            obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
        )) {
            playerObj.position.z = originalPos.z;
        }
    }

    // Verificar colisão com inimigos
    const enemies = scene.children.filter(obj => 
        obj.userData && obj.userData.isEnemy
    );
    
    for (const enemy of enemies) {
        if (enemy.userData.collisionBox && playerBox.intersectsBox(enemy.userData.collisionBox)) {
            // Reverter movimento se colidiu com inimigo
            playerObj.position.copy(originalPos);
            break;
        }
    }

    // Movimento vertical manual (pulo/crouch)
    if (moveUp) velocityY = speed; // Pulo
    if (moveDown) velocityY = -speed; // Descida manual

    // Alinha os pés ao chão/área usando raycast
    const downRay = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    const walkableSurfaces = scene.children.filter(obj =>
        obj.name === 'ground' ||
        obj.name === 'topo_colisao' ||
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
 * Função para mover o inimigo com colisão
 */
function moveEnemy(enemy, targetPos, delta, collidables) {
    const enemySpeed = 10; // Velocidade aumentada
    const enemySize = new THREE.Vector3(5.0, 7.0, 5.0); // Tamanho aumentado
    
    const originalPos = enemy.position.clone();
    const dir = new THREE.Vector3().subVectors(targetPos, originalPos);
    dir.y = 0; // Movimento apenas horizontal
    
    if (dir.length() === 0) return;
    
    dir.normalize();
    
    // Movimento completo
    enemy.position.x = originalPos.x + dir.x * enemySpeed * delta;
    enemy.position.z = originalPos.z + dir.z * enemySpeed * delta;
    
    // Criar caixa de colisão temporária para verificação
    const enemyBox = new THREE.Box3().setFromCenterAndSize(
        enemy.position.clone(),
        enemySize
    );
    
    if (collidables.some(obj => 
        obj.userData.collisionBox && enemyBox.intersectsBox(obj.userData.collisionBox)
    )) {
        // Reverter movimento completo
        enemy.position.x = originalPos.x;
        enemy.position.z = originalPos.z;
        
        // Tentar movimento apenas em X
        enemy.position.x = originalPos.x + dir.x * enemySpeed * delta;
        enemyBox.setFromCenterAndSize(
            enemy.position.clone(),
            enemySize
        );
        
        if (collidables.some(obj => 
            obj.userData.collisionBox && enemyBox.intersectsBox(obj.userData.collisionBox)
        )) {
            enemy.position.x = originalPos.x;
        }
        
        // Tentar movimento apenas em Z
        enemy.position.z = originalPos.z + dir.z * enemySpeed * delta;
        enemyBox.setFromCenterAndSize(
            enemy.position.clone(),
            enemySize
        );
        
        if (collidables.some(obj => 
            obj.userData.collisionBox && enemyBox.intersectsBox(obj.userData.collisionBox)
        )) {
            enemy.position.z = originalPos.z;
        }
    }
}

/**
 * Loop principal de renderização do jogo.
 */
function render() {
    stats.update();
    let delta = clock.getDelta();
    
    // Limitar delta para evitar problemas quando o jogo está minimizado
    if (delta > 0.1) delta = 0.1;

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

            // Atualizar caixa de colisão do inimigo
            const boxSize = 12.0; // Aumentado de 9 para 12
            const boxHeight = 15.0; // Aumentado de 12 para 15
            const boxCenter = obj.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
            obj.userData.collisionBox.min.copy(min);
            obj.userData.collisionBox.max.copy(max);
            
            // Atualiza o helper visual
            if (obj.userData.boxHelper) {
                obj.userData.boxHelper.box.copy(obj.userData.collisionBox);
                obj.userData.boxHelper.updateMatrixWorld(true);
            }
            
            // Troca de estado: idle -> perseguir
            if (obj.userData.state === "idle" && dist < obj.userData.detectionRadius) {
                obj.userData.state = "perseguir";
                console.log("Inimigo agora está perseguindo!");
            }
    
            // Troca de estado: perseguir -> idle (desistir)
            if (obj.userData.state === "perseguir" && dist > obj.userData.detectionRadius + 10) {
                obj.userData.state = "idle";
                console.log("Inimigo parou de perseguir!");
            }
    
            // Idle: flutuando
            if (obj.userData.state === "idle") {
                const targetY = obj.userData.baseY + Math.sin(performance.now() * 0.001) * 2;
                obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.1);
            }
    
            // Perseguir: vai atrás do player
            if (obj.userData.state === "perseguir") {
                // Obtém objetos colidíveis
                const collidables = scene.children.filter(objColl => 
                    objColl.userData && objColl.userData.isCollidable && 
                    objColl.name !== "camera"
                );
                
                // Usa função de movimento com colisão
                moveEnemy(obj, playerPos, delta, collidables);
                
                // Movimento vertical: ajusta suavemente a altura do inimigo para a altura do jogador
                const targetHeight = playerPos.y;
                const heightDifference = targetHeight - obj.position.y;
                const verticalSpeed = 0.05; // Velocidade de ajuste vertical
                obj.position.y += heightDifference * verticalSpeed * delta * 60;
                
                // Rotaciona para olhar para o player (horizontalmente)
                const angle = Math.atan2(playerPos.x - enemyPos.x, playerPos.z - enemyPos.z);
                obj.rotation.y = angle;
            }
        }
    });

    if (controls.isLocked) {
        moveAnimate(delta);
        updateProjectiles(delta);
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
/**
 * Configuração principal do jogo em primeira pessoa.
 * @module primeiraPessoa
 */

import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';

let stats, renderer, scene, camera, controls, clock;
let spotLightHelper, areas, ramp, ground, walls;
let moveForward = false, moveBackward = false, moveLeft = false, 
    moveRight = false, moveUp = false, moveDown = false;
const speed = 20;
const WEAPONS = {
    launcher: {
        name: "launcher",
        fireRate: 500, // ms
        showProjectile: true,
        sprite: null,
        spritesheet: null // não precisa para lançador
    },
    chaingun: {
        name: "chaingun",
        fireRate: 50, // ms (20 tiros por segundo)
        showProjectile: false,
        sprite: null,
        spritesheet: [
            "sprites/chaingun_0.png",
            "sprites/chaingun_1.png",
            "sprites/chaingun_2.png",
            "sprites/chaingun_3.png"
        ]
    }
};
let currentWeapon = WEAPONS.launcher;

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
    controls.getObject().position.set(10, 2, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(
        lookAtTarget, 
        controls.getObject().position
    ).normalize();
    controls.getObject().rotation.y = Math.atan2(direction.x, direction.z);
}

/**
 * Configura o ambiente do jogo.
 */
function setupEnvironment() {
    ({ areas, ramp, ground } = criaAreasRampas(scene));
    walls = criaParedes(scene);
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
    cam.position.set(-5, 7, -5);
    cam.lookAt(new THREE.Vector3(0, 7, 0));
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
            if (event.code === "Digit1") switchWeapon("chaingun");
            if (event.code === "Digit2") switchWeapon("launcher");
        });
        window.addEventListener('keyup', (event) => movementControls(event.code, false));
        window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
        window.addEventListener('wheel', (event) => {
            if (event.deltaY < 0) { // scroll up
                switchWeapon("chaingun");
            } else if (event.deltaY > 0) { // scroll down
                switchWeapon("launcher");
            }
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

function switchWeapon(weaponName) {
    if (currentWeapon.name === weaponName) return;
    // Remove arma anterior
    removeCurrentWeaponVisual();
    currentWeapon = WEAPONS[weaponName];
    // Adiciona visual da nova arma
    if (weaponName === "launcher") {
        createGun();
    } else if (weaponName === "chaingun") {
        createChaingunSprite();
    }
}

function createChaingunSprite() {
    const texture = new THREE.TextureLoader().load(WEAPONS.chaingun.spritesheet[0]);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.name = "chaingun_sprite";
    sprite.scale.set(2, 2, 1); // Ajuste conforme necessário
    sprite.position.set(0, -1, -2); // Ajuste conforme necessário
    camera.add(sprite);
    WEAPONS.chaingun.sprite = sprite;
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
    
    const collidables = scene.children.filter(obj => 
        obj.userData && obj.userData.isCollidable && obj.name !== "camera"
    );
    
    let collided = collidables.some(obj => 
        obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
    );
    
    if (!collided) {
        // Movimento permitido
    } else {
        tryPos = originalPos.clone();
        tryPos.x += moveVec.x * speed * delta;
        playerObj.position.copy(tryPos);
        playerBox = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone(),
            new THREE.Vector3(0.3, alturaPlayer, 0.3)
        );
        collided = collidables.some(obj => 
            obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
        );
        
        if (!collided) {
            // Movimento permitido em X
        } else {
            tryPos = originalPos.clone();
            tryPos.z += moveVec.z * speed * delta;
            playerObj.position.copy(tryPos);
            playerBox = new THREE.Box3().setFromCenterAndSize(
                playerObj.position.clone(),
                new THREE.Vector3(0.3, alturaPlayer, 0.3)
            );
            collided = collidables.some(obj => 
                obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)
            );
            
            if (!collided) {
                // Movimento permitido em Z
            } else {
                playerObj.position.copy(originalPos);
            }
        }
    }

    if (moveUp) playerObj.position.y += speed * delta;
    if (moveDown) {
        const downRay = new THREE.Raycaster(
            playerObj.position.clone(),
            new THREE.Vector3(0, -1, 0),
            0,
            0.2
        );
        
        const groundCandidates = scene.children.filter(
            obj => (obj.userData && obj.userData.isCollidable) ||
                   (obj.name && obj.name.startsWith('ramp'))
        );
        
        const intersects = downRay.intersectObjects(groundCandidates, false);
        if (intersects.length === 0) {
            playerObj.position.y -= speed * delta;
        }
    }

    const dir = new THREE.Vector3();
    controls.getDirection(dir);
    dir.y = 0;
    dir.normalize();

    const downRayChao = new THREE.Raycaster(
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
    
    const surfaceIntersects = downRayChao.intersectObjects(walkableSurfaces, false);
    
    if(playerObj.position.y > alturaPlayer){
        controls.getObject().position.y -= speed / 2 * delta;
    }

    let surfaceY = null;
    if (surfaceIntersects.length > 0) {
        surfaceY = surfaceIntersects[0].point.y;
    }

    if (surfaceY !== null) {
        const playerFeet = playerObj.position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;

        if (diff > -0.5 && diff < 1.5) {
            playerObj.position.y = surfaceY + (alturaPlayer / 1.7);
        }
    }
}

/**
 * Loop principal de renderização do jogo.
 */
function render() {
    stats.update();
    const delta = clock.getDelta();

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
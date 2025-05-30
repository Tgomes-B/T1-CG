import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';


let stats, renderer, scene, camera, controls, clock;
let spotLightHelper, areas, ramp, ground, walls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
const speed = 20;

function init() {
    stats = new Stats();
    renderer = initRenderer("rgb(70, 150, 240)");
    scene = new THREE.Scene();
    window.scene = scene; 
    camera = createCamera();

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();

    // Posição inicial da câmera
    controls.getObject().position.set(10, 2, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(lookAtTarget, controls.getObject().position).normalize();
    const angleY = Math.atan2(direction.x, direction.z);
    controls.getObject().rotation.y = angleY;

    clock = new THREE.Clock();

    // Ambiente
    ({ areas, ramp, ground } = criaAreasRampas(scene));
    walls = criaParedes(scene);
    setupCollision(scene);
    spotLightHelper = setupLighting(scene);

    initDefaultBasicLight(scene);
    setupEventListeners();
    setupCrosshair();
    createGun();
    setupShooting(camera, scene, controls); 
}

function configureTexture(texture, repeatX, repeatY) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

function createCamera() {
    const cam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cam.position.set(-5, 7, -5);
    cam.lookAt(new THREE.Vector3(0, 7, 0));
    cam.name = "camera";
    scene.add(cam);
    return cam;
}

function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.code, true));
    window.addEventListener('keyup', (event) => movementControls(event.code, false));
    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    }, false);
}

function setupCrosshair() {
    let crosshair = document.getElementById('crosshair');
    if (!crosshair) {
        crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        crosshair.style.position = 'fixed';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.background = 'url(../assets/textures/crosshair.png)';
        crosshair.style.backgroundSize = 'contain';
        crosshair.style.backgroundRepeat = 'no-repeat';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.pointerEvents = 'none';
        crosshair.style.zIndex = '1000';
        crosshair.style.display = 'none'; 
        document.body.appendChild(crosshair);
    } else {
        crosshair.style.display = 'none';
    }
}

function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.name = "gun";
    gun.position.set(0.01,-0.4, -1);
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

function initDefaultBasicLight(scene) {
    const light = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(light);
}

function movementControls(key, value) {
    switch (key) {
        case 'KeyW': moveForward = value; break;
        case 'KeyS': moveBackward = value; break;
        case 'KeyA': moveLeft = value; break;
        case 'KeyD': moveRight = value; break;
        case 'Space': moveUp = value; break;
        case 'ShiftLeft': moveDown = value; break;
    }
}

// FUNÇÃO DE MOVIMENTO SIMPLIFICADA E CORRIGIDA
export function moveAnimate(delta) {
    const playerObj = controls.getObject();
    const alturaPlayer = 7;
    
    // Sistema de movimento
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const moveVec = new THREE.Vector3();
    
    if (moveForward) moveVec.add(forward);
    if (moveBackward) moveVec.add(forward.clone().negate());
    if (moveRight) moveVec.add(right);
    if (moveLeft) moveVec.add(right.clone().negate());
    if (moveVec.lengthSq() > 0) moveVec.normalize();

    // Posição original para colisão
    const originalPos = playerObj.position.clone();
    
    // Testa movimento completo
    let tryPos = originalPos.clone().add(moveVec.clone().multiplyScalar(speed * delta));
    playerObj.position.copy(tryPos);
    
    let playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );
    
    // SIMPLIFICAÇÃO: Todos os objetos colidíveis são tratados igualmente
    const collidables = [];
    
    scene.children.forEach(obj => {
        if (obj.userData && obj.userData.isCollidable && obj.name !== "camera") {
            collidables.push(obj);
        }
    });
    
    // Verifica colisão com todos os objetos colidíveis
    let collided = collidables.some(obj => {
        if (obj.userData.collisionBox) {
            return playerBox.intersectsBox(obj.userData.collisionBox);
        }
        return false;
    });
    
    // Trata colisões com sliding
    if (!collided) {
        // Movimento permitido
    } else {
        // Testa apenas movimento em X
        tryPos = originalPos.clone();
        tryPos.x += moveVec.x * speed * delta;
        playerObj.position.copy(tryPos);
        playerBox = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone(),
            new THREE.Vector3(0.3, alturaPlayer, 0.3)
        );
        collided = collidables.some(obj => obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox));
        
        if (!collided) {
            // Movimento permitido em X
        } else {
            // Testa apenas movimento em Z
            tryPos = originalPos.clone();
            tryPos.z += moveVec.z * speed * delta;
            playerObj.position.copy(tryPos);
            playerBox = new THREE.Box3().setFromCenterAndSize(
                playerObj.position.clone(),
                new THREE.Vector3(0.3, alturaPlayer, 0.3)
            );
            collided = collidables.some(obj => obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox));
            
            if (!collided) {
                // Movimento permitido em Z
            } else {
                // Não pode mover em nenhuma direção
                playerObj.position.copy(originalPos);
            }
        }
    }

    // Movimento vertical
    if (moveUp) playerObj.position.y += speed * delta;
    if (moveDown) {
        // Raycast para checar se há chão/rampa abaixo
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

    // Sistema de ajuste de altura para superfícies
    const dir = new THREE.Vector3();
    controls.getDirection(dir);
    dir.y = 0;
    dir.normalize();

    // Ray para o chão (origem: centro do player)
    const downRayChao = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    
    // Inclui todas as superfícies andáveis: chão, topo de áreas e rampas
    const walkableSurfaces = scene.children.filter(obj => 
        obj.name === 'ground' || 
        obj.name === 'topo_colisao' || 
        (obj.name && obj.name.startsWith('ramp'))
    );
    
    const surfaceIntersects = downRayChao.intersectObjects(walkableSurfaces, false);
    
    if(playerObj.position.y > alturaPlayer){
        controls.getObject().position.y -= speed / 2 * delta;
        console.log("deu certo")
    }

    let surfaceY = null;
    if (surfaceIntersects.length > 0) {
        surfaceY = surfaceIntersects[0].point.y;
    }

    if (surfaceY !== null) {
        const playerFeet = playerObj.position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;

        // Ajusta altura do jogador se estiver próximo à superfície
        if (diff > -0.5 && diff < 1.5) {
            playerObj.position.y = surfaceY + (alturaPlayer / 1.7);
        }
    }
}

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

function main() {
    init();
    render();
}

main();
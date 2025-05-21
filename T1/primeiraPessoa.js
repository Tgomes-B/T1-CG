import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, initDefaultBasicLight, onWindowResize } from "../libs/util/util.js";

let stats, renderer, scene, camera, controls, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
const speed = 20;

//Versão baseada no exemplo do Rodrigo, agora dividindo as declarações em métodos
//Também há uma main ao fim do código

// A fazer (Samuel) : Inserir o JSDoc para cada função, para facilitar entendimento e incrementação
//Exemplo de JSDoc:

/**
 * Inicializa a cena, câmera, controles e outros componentes necessários.
 * Configura texturas, materiais, event listeners e mira.
 * @returns {void}
 */
function init() {
    stats = new Stats();
    renderer = initRenderer("rgb(70, 150, 240)");
    scene = new THREE.Scene();
    camera = createCamera();

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();

    clock = new THREE.Clock();
    initDefaultBasicLight(scene);
    setupTexturesAndMaterials();
    setupEventListeners();
    setupCrosshair();
}

/**
 * Cria uma câmera perspectiva com as dimensões da janela e adiciona à cena.
 * @returns {THREE.PerspectiveCamera} A câmera criada.
 */
function createCamera() {
    const cam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cam.position.set(-5, 2, -5);
    cam.lookAt(new THREE.Vector3(0, 2, 0));
    scene.add(cam);
    return cam;
}

function setupControls() {
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock(), false);

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    scene.add(controls.getObject());
}

function setupTexturesAndMaterials() {
    const loader = new THREE.TextureLoader();
    const groundTexture = configureTexture(loader.load('../assets/textures/wood.png'), 8, 8);
    const rampTexture = configureTexture(loader.load('../assets/textures/wood.png'), 2, 1);
    const whiteWallTexture = configureTexture(loader.load('../assets/textures/stonewall.jpg'), 10, 1);
    const whiteWallTexture2 = configureTexture(loader.load('../assets/textures/stonewall.jpg'), 5, 1);
    const planeMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
    const wallMaterial = new THREE.MeshBasicMaterial({ map: whiteWallTexture });
    const wallMaterial2 = new THREE.MeshBasicMaterial({ map: whiteWallTexture2 });

    createGround(planeMaterial);
    createRamp(rampTexture);
    createWalls(wallMaterial, wallMaterial2);
    createGun();
}

function configureTexture(texture, repeatX, repeatY) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

function createGround(material) {
    const planeGeometry = new THREE.PlaneGeometry(50, 50, 5);
    const ground = new THREE.Mesh(planeGeometry, material);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    scene.add(ground);

    const boxGeometry = new THREE.BoxGeometry(50, 50, 0.5);
    const ground2 = new THREE.Mesh(boxGeometry, material);
    ground2.position.set(58, 5, 0);
    ground2.rotation.x = -0.5 * Math.PI;
    scene.add(ground2);
}

function createRamp(texture) {
    const rampGeometry = new THREE.PlaneGeometry(11, 10);
    const rampMaterial = new THREE.MeshLambertMaterial({ map: texture });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.rotation.x = 1.5 * Math.PI;
    ramp.rotation.y = -Math.PI / 6;
    ramp.position.set(28.5, 2, 0);
    scene.add(ramp);
}

function createWalls(material, material2) {
    const WallGeometry = new THREE.PlaneGeometry(50, 5);
    const smallWallGeometry = new THREE.PlaneGeometry(20, 5);
    const walls = [
        new THREE.Mesh(WallGeometry, material),
        new THREE.Mesh(WallGeometry, material),
        new THREE.Mesh(WallGeometry, material),
        new THREE.Mesh(smallWallGeometry, material2),
        new THREE.Mesh(smallWallGeometry, material2)
    ];

    walls[0].position.set(0, 2.5, -25);
    walls[1].position.set(0, 2.5, 25);
    walls[1].rotation.y = Math.PI;
    walls[2].position.set(-25, 2.5, 0);
    walls[2].rotation.y = Math.PI / 2;
    walls[3].position.set(25, 2.5, 15);
    walls[3].rotation.y = Math.PI / -2;
    walls[4].position.set(25, 2.5, -15);
    walls[4].rotation.y = Math.PI / -2;

    walls.forEach(wall => scene.add(wall));
}

function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.set(0.5, 0.2, -0.5);
    gun.rotation.x = -Math.PI / 2;
    gun.rotation.y = Math.PI / 2;
    controls.getObject().add(gun);
}


//A fazer (Samuel): configurar para que o Crosshair só apareça após inicialização

function setupCrosshair() {
    const crosshair = document.createElement('div');
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
    document.body.appendChild(crosshair);
}

function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
    window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));
    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    }, false);
}

function movementControls(key, value) {
    switch (key) {
        case 87: moveForward = value; break; // W
        case 83: moveBackward = value; break; // S
        case 65: moveLeft = value; break; // A
        case 68: moveRight = value; break; // D
        case 32: moveUp = value; break; // Space
        case 16: moveDown = value; break; // Shift
    }
}

function moveAnimate(delta) {
    const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 2);
    raycaster.ray.origin.copy(controls.getObject().position);
    const isIntersectingGround = raycaster.intersectObjects(scene.children).length > 0;
    
    if (moveForward) controls.moveForward(speed * delta);
    if (moveBackward) controls.moveForward(-speed * delta);
    if (moveRight) controls.moveRight(speed * delta);
    if (moveLeft) controls.moveRight(-speed * delta);
    if (moveUp && camera.position.y <= 100) camera.position.y += speed * delta;
    if (moveDown && !isIntersectingGround) camera.position.y -= speed * delta;
}

function render() {
    stats.update();
    if (controls.isLocked) {
        moveAnimate(clock.getDelta());
        // Atualizar posição e rotação da arma
        const gun = controls.getObject().children[0];
        if (gun) {
            gun.position.set(0, -0.5, -1);
            gun.rotation.x = Math.PI / 2;
        }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function main() {
    init();
    render();
}

main();

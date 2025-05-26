import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, initDefaultBasicLight, onWindowResize } from "../libs/util/util.js";
import { updateProjectiles } from './tiro.js';


let frustum = new THREE.Frustum();
let areas = [];                
let cameraViewProjectionMatrix = new THREE.Matrix4();
let stats, renderer, scene, camera, controls, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
const speed = 20;

//Versão baseada no exemplo do Rodrigo, agora dividindo as declarações em métodos
//Também há uma main ao fim do código

/**
 * Inicializa a cena, câmera, controles e outros componentes necessários.
 * Configura texturas, materiais, event listeners e mira.
 * Deve ser chamada uma única vez no início da aplicação.
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
    setupEventListeners();
    setupCrosshair();
    createGun();
}

/**
 * Cria uma câmera perspectiva com as dimensões da janela e adiciona à cena.
 * Utiliza THREE.PerspectiveCamera.
 * @returns {THREE.PerspectiveCamera} A câmera criada.
 */
function createCamera() {
    const cam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cam.position.set(-5, 2, -5);
    cam.lookAt(new THREE.Vector3(0, 2, 0));
    scene.add(cam);
    return cam;
}

/**
 * Configura os controles de primeira pessoa usando PointerLockControls.
 * Adiciona listeners para travar/destravar o mouse e manipula a exibição dos elementos de UI.
 * @returns {void}
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
 * Configura uma textura para uso em materiais, ajustando repetição e espaço de cor.
 * @param {THREE.Texture} texture - Textura a ser configurada.
 * @param {number} repeatX - Número de repetições no eixo X.
 * @param {number} repeatY - Número de repetições no eixo Y.
 * @returns {THREE.Texture} Textura configurada.
 */
function configureTexture(texture, repeatX, repeatY) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

/**
 * Cria e adiciona uma "arma" (cilindro) ao objeto de controle do jogador.
 * @returns {void}
 */
function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.name = "gun";
    gun.position.set(0.5, 0.2, -0.5);
    gun.rotation.x = -Math.PI / 2;
    gun.rotation.y = Math.PI / 2;
    controls.getObject().add(gun);
}



/**
 * Cria e posiciona o crosshair (mira) no centro da tela usando um elemento HTML.
 * Só deve ser chamado após a inicialização da cena.
 * @returns {void}
 */
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
        crosshair.style.display = 'none'; // começa invisível
        document.body.appendChild(crosshair);
    } else {
        crosshair.style.display = 'none';
    }
}

/**
 * Adiciona listeners para eventos de teclado e resize da janela.
 * Responsável pelo controle de movimento e ajuste da câmera.
 * @returns {void}
 */
function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
    window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));
    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    }, false);
}

/**
 * Atualiza variáveis de movimento com base nas teclas pressionadas/soltas.
 * @param {number} key - Código da tecla pressionada.
 * @param {boolean} value - true se pressionada, false se solta.
 * @returns {void}
 */
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

/**
 * Move o jogador de acordo com as teclas pressionadas.
 * Utiliza o PointerLockControls para movimentação e raycasting para checar o chão.
 * @param {number} delta - Tempo decorrido desde o último frame.
 * @returns {void}
 */
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

/**
 * Loop principal de renderização da cena.
 * Atualiza animações, controles, projéteis e renderiza a cena.
 * Deve ser chamada recursivamente via requestAnimationFrame.
 * @returns {void}
 */
function render() {
    stats.update();
    const delta = clock.getDelta();

    if (controls.isLocked) {
        moveAnimate(delta);
        updateProjectiles(delta);

        // Lógica do frustum de Ambiente.js
        camera.updateMatrixWorld(); // Agora a câmera já está inicializada
        cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

        areas.forEach(area => {
            if (frustum.intersectsObject(area)) {
                // Lógica para áreas visíveis
            }
        });

        const gun = controls.getObject().children[0];
        if (gun) {
            gun.position.set(0, -0.5, -1);
            gun.rotation.x = Math.PI / 2;
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}


/**
 * Função principal de inicialização da aplicação.
 * Chama as funções de setup e inicia o loop de renderização.
 * @returns {void}
 */
function main() {
    init();
    render();
}

// Começa colocar colisão nas paredes
function setupCollision() {
    const walls = scene.children.filter(obj => obj instanceof THREE.Mesh && obj.geometry.type === 'PlaneGeometry');
    walls.forEach(wall => {
        wall.userData.isCollidable = true;
        wall.userData.collisionBox = new THREE.Box3().setFromObject(wall);
    });
    const ground = scene.children.find(obj => obj.name === 'ground');
    if (ground) {
        ground.userData.isCollidable = true;
        ground.userData.collisionBox = new THREE.Box3().setFromObject(ground);
    }

}

main();
export { camera, scene ,controls};

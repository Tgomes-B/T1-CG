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
    window.scene = scene; // <-- adicione esta linha
    camera = createCamera();

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();

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
    setupShooting(camera, scene, controls); // Inicializa o sistema de tiro
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
 * Cria uma câmera perspectiva com as dimensões da janela e adiciona à cena.
 * Utiliza THREE.PerspectiveCamera.
 * @returns {THREE.PerspectiveCamera} A câmera criada.
 */
function createCamera() {
    const cam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cam.position.set(-5, 2, -5);
    cam.lookAt(new THREE.Vector3(0, 2, 0));
    cam.name = "camera";
    scene.add(cam);
    return cam;
}

/**
 * Adiciona listeners para eventos de teclado e resize da janela.
 * Responsável pelo controle de movimento e ajuste da câmera.
 * @returns {void}
 */
function setupEventListeners() {
    window.addEventListener('keydown', (event) => movementControls(event.code, true));
    window.addEventListener('keyup', (event) => movementControls(event.code, false));
    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    }, false);
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
 * Cria e adiciona uma "arma" (cilindro) ao objeto de controle do jogador.
 * @returns {void}
 */
function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.name = "gun";
    gun.position.set(-0.1,-0.4, -1);
    gun.rotation.x = -Math.PI / 2;
    controls.getObject().add(gun);
    camera.add(gun);
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
 * Adiciona uma luz ambiente básica à cena.
 * @param {THREE.Scene} scene - A cena a ser iluminada.
 */
function initDefaultBasicLight(scene) {
    const light = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(light);
}

/**
 * Atualiza variáveis de movimento com base nas teclas pressionadas/soltas.
 * @param {string} key - Código da tecla pressionada.
 * @param {boolean} value - true se pressionada, false se solta.
 * @returns {void}
 */
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
/**
 * Move o jogador de acordo com as teclas pressionadas e checa colisão.
 * Se houver colisão, retorna à posição anterior.
 * @param {number} delta - Tempo decorrido desde o último frame.
 */
export function 
moveAnimate(delta) {
    const prevPosition = controls.getObject().position.clone();

    // Movimento do player
    if (moveForward) controls.moveForward(speed * delta);
    if (moveBackward) controls.moveForward(-speed * delta);
    if (moveRight) controls.moveRight(speed * delta);
    if (moveLeft) controls.moveRight(-speed * delta);
    if (moveUp) controls.getObject().position.y += speed * delta;
    if (moveDown) controls.getObject().position.y -= speed * delta;

    // Caixa de colisão do player
    const alturaPlayer = 2; // altura realista do player
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        controls.getObject().position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );

    // Visualização da caixa do player (opcional)
    if (!window.playerHelper) {
        window.playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
        scene.add(window.playerHelper);
    }
    window.playerHelper.box.copy(playerBox);

    // --- Colisão com paredes e áreas ---
    const collidables = scene.children.filter(
        obj => obj.userData && obj.userData.isCollidable && obj.name !== "camera" && !(obj.name && obj.name.startsWith('ramp'))
    );
    for (const obj of collidables) {
        // Só testa colisão se collisionBox existir (evita erro de undefined)
        if (obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)) {
            controls.getObject().position.copy(prevPosition);
            return; // Sai da função se colidir
        }
    }
    // Calcula a direção para frente
    const direction = new THREE.Vector3();
    controls.getDirection(direction);
    direction.y = 0;
    direction.normalize();
   
    // Ray para o chão (origem: centro do player)
    const downRayChao = new THREE.Raycaster(
        controls.getObject().position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    const groundMeshes = scene.children.filter(obj => obj.name === 'ground');
    const chaoIntersects = downRayChao.intersectObjects(groundMeshes, false);

    // Ray para rampas (origem: à frente do player)
    
    controls.getDirection(direction);
    direction.y = 0;
    direction.normalize();
    const rayOriginRampa = controls.getObject().position.clone().add(direction.multiplyScalar(1.5));
    const downRayRampa = new THREE.Raycaster(
        rayOriginRampa,
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    const rampMeshes = scene.children.filter(obj => obj.name && obj.name.startsWith('ramp'));
    const rampaIntersects = downRayRampa.intersectObjects(rampMeshes, false);

    // Decide qual altura usar (rampa tem prioridade se detectada)
    let surfaceY = null;
    if (rampaIntersects.length > 0) {
        surfaceY = rampaIntersects[0].point.y;
    } else if (chaoIntersects.length > 0) {
        surfaceY = chaoIntersects[0].point.y;
    }

    if (surfaceY !== null) {
        const playerFeet = controls.getObject().position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;
        // Só ajusta se estiver levemente acima ou até 0.3 abaixo da superfície
        if (diff > -0.5 && diff < 1.5) {
            controls.getObject().position.y = surfaceY + (alturaPlayer / 2);
        }
    } 
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
        // ... lógica do frustum, etc ...
    }
    if (spotLightHelper) spotLightHelper.update();
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

main();
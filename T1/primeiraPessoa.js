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
    setupCollision(scene); // Garante que as paredes estão com bounding box
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
    const gunGeometry = new THREE.CylinderGeometry(0.1,0.1,2,32);
    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.name = "gun";
    gun.position.set(0.02,-0.3,-0.5);
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

    // --- Movimento do player com colisão sliding ---
    const playerObj = controls.getObject();
    const alturaPlayer = 2; // altura realista do player
    let moved = false;
    // Calcula vetor de movimento FPS padrão
    const forward = controls.getDirection(new THREE.Vector3()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const moveVec = new THREE.Vector3();
    if (moveForward) moveVec.add(forward);
    if (moveBackward) moveVec.add(forward.clone().negate());
    if (moveRight) moveVec.add(right);
    if (moveLeft) moveVec.add(right.clone().negate());
    if (moveVec.lengthSq() > 0) moveVec.normalize();


    // Salva posição original
    const originalPos = playerObj.position.clone();
    // Testa movimento completo (X e Z)
    let tryPos = originalPos.clone().add(moveVec.clone().multiplyScalar(speed * delta));
    playerObj.position.copy(tryPos);
    let playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );
    // Separate regular collidables from top collision boxes
    const collidables = [];
    const topCollisionBoxes = [];
    
    scene.children.forEach(obj => {
        if (obj.userData && obj.userData.isCollidable && obj.name !== "camera") {
            if (obj.name === 'topo_colisao') {
                topCollisionBoxes.push(obj);
            } else if (!obj.name || !obj.name.startsWith('ramp')) {
                collidables.push(obj);
            }
        }
    });
    
    // Check collision with regular collidables
    let collided = collidables.some(obj => {
        if (obj.userData.collisionBox) {
            return playerBox.intersectsBox(obj.userData.collisionBox);
        }
        return false;
    });
    
    // Check if we're on top of a top_collision box
    const playerBottom = playerObj.position.y - (alturaPlayer / 2);
    let onTopOfSurface = false;
    
    // Check if player is on top of any collision box
    for (const obj of topCollisionBoxes) {
        const box = new THREE.Box3().setFromObject(obj);
        if (playerBox.intersectsBox(box) && 
            playerBottom <= box.max.y + 0.1 &&  // Slightly above the surface
            playerBottom >= box.max.y - 0.5) {   // Or just below the surface
            onTopOfSurface = true;
            // If we're on top, adjust player Y position to stand on the surface
            if (moveDown) {
                moveDown = false;
                playerObj.position.y = box.max.y + (alturaPlayer / 2);
            }
            break;
        }
    }
    
    if (!collided) {
        moved = true;
    } else {
        // Testa apenas X
        tryPos = originalPos.clone();
        tryPos.x += moveVec.x * speed * delta;
        playerObj.position.copy(tryPos);
        playerBox = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone(),
            new THREE.Vector3(0.3, alturaPlayer, 0.3)
        );
        collided = collidables.some(obj => obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox));
        if (!collided) {
            moved = true;
        } else {
            // Testa apenas Z
            tryPos = originalPos.clone();
            tryPos.z += moveVec.z * speed * delta;
            playerObj.position.copy(tryPos);
            playerBox = new THREE.Box3().setFromCenterAndSize(
                playerObj.position.clone(),
                new THREE.Vector3(0.3, alturaPlayer, 0.3)
            );
            collided = collidables.some(obj => obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox));
            if (!collided) {
                moved = true;
            } else {
                // Não pode mover nem X nem Z
                playerObj.position.copy(originalPos);
            }
        }
    }
    // Movimento vertical (Y) - não interfere com colisão horizontal
    if (moveUp) playerObj.position.y += speed * delta;
    if (moveDown) playerObj.position.y -= speed * delta;

    // Caixa de colisão do player para visualização
    playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );
    if (!window.playerHelper) {
        window.playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
        scene.add(window.playerHelper);
    }
    window.playerHelper.box.copy(playerBox);

    // Calcula a direção para frente
    const direction = new THREE.Vector3();
    controls.getDirection(direction);
    direction.y = 0;
    direction.normalize();

    // Ray para o chão (origem: centro do player)
    const downRayChao = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    
    // Inclui tanto o chão quanto as áreas de colisão superiores
    const groundMeshes = [];
    const topCollisionMeshes = [];
    
    scene.children.forEach(obj => {
        if (obj.name === 'ground') {
            groundMeshes.push(obj);
        } else if (obj.name === 'topo_colisao') {
            topCollisionMeshes.push(obj);
        }
    });
    
    // Check for ground intersections first
    let chaoIntersects = downRayChao.intersectObjects(groundMeshes, false);
    
    // If no ground, check top collision boxes
    if (chaoIntersects.length === 0) {
        chaoIntersects = downRayChao.intersectObjects(topCollisionMeshes, false);
    }

    // Ray para rampas (origem: à frente do player)
    controls.getDirection(direction);
    direction.y = 0;
    direction.normalize();
    const rayOriginRampa = playerObj.position.clone().add(direction.multiplyScalar(1.5));
    const downRayRampa = new THREE.Raycaster(
        rayOriginRampa,
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
    // Inclui rampas e topo_colisao para detecção de superfícies
    const rampMeshes = scene.children.filter(obj => (obj.name && obj.name.startsWith('ramp')) || obj.name === 'topo_colisao');
    const rampaIntersects = downRayRampa.intersectObjects(rampMeshes, false);

    // Decide qual altura usar (rampa tem prioridade se detectada)
    let surfaceY = null;
    if (rampaIntersects.length > 0) {
        surfaceY = rampaIntersects[0].point.y;
    } else if (chaoIntersects.length > 0) {
        surfaceY = chaoIntersects[0].point.y;
    }

    if (surfaceY !== null) {
        const playerFeet = playerObj.position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;
        // Só ajusta se estiver levemente acima ou até 0.5 abaixo da superfície
        if (diff > -0.5 && diff < 1.5) {
            playerObj.position.y = surfaceY + (alturaPlayer / 2);
            // Prevent falling through when on top of a surface
            if (onTopOfSurface && moveDown) {
                moveDown = false;
            }
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
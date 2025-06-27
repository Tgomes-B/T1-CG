<<<<<<< Updated upstream
=======
/**
 * Módulo principal do jogo em primeira pessoa.
 * Gerencia a cena, câmera, controles e loop de renderização.
 * @module primeiraPessoa
 */

>>>>>>> Stashed changes
import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initRenderer, onWindowResize } from "../libs/util/util.js";
import { criaAreasRampas, criaParedes, setupLighting } from './Ambiente.js';
import { setupShooting, updateProjectiles } from './tiro.js';
import { setupCollision } from './colisao.js';

<<<<<<< Updated upstream

=======
// Variáveis globais
>>>>>>> Stashed changes
let stats, renderer, scene, camera, controls, clock;
let spotLightHelper, areas, ramp, ground, walls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;
const speed = 20;
/**
<<<<<<< Updated upstream
 * Inicializa a cena, câmera, controles e outros componentes necessários.
 * Configura texturas, materiais, event listeners e mira.
 * Deve ser chamada uma única vez no início da aplicação.
 * @returns {void}
=======
 * Inicializa o jogo, configurando a cena, câmera, controles e elementos iniciais.
>>>>>>> Stashed changes
 */
function init() {
    stats = new Stats();
    renderer = initRenderer("rgb(70, 150, 240)");
    scene = new THREE.Scene();
    window.scene = scene; 
    camera = createCamera();

    controls = new PointerLockControls(camera, renderer.domElement);
    setupControls();

<<<<<<< Updated upstream
    controls.getObject().position.set(10, 2, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(lookAtTarget, controls.getObject().position).normalize();
    const angleY = Math.atan2(direction.x, direction.z);
    controls.getObject().rotation.y = angleY;

    clock = new THREE.Clock();

    // Ambiente
=======
    // Configura posição e rotação inicial da câmera
    controls.getObject().position.set(10, 2, 1); 
    const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
    const direction = new THREE.Vector3().subVectors(
        lookAtTarget, 
        controls.getObject().position
    ).normalize();
    controls.getObject().rotation.y = Math.atan2(direction.x, direction.z);

    clock = new THREE.Clock();

    // Configura ambiente e física
>>>>>>> Stashed changes
    ({ areas, ramp, ground } = criaAreasRampas(scene));
    walls = criaParedes(scene);
    setupCollision(scene);
    spotLightHelper = setupLighting(scene);

<<<<<<< Updated upstream
=======
    // Configura elementos visuais e controles
>>>>>>> Stashed changes
    initDefaultBasicLight(scene);
    setupEventListeners();
    setupCrosshair();
    createGun();
    setupShooting(camera, scene, controls); 
}

/**
<<<<<<< Updated upstream
 * Configura uma textura para uso em materiais, ajustando repetição e espaço de cor.
 * @param {THREE.Texture} texture - Textura a ser configurada.
 * @param {number} repeatX - Número de repetições no eixo X.
 * @param {number} repeatY - Número de repetições no eixo Y.
 * @returns {THREE.Texture} Textura configurada.
=======
 * Configura uma textura com parâmetros padrão.
 * @param {THREE.Texture} texture - A textura a ser configurada.
 * @param {number} repeatX - Valor de repetição no eixo X.
 * @param {number} repeatY - Valor de repetição no eixo Y.
 * @returns {THREE.Texture} A textura configurada.
>>>>>>> Stashed changes
 */
function configureTexture(texture, repeatX, repeatY) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

/**
<<<<<<< Updated upstream
 * Cria uma câmera perspectiva com as dimensões da janela e adiciona à cena.
 * Utiliza THREE.PerspectiveCamera.
 * @returns {THREE.PerspectiveCamera} A câmera criada.
=======
 * Cria e configura a câmera do jogo.
 * @returns {THREE.PerspectiveCamera} A câmera configurada.
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
 * Adiciona listeners para eventos de teclado e resize da janela.
 * Responsável pelo controle de movimento e ajuste da câmera.
 * @returns {void}
=======
 * Configura os eventos de teclado e janela.
>>>>>>> Stashed changes
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
        crosshair.style.display = 'none'; 
        document.body.appendChild(crosshair);
    } else {
        crosshair.style.display = 'none';
    }
}

/**
<<<<<<< Updated upstream
 * Cria e adiciona uma "arma" (cilindro) ao objeto de controle do jogador.
 * @returns {void}
=======
 * Cria o modelo 3D da arma do jogador.
>>>>>>> Stashed changes
 */
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

/**
<<<<<<< Updated upstream
 * Configura os controles de primeira pessoa usando PointerLockControls.
 * Adiciona listeners para travar/destravar o mouse e manipula a exibição dos elementos de UI.
 * @returns {void}
=======
 * Configura os controles de bloqueio do ponteiro e eventos relacionados.
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
 * @param {THREE.Scene} scene - A cena a ser iluminada.
=======
 * @param {THREE.Scene} scene - A cena onde a luz será adicionada.
>>>>>>> Stashed changes
 */
function initDefaultBasicLight(scene) {
    const light = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(light);
}

/**
<<<<<<< Updated upstream
 * Atualiza variáveis de movimento com base nas teclas pressionadas/soltas.
 * @param {string} key - Código da tecla pressionada.
 * @param {boolean} value - true se pressionada, false se solta.
 * @returns {void}
=======
 * Atualiza os estados de movimento com base nas teclas pressionadas.
 * @param {string} key - Código da tecla pressionada.
 * @param {boolean} value - Se a tecla foi pressionada (true) ou soltada (false).
>>>>>>> Stashed changes
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
export function moveAnimate(delta) {
<<<<<<< Updated upstream
    const prevPosition = controls.getObject().position.clone();

    if (moveForward) controls.moveForward(speed * delta);
    if (moveBackward) controls.moveForward(-speed * delta);
    if (moveRight) controls.moveRight(speed * delta);
    if (moveLeft) controls.moveRight(-speed * delta);

    // --- MOVIMENTO VERTICAL COM CHECAGEM DE CHÃO ---
    const alturaPlayer = 2;
    if (moveUp) controls.getObject().position.y += speed * delta;
    if (moveDown) {
        // Raycast para baixo para checar se há chão OU rampa logo abaixo
=======
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
>>>>>>> Stashed changes
        const downRay = new THREE.Raycaster(
            controls.getObject().position.clone(),
            new THREE.Vector3(0, -1, 0),
            0,
            0.2 // distância pequena para detectar superfície logo abaixo
        );
        // Pegue todos os objetos colidíveis que podem ser chão/topo de área ou rampas
        const groundCandidates = scene.children.filter(
            obj =>
                (obj.userData && obj.userData.isCollidable) ||
                (obj.name && obj.name.startsWith('ramp'))
        );
        const intersects = downRay.intersectObjects(groundCandidates, false);
        if (intersects.length === 0) {
            // Só desce se não houver chão nem rampa logo abaixo
            controls.getObject().position.y -= speed * delta;
        }
        // Se houver chão ou rampa logo abaixo, não desce!
    }

    // --- COLISÃO HORIZONTAL ---
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        controls.getObject().position.clone(),
        new THREE.Vector3(0.3, alturaPlayer, 0.3)
    );

//Caixa de colisão do jogador
//   if (!window.playerHelper) {
//       window.playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
//        scene.add(window.playerHelper);
//    }
//    window.playerHelper.box.copy(playerBox);

    const collidables = scene.children.filter(
        obj => obj.userData && obj.userData.isCollidable && obj.name !== "camera" && !(obj.name && obj.name.startsWith('ramp'))
    );
    for (const obj of collidables) {
        if (obj.userData.collisionBox && playerBox.intersectsBox(obj.userData.collisionBox)) {
            controls.getObject().position.copy(prevPosition);
            return;
        }
    }

<<<<<<< Updated upstream
    // --- AJUSTE DE ALTURA PARA GRUDAR NO CHÃO/RAMPA ---
    const direction = new THREE.Vector3();
    controls.getDirection(direction);
    direction.y = 0;
    direction.normalize();
=======
    // Sistema de ajuste de altura para superfícies
    const dir = new THREE.Vector3();
    controls.getDirection(dir);
    dir.y = 0;
    dir.normalize();
>>>>>>> Stashed changes

    // Ray para o chão (origem: centro do player)
    const downRayChao = new THREE.Raycaster(
        controls.getObject().position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        alturaPlayer * 2
    );
<<<<<<< Updated upstream
    const groundMeshes = scene.children.filter(obj => obj.name === 'ground');
    const chaoIntersects = downRayChao.intersectObjects(groundMeshes, false);

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
=======
    
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
>>>>>>> Stashed changes

    let surfaceY = null;
    if (rampaIntersects.length > 0) {
        surfaceY = rampaIntersects[0].point.y;
    } else if (chaoIntersects.length > 0) {
        surfaceY = chaoIntersects[0].point.y;
    }

    if (surfaceY !== null) {
        const playerFeet = controls.getObject().position.y - (alturaPlayer / 2);
        const diff = surfaceY - playerFeet;

<<<<<<< Updated upstream
        // Detecta se estava na rampa e agora está no topo (transição)
        if (
            window.wasOnRampa && rampaIntersects.length === 0 && chaoIntersects.length > 0 &&
            diff > -0.5 && diff < 0.5
        ) {
            // Aplica um pequeno salto ao chegar no topo da rampa
            controls.getObject().position.y += 0.2; 
        }

        // Ajuste normal de altura
        if (diff > -0.5 && diff < 0.5) {
            controls.getObject().position.y = surfaceY + (alturaPlayer / 1.7);
            console.log("Ajuste de altura aplicado:", controls.getObject().position.y);
        }
        if (diff < -0.5) {
            controls.getObject().position.y = surfaceY + (alturaPlayer / 1.7);
            console.log("Ajuste de altura aplicado:", controls.getObject().position.y);
=======
        // Ajusta altura do jogador se estiver próximo à superfície
        if (diff > -0.5 && diff < 1.5) {
            playerObj.position.y = surfaceY + (alturaPlayer / 1.7);
>>>>>>> Stashed changes
        }
    }

    // Salva se estava na rampa para o próximo frame
    window.wasOnRampa = rampaIntersects.length > 0;
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
    moveAnimate(delta);
    updateProjectiles(delta);
    spotLightHelper?.update();
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

// Inicia o jogo
main();
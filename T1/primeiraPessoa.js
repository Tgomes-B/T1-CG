/**
 * Configuração principal do jogo em primeira pessoa.
 * @module primeiraPessoa
 */
import { adicionarInimigoCena } from './inimigo.js';
import { fadeOut } from './tiro.js';
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

    
const enemyProjectiles = [];
let currentWeaponIndex = 0;
const gravity = 9.8; 
let velocityY = 0;   
const speed = 20;
const ENEMY_SPEED = 5;
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
 * caminho antigo: images/sprites/cacodemon.glb
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
        const maxStep = 5;
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

    // Atualiza animações dos inimigos e lógica de IA
    scene.traverse(obj => {
        if (obj.userData && obj.userData.isEnemy) {
            const boxSize = 7.57;
            const playerPos = controls.getObject().position;
            const enemyPos = obj.position;
            const dist = playerPos.distanceTo(enemyPos);
    
            // Atualiza collisionBox do inimigo
            if (obj.userData.collisionBox) {
                const boxCenter = obj.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2));
                obj.userData.collisionBox.min.copy(min);
                obj.userData.collisionBox.max.copy(max);
    
                if (obj.userData.boxHelper) {
                    obj.userData.boxHelper.box.copy(obj.userData.collisionBox);
                    obj.userData.boxHelper.updateMatrixWorld(true);
                }
            }
    
            // Detecta altura do solo logo abaixo do inimigo
            const collidables = scene.children.filter(o =>
                o !== obj && o.userData && o.userData.isCollidable && o.userData.collisionBox
            );
            let groundY = obj.position.y - boxSize / 2;
            collidables.forEach(o => {
                if (o.userData.collisionBox.containsPoint(new THREE.Vector3(obj.position.x, groundY, obj.position.z))) {
                    groundY = o.userData.collisionBox.max.y;
                }
            });
            const baseY = 8;
    
            // Troca de estado: idle -> perseguir
            if (obj.userData.state === "idle" && dist < obj.userData.detectionRadius) {
                obj.userData.state = "perseguir";
            }
    
            // Troca de estado: perseguir -> idle (desistir)
            if (obj.userData.state === "perseguir" && dist > obj.userData.detectionRadius + 10) {
                obj.userData.state = "idle";
            }
    
            // Idle: volta suavemente para a altura base e flutua
            if (obj.userData.state === "idle") {
                const targetY = baseY + Math.sin(performance.now() * 0.001) * 2;
                // Só sobe até a altura base, nunca mais alto
                if (obj.position.y < targetY) {
                    obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.05);
                } else if (obj.position.y > targetY + 0.1) {
                    obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.05);
                }
            }
    
            // Perseguir: vai atrás do player, descendo até o solo se necessário
            if (obj.userData.state === "perseguir") {
                // Movimento horizontal em direção ao player
                const dir = new THREE.Vector3().subVectors(playerPos, enemyPos);
                dir.y = 0; // só move horizontalmente
                const distance = dir.length();
                if (distance > 1) {
                    dir.normalize();
                    // Testa colisão à frente
                    const nextPos = obj.position.clone().add(dir.clone().multiplyScalar(ENEMY_SPEED * delta));
                    const enemyBox = new THREE.Box3(
                        nextPos.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2)),
                        nextPos.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2))
                    );
                    const collided = collidables.some(o => o.userData.collisionBox.intersectsBox(enemyBox));
                    if (!collided) {
                        obj.position.copy(nextPos);
                    }else {
                        // Só tenta subir se está abaixo da altura base
                        if (obj.position.y < baseY - 0.05) {
                            let stepped = false;
                            const maxStep = Math.min(2, baseY - obj.position.y); // sobe no máximo 2 unidades, nunca acima do baseY
                            const stepIncrement = 0.1;
                            for (let step = stepIncrement; step <= maxStep; step += stepIncrement) {
                                const tryPos = nextPos.clone();
                                tryPos.y = obj.position.y + step;
                                // Nunca sobe acima do baseY
                                if (tryPos.y > baseY) break;
                                const enemyBoxStep = new THREE.Box3(
                                    tryPos.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2)),
                                    tryPos.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2))
                                );
                                let collidedStep = collidables.some(o => o.userData.collisionBox.intersectsBox(enemyBoxStep));
                                if (!collidedStep) {
                                    obj.position.copy(tryPos);
                                    stepped = true;
                                    break;
                                }
                            }
                            // Se não conseguiu subir, não move
                        }
                    }
                }
                // Desce suavemente até o solo se estiver acima
                if (obj.position.y > baseY + 0.05) {
                    obj.position.y = THREE.MathUtils.lerp(obj.position.y, baseY, 0.05);
                }
                // Rotaciona para olhar para o player (apenas no eixo Y)
                const angle = Math.atan2(playerPos.x - enemyPos.x, playerPos.z - enemyPos.z);
                obj.rotation.y = angle;
            
                // Atira se cooldown zerou
                obj.userData.shootCooldown -= delta;
                if (obj.userData.shootCooldown <= 0) {
                    console.log(obj.userData.state, distance, obj.userData.shootCooldown);
                    enemyShoot(obj, playerPos);
                    obj.userData.shootCooldown = 3; // 1 segundo entre tiros
                }
            }
            if (obj.userData.hp !== undefined && obj.userData.hp <= 0 && !obj.userData.fading) {
                obj.userData.fading = true;
            
                // Sobe até o objeto raiz do inimigo
                let root = obj;
                while (root.parent && !root.parent.isScene) {
                    root = root.parent;
                }
            
                fadeOut(root, 250, () => {
                    console.log("Removendo inimigo da cena!", root); // Agora mostra o grupo inteiro
                    scene.remove(root);
                    if (root.userData.boxHelper) scene.remove(root.userData.boxHelper);
                });
            }
        }
    });


// ATUALIZAÇÃO DOS PROJÉTEIS DO INIMIGO
for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const proj = enemyProjectiles[i];
    proj.position.add(proj.userData.velocity.clone().multiplyScalar(delta));

    // Checa colisão com player
    if (proj.position.distanceTo(controls.getObject().position) < 1) {
        fadeOut(proj, 250, () => {
            scene.remove(proj);
        });
        enemyProjectiles.splice(i, 1);
        continue;
    }

    // Checa colisão com obstáculos colidíveis
    const collidables = scene.children.filter(obj =>
        obj.userData &&
        obj.userData.isCollidable &&
        obj.userData.collisionBox &&
        obj !== proj.userData.shooter // IGNORA O INIMIGO QUE DISPAROU
    );
    const projBox = new THREE.Box3().setFromCenterAndSize(
        proj.position.clone(),
        new THREE.Vector3(0.4, 0.4, 0.4) // tamanho da bola de fogo
    );
    const hitObstacle = collidables.some(obj =>
        obj.userData.collisionBox && projBox.intersectsBox(obj.userData.collisionBox)
    );
    if (hitObstacle) {
        fadeOut(proj, 100, () => {
            scene.remove(proj);
        });
        enemyProjectiles.splice(i, 1);
        continue;
    }

    // Remove após 3 segundos
    if (performance.now() - proj.userData.startTime > 3000) {
        fadeOut(proj, 250, () => {
            scene.remove(proj);
        });
        enemyProjectiles.splice(i, 1);
    }
}

    if (controls.isLocked) {
        moveAnimate(delta);
        updateProjectiles(delta);
    }
    if (spotLightHelper) spotLightHelper.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function enemyShoot(enemyObj, targetPos) {
    const fireballSpeed = 20; // velocidade moderada
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff6600, 
        emissive: 0xff2200, 
        shininess: 100 
    });
    const fireball = new THREE.Mesh(geometry, material);

    // Começa um pouco à frente do inimigo (evita nascer dentro do modelo)
    const dir = new THREE.Vector3().subVectors(targetPos, enemyObj.position).normalize();
    fireball.position.copy(enemyObj.position).add(dir.clone().multiplyScalar(4)); // 4 unidades à frente

    // Define velocidade
    fireball.userData.velocity = dir.multiplyScalar(fireballSpeed*2); // ajustado para delta
    fireball.userData.startTime = performance.now();
    fireball.userData.shooter = enemyObj; // <-- Adicione esta linha

    // Garante visibilidade
    fireball.visible = true;
    fireball.material.opacity = 1;
    fireball.material.transparent = false;

    // Adiciona à cena e à lista de projéteis do inimigo
    scene.add(fireball);
    enemyProjectiles.push(fireball);
}

/**
 * Função principal que inicia o jogo.
 */
function main() {
    init();
    render();
}

main();
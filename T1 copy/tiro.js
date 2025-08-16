import * as THREE from 'three';
import { isPaused } from './primeiraPessoa.js';
import { getPredioColidersFromScene } from './area4.js';
import { jogoFinalizado } from './primeiraPessoa.js';

let camera, scene, controls;
const projectileSpeed = 100;
const projectiles = [];
const chaingunSound = new Audio('../0_assetsT3/sounds/chaingunFiring.wav');
chaingunSound.volume = 0.2;
const launcherSound = new Audio('../0_assetsT3/sounds/rocketFiring.wav');
launcherSound.volume = 0.3;
let areas = [];
const ballGeometry = new THREE.SphereGeometry(0.1, 16, 16);

let lastShotTime = 0;
let isMousePressed = false
let shootingInterval = null; 
let getCurrentWeapon = () => WEAPONS.launcher; // Defina isso para acessar o estado global
let chaingunAnimInterval = null;

/**
 * Configura o evento de disparo com o mouse.
 * Dispara projétil da ponta da arma (objeto "gun") na direção correta.
 * Também inicia/paralisa a animação da chaingun.
 * @returns {void}
 */
export function setupShooting(_camera, _scene, _controls, _getCurrentWeapon,_areas) {
    camera = _camera;
    scene = _scene;
    controls = _controls;
    getCurrentWeapon = _getCurrentWeapon;
    areas = _areas;
    if (getCurrentWeapon().name === "chaingun") stopChaingunAnimation();
    document.addEventListener('mousedown', (event) => {
        if (isPaused || !controls.isLocked) return;
        if (event.button !== 0 && event.button !== 2) return;
        isMousePressed = true;
        shootProjectile();
        shootingInterval = setInterval(() => {
            if (isMousePressed) shootProjectile();
        }, getCurrentWeapon().fireRate);
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button !== 0 && event.button !== 2) return;
        isMousePressed = false;
        clearInterval(shootingInterval);
        if (getCurrentWeapon().name === "chaingun") stopChaingunAnimation()
    });
}

/**
 * Dispara um projétil ou executa o tiro da chaingun.
 * Para o lançador, cria um projétil visível.
 * Para a chaingun, faz raycast e aplica dano sem criar projétil.
 * Também controla a animação do sprite da chaingun.
 */
function shootProjectile() {
    if (jogoFinalizado) return;
    const weapon = getCurrentWeapon();
    const currentTime = performance.now();
    if (currentTime - lastShotTime < weapon.fireRate) return;
    lastShotTime = currentTime;

    if (weapon.name === "launcher") {
        launcherSound.currentTime = 0;
        launcherSound.play();
        animateLauncherSprite();
        // Cria o projétil
        const gun = controls.getObject().getObjectByName("launcher");
        if (!gun) {
            console.warn("Arma não encontrada!");
            return;
        }
        const projectile = new THREE.Mesh(
            ballGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                visible: true,
                transparent: true,
                opacity: 1,
            })
        );

        // Posição inicial: centro da câmera (crosshair)
        projectile.position.copy(camera.getWorldPosition(new THREE.Vector3()));

        // Direção: para onde a câmera está olhando (crosshair)
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);

        // Define a velocidade do projétil
        projectile.userData.velocity = dir.multiplyScalar(projectileSpeed);

        // Adiciona à cena e armazena
        scene.add(projectile);
        projectiles.push(projectile);
    } else if (weapon.name === "chaingun") {
        chaingunSound.currentTime = 0;
        chaingunSound.play();
        animateChaingunSprite();
        // Raycast para detectar inimigo
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const raycaster = new THREE.Raycaster(camera.getWorldPosition(new THREE.Vector3()), dir, 0, 200);
        let enemies = [];
        scene.traverse(obj => {
            if (obj.userData?.isEnemy) enemies.push(obj);
        });
        const hits = raycaster.intersectObjects(enemies, true);
        if (hits.length > 0) {
            let enemy = hits[0].object;
            let enemyRoot = enemy.userData.enemyRoot || enemy;
            while (enemyRoot.parent && !enemyRoot.userData.isEnemy) {
                enemyRoot = enemyRoot.parent;
            }
            if (enemyRoot.userData.hp === undefined) enemyRoot.userData.hp = 50;
            enemyRoot.userData.hp -= 1;
            console.log(`Inimigo atingido! HP restante: ${enemyRoot.userData.hp}`);
            
            // Atualiza a healthbar
            if (enemyRoot.userData.healthBar) {
                enemyRoot.userData.healthBar.update(enemyRoot.userData.hp);
            }
            
            if (enemyRoot.userData.hp <= 0) {
                fadeOut(enemyRoot, 250, () => {
                    // Remove a healthbar se existir
                    if (enemyRoot.userData.healthBar) {
                        enemyRoot.userData.healthBar.remove();
                        enemyRoot.userData.healthBar = null;
                    }
                    
                    if (enemyRoot.userData.eliminate) {
                        enemyRoot.userData.eliminate();
                    } else {
                        if (enemyRoot.parent) enemyRoot.parent.remove(enemyRoot);
                        if (enemyRoot.userData.boxHelper && enemyRoot.userData.boxHelper.parent) {
                            enemyRoot.userData.boxHelper.parent.remove(enemyRoot.userData.boxHelper);
                        }
                    }
                    console.log("Inimigo eliminado!");
                });
            }
        }
        return; // Não cria projétil!
    }
}

/**
 * Atualiza a posição de todos os projéteis ativos na cena.
 * Deve ser chamada a cada frame.
 * Remove projéteis que colidem ou atingem distância máxima.
 * @param {number} delta - Intervalo de tempo desde o último frame.
 */
export function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        const velocity = projectile.userData.velocity;

        // Raycaster para detectar colisão no caminho do projétil
        const raycaster = new THREE.Raycaster(
            projectile.position,
            velocity.clone().normalize(),
            0,
            velocity.length() * delta 
        );

        let collidables = [];
        const predioObjs = scene.children.filter(obj => obj.name && obj.name.startsWith('predio_'));
        collidables.push(...predioObjs);

        // 1. Adiciona filhos das áreas (como antes)
        areas.forEach(area => {
            area.traverse(obj => {
                if (obj.userData?.isCollidable || obj.userData?.isEnemy) collidables.push(obj);
            });
        });

        // 2. Adiciona objetos colidíveis diretamente na cena (paredes, chão, etc.)
        scene.traverse(obj => {
            if (obj.userData?.isCollidable && !collidables.includes(obj)) collidables.push(obj);
        });
        const intersects = raycaster.intersectObjects(collidables, true);

        // Checa distância máxima
        if (!projectile.userData.startPos) {
            projectile.userData.startPos = projectile.position.clone();
        }
        const distance = projectile.position.distanceTo(projectile.userData.startPos);

        // Condição para fade-out (colisão ou distância máxima)
        if ((intersects.length > 0 || distance > 750) && !projectile.userData.fading) {
            projectile.userData.fading = true;
        
            if (intersects.length > 0) {
                const hitObject = intersects[0].object;
        
                // Aplica dano se o objeto for um inimigo
                let enemyRoot = hitObject.userData.enemyRoot || hitObject;
                while (enemyRoot.parent && !enemyRoot.userData.isEnemy) {
                    enemyRoot = enemyRoot.parent;
                }
                if (enemyRoot.userData?.isEnemy) {
                    if (enemyRoot.userData.hp === undefined) {
                        enemyRoot.userData.hp = 50;
                        enemyRoot.userData.maxHp = 50;
                    }
                    enemyRoot.userData.hp -= 10;
                    if (enemyRoot.userData.hp < 0) enemyRoot.userData.hp = 0; 
                    console.log(`Inimigo atingido! HP restante: ${enemyRoot.userData.hp}`);
                    
                    // Atualiza a healthbar
                    if (enemyRoot.userData.healthBar) {
                        enemyRoot.userData.healthBar.update(enemyRoot.userData.hp);
                    }
                    
                    if (enemyRoot.userData.hp <= 0) {
                        fadeOut(enemyRoot, 250, () => {
                            // Remove a healthbar se existir
                            if (enemyRoot.userData.healthBar) {
                                enemyRoot.userData.healthBar.remove();
                                enemyRoot.userData.healthBar = null;
                            }
                            
                            if (enemyRoot.userData.eliminate) {
                                enemyRoot.userData.eliminate();
                            } else {
                                if (enemyRoot.parent) enemyRoot.parent.remove(enemyRoot);
                                if (enemyRoot.userData.boxHelper && enemyRoot.userData.boxHelper.parent) {
                                    enemyRoot.userData.boxHelper.parent.remove(enemyRoot.userData.boxHelper);
                                }
                            }
                            console.log("Inimigo eliminado!");
                        });
                    }
                }
            }
        
            // Remove o projétil do array ANTES do fade para não atualizar mais
            const idx = projectiles.indexOf(projectile);
            if (idx !== -1) projectiles.splice(idx, 1);
        
            // Remove o projétil com fade-out
            fadeOut(projectile, 250, () => {
                if (scene.children.includes(projectile)) scene.remove(projectile);
            });
            continue;
        }

        // Se não colidiu, move normalmente
        projectile.position.addScaledVector(velocity, delta);
    }
}

/**
 * Aplica um efeito de fade-out no objeto.
 * @param {THREE.Object3D} object - O objeto a ser desvanecido.
 * @param {number} duration - Duração do fade-out em milissegundos.
 * @param {function} onComplete - Função a ser chamada após o fade-out.
 */
export function fadeOut(object, duration, onComplete) {
    // Aplica fade em todos os meshes filhos se for um grupo
    let faded = false;
    object.traverse(child => {
        if (child.material && 'opacity' in child.material) {
            child.material.transparent = true;
            const start = performance.now();
            const initialOpacity = child.material.opacity !== undefined ? child.material.opacity : 1;
            function animate() {
                const now = performance.now();
                const elapsed = now - start;
                const t = Math.min(elapsed / duration, 1);
                child.material.opacity = initialOpacity * (1 - t);
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else if (!faded) {
                    faded = true;
                    if (onComplete) onComplete();
                }
            }
            animate();
        }
    });
}

/**
 * Inicia a animação do sprite da chaingun, alternando os frames do spritesheet.
 * Só anima se não estiver já animando.
 */
function animateChaingunSprite() {
    const weapon = getCurrentWeapon();
    const frames = weapon.frames;
    if (!weapon.sprite || !weapon.spriteTexture) return;
    if (chaingunAnimInterval) return; // já animando

    chaingunAnimInterval = setInterval(() => {
        weapon.currentFrame = (weapon.currentFrame + 1) % frames;
        weapon.spriteTexture.offset.x = weapon.currentFrame / frames;
        weapon.spriteTexture.needsUpdate = true;
    }, weapon.fireRate);
}
let launcherAnimInterval = null;

function animateLauncherSprite() {
    const weapon = getCurrentWeapon();
    const frames = weapon.frames;
    if (!weapon.sprite || !weapon.spriteTexture) return;

    if (launcherAnimInterval) return;

    let frame = 0;
    const normalDelay = 50; // ms entre frames normais
    const extraDelay = 180; // ms extra entre os dois últimos frames

    function nextFrame() {
        weapon.spriteTexture.offset.x = frame / frames;
        weapon.spriteTexture.needsUpdate = true;
        frame++;
        if (frame < frames) {
            // Se está indo do penúltimo para o último frame, use o delay extra
            const delay = (frame === frames - 1) ? extraDelay : normalDelay;
            launcherAnimInterval = setTimeout(nextFrame, delay);
        } else {
            launcherAnimInterval = null;
            weapon.spriteTexture.offset.x = 0; // Volta para o primeiro frame
            weapon.spriteTexture.needsUpdate = true;
        }
    }
    nextFrame();
}

/**
 * Para a animação do sprite da chaingun e retorna ao frame inicial.
 */
function stopChaingunAnimation() {
    const weapon = getCurrentWeapon();
    if (chaingunAnimInterval) clearInterval(chaingunAnimInterval);
    chaingunAnimInterval = null;
    if (weapon.spriteTexture) {
        weapon.spriteTexture.offset.x = 0; // volta para o frame inicial
        weapon.spriteTexture.needsUpdate = true;
    }
}
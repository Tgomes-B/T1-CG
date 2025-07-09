import * as THREE from 'three';

let camera, scene, controls;
const projectileSpeed = 100;
const projectiles = [];
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
export function setupShooting(_camera, _scene, _controls, _getCurrentWeapon) {
    camera = _camera;
    scene = _scene;
    controls = _controls;
    getCurrentWeapon = _getCurrentWeapon;
    if (getCurrentWeapon().name === "chaingun") stopChaingunAnimation();
    document.addEventListener('mousedown', (event) => {
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
    const weapon = getCurrentWeapon();
    const currentTime = performance.now();
    if (currentTime - lastShotTime < weapon.fireRate) return;
    lastShotTime = currentTime;

    if (weapon.name === "launcher") {
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
        projectile.userData.velocity = dir.multiplyScalar(projectileSpeed * 0.016); // Ajuste para delta time

        // Adiciona à cena e armazena
        scene.add(projectile);
        projectiles.push(projectile);
    } else if (weapon.name === "chaingun") {
        animateChaingunSprite();
        // Raycast para detectar inimigo
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const raycaster = new THREE.Raycaster(camera.getWorldPosition(new THREE.Vector3()), dir, 0, 200);
        const enemies = scene.children.filter(obj => obj.userData?.isEnemy);
        const hits = raycaster.intersectObjects(enemies, true);
        if (hits.length > 0) {
            const enemy = hits[0].object;
            if (enemy.userData.hp === undefined) enemy.userData.hp = 50;
            enemy.userData.hp -= 2; // 2 HP por segundo
            console.log(`Inimigo atingido! HP restante: ${enemy.userData.hp}`);
            if (enemyRoot.userData.hp <= 0) {
                enemyRoot.userData.hp = 0;
                fadeOut(enemyRoot, 250, () => {
                    // Remove todas as meshes filhas do inimigo da cena
                    enemyRoot.traverse(child => {
                        if (child.isMesh) {
                            scene.remove(child);
                        }
                    });
                    scene.remove(enemyRoot);
                    if (enemyRoot.userData.boxHelper) scene.remove(enemyRoot.userData.boxHelper);
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
            velocity.length()
        );

        // Filtra inimigos e objetos colidíveis
        const collidables = scene.children.filter(obj => obj.userData?.isCollidable || obj.userData?.isEnemy);
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
                    if (enemyRoot.userData.hp === undefined) enemyRoot.userData.hp = 50;
                    enemyRoot.userData.hp -= 10;
                    if (enemyRoot.userData.hp < 0) enemyRoot.userData.hp = 0; // <-- impede HP negativo
                    console.log(`Inimigo atingido! HP restante: ${enemyRoot.userData.hp}`);
                    if (enemyRoot.userData.hp <= 0) {
                        fadeOut(enemyRoot, 500, () => {
                            // Remove todas as meshes filhas do inimigo da cena (caso estejam na cena)
                            enemyRoot.traverse(child => {
                                if (child.isMesh && scene.children.includes(child)) {
                                    scene.remove(child);
                                }
                            });
                            // Remove o group do inimigo
                            if (scene.children.includes(enemyRoot)) {
                                scene.remove(enemyRoot);
                            }
                            // Remove o boxHelper se existir
                            if (enemyRoot.userData.boxHelper && scene.children.includes(enemyRoot.userData.boxHelper)) {
                                scene.remove(enemyRoot.userData.boxHelper);
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
        projectile.position.add(velocity);
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
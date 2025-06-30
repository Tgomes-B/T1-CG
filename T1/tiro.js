import * as THREE from 'three';

let camera, scene, controls;
const projectileSpeed = 100;
const projectiles = [];
const ballMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000,
    visible: true,
    transparent: true,
    opacity: 1,
});
const ballGeometry = new THREE.SphereGeometry(0.1, 16, 16);

let lastShotTime = 0;
let isMousePressed = false
let shootingInterval = null; 
let getCurrentWeapon = () => WEAPONS.launcher; // Defina isso para acessar o estado global
let chaingunFrame = 0;
let chaingunAnimInterval = null;

/**
 * Configura o evento de disparo com o mouse.
 * Dispara projétil da ponta da arma (objeto "gun") na direção correta.
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
    });
}

function shootProjectile() {
    const weapon = getCurrentWeapon();
    const currentTime = performance.now();
    if (currentTime - lastShotTime < weapon.fireRate) return;
    lastShotTime = currentTime;

    const gun = controls.getObject().getObjectByName("launcher");
    if (!gun) {
        console.warn("Arma não encontrada!");
        return;
    }

    if (weapon.name === "launcher") {
        // Cria o projétil
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
        const raycaster = new THREE.Raycaster(camera.getWorldPosition(new THREE.Vector3()), dir, 0, 100);
        const enemies = scene.children.filter(obj => obj.userData?.isEnemy);
        const hits = raycaster.intersectObjects(enemies, true);
        if (hits.length > 0) {
            const enemy = hits[0].object;
            if (enemy.userData.hp === undefined) enemy.userData.hp = 100;
            enemy.userData.hp -= 2 * (weapon.fireRate / 1000); // 2 HP por segundo
            if (enemy.userData.hp <= 0) {
                scene.remove(enemy);
            }
        }
        return; // Não cria projétil!
    }
}

/**
 * Atualiza a posição de todos os projéteis ativos na cena.
 * Deve ser chamada a cada frame.
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

        const collidables = scene.children.filter(obj => obj.userData?.isCollidable);
        const intersects = raycaster.intersectObjects(collidables, true);

        // Checa distância máxima
        if (!projectile.userData.startPos) {
            projectile.userData.startPos = projectile.position.clone();
        }
        const distance = projectile.position.distanceTo(projectile.userData.startPos);

        // Condição para fade-out (colisão ou distância máxima)
        if ((intersects.length > 0 || distance > 750) && !projectile.userData.fading) {
            projectile.userData.fading = true;
            // console.log(
            //     intersects.length > 0
            //         ? `Colisão detectada com: ${intersects[0].object.name || intersects[0].object.uuid}`
            //         : "Distância máxima atingida, removendo projétil"
            // );

            fadeOut(projectile, 250, () => {
                const idx = projectiles.indexOf(projectile);
                if (idx !== -1) projectiles.splice(idx, 1);
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
    if (!object.material || !object.material.transparent) {
        console.warn("O material do objeto precisa ter 'transparent: true'.");
        return;
    }

    const startOpacity = object.material.opacity;
    const fadeSpeed = startOpacity / duration;
    object.userData.velocity.set(0, 0, 0); // Para o movimento do projétil

    function animateFadeOut() {
        if (object.material.opacity > 0) {
            object.material.opacity -= fadeSpeed * 16.67; // Aproximadamente 60 FPS
            requestAnimationFrame(animateFadeOut);
        } else {
            object.material.opacity = 0;
            scene.remove(object);
            // Remove o projétil da lista
            const idx = projectiles.indexOf(object);
            if (idx !== -1) projectiles.splice(idx, 1);
            if (onComplete) onComplete();
        }
    }
    animateFadeOut();
}

function animateChaingunSprite() {
    if (!WEAPONS.chaingun.sprite) return;
    if (chaingunAnimInterval) clearInterval(chaingunAnimInterval);
    chaingunFrame = 0;
    chaingunAnimInterval = setInterval(() => {
        chaingunFrame = (chaingunFrame + 1) % WEAPONS.chaingun.spritesheet.length;
        WEAPONS.chaingun.sprite.material.map = new THREE.TextureLoader().load(
            WEAPONS.chaingun.spritesheet[chaingunFrame]
        );
        WEAPONS.chaingun.sprite.material.needsUpdate = true;
    }, 50); // 20 FPS
}
function stopChaingunAnimation() {
    if (chaingunAnimInterval) clearInterval(chaingunAnimInterval);
    chaingunFrame = 0;
    if (WEAPONS.chaingun.sprite) {
        WEAPONS.chaingun.sprite.material.map = new THREE.TextureLoader().load(
            WEAPONS.chaingun.spritesheet[0]
        );
        WEAPONS.chaingun.sprite.material.needsUpdate = true;
    }
}
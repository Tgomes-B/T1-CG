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

/**
 * Configura o evento de disparo com o mouse.
 * Dispara projétil da ponta da arma (objeto "gun") na direção correta.
 * @returns {void}
 */
export function setupShooting(_camera, _scene, _controls) {
    camera = _camera;
    scene = _scene;
    controls = _controls;
    document.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return; // Apenas o botão esquerdo
        isMousePressed = true;

        // Dispara imediatamente ao pressionar
        shootProjectile();

        // Configura disparos contínuos enquanto o botão estiver pressionado
        shootingInterval = setInterval(() => {
            if (isMousePressed) shootProjectile();
        }, 500); // Intervalo de 500ms entre disparos
    });

    // Evento para quando o botão do mouse é solto
    document.addEventListener('mouseup', (event) => {
        if (event.button !== 0) return; 
        isMousePressed = false;


        clearInterval(shootingInterval);
    });
}

function shootProjectile() {
    const currentTime = performance.now();
    if (currentTime - lastShotTime < 500) return; // Controle de taxa de disparo (500ms)
    lastShotTime = currentTime;

    const gun = controls.getObject().getObjectByName("gun");
    if (!gun) {
        console.warn("Arma não encontrada!");
        return;
    }

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
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
        if (event.button !== 0) return;
        const currentTime = performance.now();
        if (currentTime - lastShotTime < 500) return;
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
        // Define velocidade
        projectile.userData.velocity = dir.multiplyScalar(projectileSpeed);

        //Debug da direção
        //const arrowHelper = new THREE.ArrowHelper(dir, gunTip, 2, 0x00ff00);
        //scene.add(arrowHelper);

        // Adiciona à cena e armazena
        scene.add(projectile);
        projectiles.push(projectile);
    });
}

/**
 * (Alternativa) Função para disparo, não usada diretamente.
 * @param {MouseEvent} event 
 */
function onMouseDown(event) {
    if (event.button !== 0) return;
    const currentTime = performance.now();
    if (currentTime - lastShotTime < 500) return;
    lastShotTime = currentTime;

    const gun = controls.getObject().getObjectByName("gun");
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

    const gunTip = new THREE.Vector3(0, 0.5, 0);
    gun.localToWorld(gunTip);
    projectile.position.copy(gunTip);

    const dir = new THREE.Vector3(0.015, -0.5, 0);
    gun.localToWorld(dir);
    dir.sub(gunTip).normalize();

    projectile.userData.velocity = dir.multiplyScalar(projectileSpeed);

    scene.add(projectile);
    projectiles.push(projectile);
}

const MAX_DISTANCE = 100; // ajuste conforme necessário

/**
 * Atualiza a posição de todos os projéteis ativos na cena.
 * Deve ser chamada a cada frame.
 * @param {number} delta - Intervalo de tempo desde o último frame.
 */
export function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        const velocity = projectile.userData.velocity.clone().multiplyScalar(delta);

        // Raycaster para detectar colisão no caminho do projétil
        const raycaster = new THREE.Raycaster(
            projectile.position,
            velocity.clone().normalize(),
            0,
            velocity.length()
        );

        const intersects = raycaster.intersectObjects(
            scene.children.filter(obj => obj.name !== "gun" && obj !== controls.getObject()),
            true
        );

        // Checa distância máxima
        if (!projectile.userData.startPos) {
            projectile.userData.startPos = projectile.position.clone();
        }
        const distance = projectile.position.distanceTo(projectile.userData.startPos);

        if ((intersects.length > 0 || distance > 750) && !projectile.userData.fading) {
            // Marca como em fade-out para não aplicar múltiplas vezes
            projectile.userData.fading = true;
            fadeOut(projectile, 250, () => {
                // Remover do array após fade-out
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

    function animateFadeOut() {
        if (object.material.opacity > 0) {
            object.material.opacity -= fadeSpeed * 1;
            requestAnimationFrame(animateFadeOut);
        } else {
            object.material.opacity = 0;
            scene.remove(object);
            if (onComplete) onComplete();
        }
    }

    animateFadeOut();
}
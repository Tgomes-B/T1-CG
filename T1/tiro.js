import * as THREE from 'three';
import { camera, scene, controls } from './primeiraPessoa.js';

// Configurações
const projectileSpeed = 100;
const projectiles = [];
const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: true });
const ballGeometry = new THREE.SphereGeometry(0.1, 16, 16);

// Inicialização
setupShooting();

/**
 * Configura o evento de disparo com o mouse.
 * Dispara projétil da ponta da arma (objeto "gun") na direção correta.
 * @returns {void}
 */
function setupShooting() {
    document.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return; // Apenas botão esquerdo

        const gun = controls.getObject().getObjectByName("gun");
        if (!gun) {
            console.warn("Arma não encontrada!");
            return;
        }

        // Cria o projétil
        const projectile = new THREE.Mesh(ballGeometry, ballMaterial);

        // Define posição inicial: ponta do cilindro da arma
        const gunTip = new THREE.Vector3(0, 0.5, 0);
        gun.localToWorld(gunTip);
        projectile.position.copy(gunTip);

        // Calcula direção (usando eixo Z local rotacionado da arma)
        const dir = new THREE.Vector3(0.015, -0.5, 0);  // eixo Z local = frente visual
        gun.localToWorld(dir);
        dir.sub(gunTip).normalize();

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
 * Atualiza a posição de todos os projéteis ativos na cena.
 * Deve ser chamada a cada frame.
 * @param {number} delta - Intervalo de tempo desde o último frame.
 */
export function updateProjectiles(delta) {
    projectiles.forEach((projectile) => {
        projectile.position.add(projectile.userData.velocity.clone().multiplyScalar(delta));
    });
}

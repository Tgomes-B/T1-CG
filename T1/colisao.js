import * as THREE from 'three';

/**
 * Marca paredes, chão, rampas e áreas como colidíveis para uso em lógica de colisão.
 * @param {THREE.Scene} scene - A cena com os objetos.
 */
export function setupCollision(scene) {
    const collidables = scene.children.filter(obj =>
        obj instanceof THREE.Mesh && obj.userData && obj.userData.isCollidable
    );
    collidables.forEach(obj => {
        if (obj.geometry && !obj.geometry.boundingBox) {
            obj.geometry.computeBoundingBox();
        }
        obj.userData.collisionBox = new THREE.Box3().setFromObject(obj);

        // Visualize as caixas de colisão (opcional)
        // const helper = new THREE.Box3Helper(obj.userData.collisionBox, 0xff0000);
        // scene.add(helper);
    });
}
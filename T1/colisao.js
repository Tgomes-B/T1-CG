/**
 * Configura e gerencia as colisões na cena 3D.
 * @module colisao
 */

import * as THREE from 'three';

/**
 * Marca paredes, chão, rampas e áreas como colidíveis para uso em lógica de colisão.
 * @param {THREE.Scene} scene - A cena contendo os objetos que devem ser configurados para colisão.
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
    });
}
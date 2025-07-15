/**
 * Configura e gerencia as colisões na cena 3D.
 * @module colisao
 */

import * as THREE from 'three';

/**
 * Função auxiliar para percorrer recursivamente a cena e encontrar todos os objetos colidíveis
 * @param {THREE.Object3D} object - O objeto atual a ser verificado
 * @param {Array} result - Array para armazenar os objetos colidíveis encontrados
 */
function findCollidables(object, result = []) {
    // Verifica se o objeto atual é colidível
    if (object.userData && object.userData.isCollidable) {
        result.push(object);
    }
    
    // Se o objeto tiver filhos, verifica cada um deles recursivamente
    if (object.children && object.children.length > 0) {
        for (const child of object.children) {
            findCollidables(child, result);
        }
    }
    
    return result;
}

/**
 * Marca paredes, chão, rampas e áreas como colidíveis para uso em lógica de colisão.
 * @param {THREE.Scene} scene - A cena contendo os objetos que devem ser configurados para colisão.
 */
export function setupCollision(scene) {
    // Encontra todos os objetos colidíveis na cena, incluindo os que estão dentro de grupos
    const collidables = findCollidables(scene);
    
    // Configura a caixa de colisão para cada objeto colidível
    collidables.forEach(obj => {
        if (obj.geometry) {
            // Garante que a geometria tenha um bounding box calculado
            if (!obj.geometry.boundingBox) {
                obj.geometry.computeBoundingBox();
            }
            
            // Cria ou atualiza a caixa de colisão
            obj.userData.collisionBox = new THREE.Box3().setFromObject(obj);
        }
    });
    
    return collidables;
}
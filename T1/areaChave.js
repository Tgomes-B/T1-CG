import * as THREE from 'three';
import { loadEnemyOBJ } from './enemy.js';
import { CSG } from '../libs/other/CSGMesh.js';

export function criaChave(cor) {
    let keyMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    const keyMaterial = new THREE.MeshPhongMaterial({
        color: cor,
        shininess: 100,
        specular: "rgb(255, 255, 255)"
    });
    keyMesh.castShadow = true;
    keyMesh.receiveShadow = true;
    let keyCSG = CSG.fromMesh(keyMesh);

    let cylinGeometry = new THREE.CylinderGeometry(0.60, 0.60, 2, 26);
    
    let cylinGeometryY = cylinGeometry.clone();
    let cylinMeshY = new THREE.Mesh(cylinGeometryY);

    let cylinGeometryX = cylinGeometry.clone();
    cylinGeometryX.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    let cylinMeshX = new THREE.Mesh(cylinGeometryX);

    let cylinGeometryZ = cylinGeometry.clone();
    cylinGeometryZ.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    let cylinMeshZ = new THREE.Mesh(cylinGeometryZ);

    let cylinCSG = CSG.fromMesh(cylinMeshX);
    keyCSG = keyCSG.subtract(cylinCSG);

    cylinCSG = CSG.fromMesh(cylinMeshY);
    keyCSG = keyCSG.subtract(cylinCSG);

    cylinCSG = CSG.fromMesh(cylinMeshZ);
    keyCSG = keyCSG.subtract(cylinCSG);

    keyMesh = CSG.toMesh(keyCSG, new THREE.Matrix4());
    keyMesh.material = keyMaterial;
    keyMesh.castShadow = true;
    keyMesh.receiveShadow = true;

    //key.userData.isCollidable = true;
    
    // Configura colisão para a chave
    //setupCollision(keyMesh);

    return keyMesh;
}

/**
 * Gerencia a área da chave: inimigos, pilar e chave animada.
 * @param {THREE.Scene} scene - Cena principal
 * @param {THREE.Object3D} area - Área onde tudo acontece (ex: areas[0])
 */
export function setupAreaChave(scene, area, enemies) {
    let defeatedCount = 0;
    let chave = null;

    // Adicione o método de eliminação para cada inimigo já criado
    enemies.forEach(enemy => {
        enemy.userData.eliminate = () => {
            if (enemy.userData._eliminated) return;
            enemy.userData._eliminated = true;

            if (enemy.parent) enemy.parent.remove(enemy);
            if (enemy.userData.boxHelper && enemy.userData.boxHelper.parent) {
                enemy.userData.boxHelper.parent.remove(enemy.userData.boxHelper);
            }
            scene.remove(enemy);
            defeatedCount++;
            if (defeatedCount === enemies.length) {
                showPilarComChave();
            }
        };
    });

    let chaveAnimada = null;
    let baseY = 0;

    function showPilarComChave() {
        // Pilar
        let bloco = criaBlocoChave();
        area.add(bloco);

        // Chave
        chave = criaChave('red');
        chave.position.set(0, 6, 0); // Em cima do pilar (posição relativa ao pilar)
        bloco.add(chave);

        // Guarda referência para animação no render principal
        chaveAnimada = chave;
        baseY = chave.position.y;
        return bloco;
    }

    return {
        enemies,
        eliminarInimigo: (enemy) => {
            if (enemy.userData && typeof enemy.userData.eliminate === 'function') {
                enemy.userData.eliminate();
            }
        },
        getChaveAnimada: () => chaveAnimada,
        getBaseY: () => baseY
    };
}
export function criaBlocoChave(){
    const blocoGeometry = new THREE.BoxGeometry(2,4,2);
    const blocoMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(200, 200, 200)' });
    let bloco = new THREE.Mesh(blocoGeometry, blocoMaterial);
    bloco.position.set(45, 4, 0);
    bloco.castShadow = true;
    bloco.receiveShadow = true;
    bloco.userData.isCollidable = true;
    bloco.name = 'bloco';
    return bloco;
}
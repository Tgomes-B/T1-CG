import * as THREE from 'three';
import { loadEnemyOBJ } from './enemy.js';
import { CSG } from '../libs/other/CSGMesh.js';

export function criaChave(scene, areas) {
    let keyMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    const keyMaterial = new THREE.MeshPhongMaterial({
        color: 'gray',
        shininess: 100,
        specular: "rgb(255, 255, 255)"
    });
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

    keyMesh.position.set(45, 6, 0);
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
export function setupAreaChave(scene, area) {
    // 1. Cria 5 inimigos skull.obj em posições fixas ou aleatórias
    const enemyPositions = [
        { x: 65, y: 6, z: 0 },
        { x: 55, y: 6, z: 10 },
        { x: 35, y: 6, z: -10 },
        { x: 55, y: 6, z: -10 },
        { x: 35, y: 6, z: 10 }
    ];
    const enemies = [];
    let defeatedCount = 0;
    let pilar = null;
    let chave = null;

    enemyPositions.forEach((pos) => {
        loadEnemyOBJ('images/skull.obj', pos, (enemy) => {
            area.add(enemy);
            enemies.push(enemy);

            // Adicione um método para eliminar o inimigo
            enemy.userData.eliminate = () => {
                area.remove(enemy);
                defeatedCount++;
                if (defeatedCount === enemyPositions.length) {
                    showPilarComChave();
                }
            };
        });
    });
    let chaveAnimada = null;
    let baseY = 0;

    function showPilarComChave() {
        // Pilar
        const pilarGeometry = new THREE.CylinderGeometry(2, 2, 7, 32);
        const pilarMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(200, 200, 200)' });
        pilar = new THREE.Mesh(pilarGeometry, pilarMaterial);
        pilar.position.set(45, 1, 0);
        area.add(pilar);

        // Chave
        chave = criaChave(scene, [area]);
        chave.position.set(0, 6, 0); // Em cima do pilar (posição relativa ao pilar)
        pilar.add(chave);

        // Guarda referência para animação no render principal
        chaveAnimada = chave;
        baseY = chave.position.y;
    }
    showPilarComChave();
    // Retorna referência para controle externo se quiser
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
import * as THREE from 'three';
import { fadeOut } from './tiro.js';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

// Configurações do inimigo
const ENEMY_SEARCH_RAYS = 120; // 360° / 3
const ENEMY_DETECTION_RANGE = 50;
const ENEMY_SPEED = 0.05; // Aumente a velocidade

// Array de direções dos raios
export const searchDirections = [];
for(let i = 0; i < 360; i += 3) {
    const angle = THREE.MathUtils.degToRad(i);
    searchDirections.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
}

export function loadEnemyOBJ(path, position = { x: 0, y: 0, z: 0 }, onLoad) {

    const assetPath = 'images/sprites/skull/';

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(assetPath);
    mtlLoader.load('skull.mtl', (materials) => {
        materials.preload();
        const loader = new OBJLoader();
        loader.setMaterials(materials);
        loader.setPath(assetPath);
        loader.load(
            'skull.obj',
            (obj) => {
                obj.position.set(position.x, position.y, position.z);
                obj.scale.set(1, 1, 1);
                obj.name = "enemy";
                obj.userData.isEnemy = true;
                obj.userData.hp = 20;
                obj.userData.maxHp = 50;
                obj.userData.enemyType = "obj";
                obj.userData.fading = false;
                obj.userData.isCollidable = true;

                // Cria uma collisionBox válida baseada no centro e tamanho padrão
                const boxSize = 7.57;
                const boxHeight = 10;
                const boxCenter = obj.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
                obj.userData.collisionBox = new THREE.Box3(min, max);

                obj.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isEnemy = true;
                        child.userData.hp = obj.userData.hp;
                        child.userData.enemyRoot = obj;
                    }
                });

                obj.updateMatrixWorld(true);

                // Helper visual (opcional)
                const boxHelper = new THREE.BoxHelper(obj, 0x00ff00);
                obj.userData.boxHelper = boxHelper;
                setTimeout(() => {
                    if (obj.parent) obj.parent.add(boxHelper);
                }, 0);

                // Opcional: veja o centro do modelo
                // obj.add(new THREE.AxesHelper(5));

                if (onLoad) onLoad(obj);
            },
            undefined,
            (error) => {
                console.error('Erro ao carregar modelo OBJ:', error);
            }
        );
    });
}

export function createEnemy(position = { x: 0, y: 2, z: 0 }) {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    enemy.position.set(position.x, position.y, position.z);
    enemy.name = "enemy";
    enemy.userData.isEnemy = true;

    const boxSize = 7.57;
    const boxHeight = 10;
    const boxCenter = enemy.position.clone();
    const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
    const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
    enemy.userData.collisionBox = new THREE.Box3(min, max);

    // Se quiser o helper visual:
    // const boxHelper = new THREE.BoxHelper(enemy, 0x00ff00);
    // enemy.userData.boxHelper = boxHelper;
    // (adicione boxHelper na cena depois de adicionar o enemy)

    return enemy;
}

/**
 * Atualiza o comportamento do inimigo
 */
export function updateEnemyBehavior(enemy, player, scene, delta) {
    // 1. Checa distância ao player
    const dist = enemy.position.distanceTo(player.position);
    const detectionRadius = 40; // ajuste conforme necessário

    if (dist < detectionRadius) {
        // 2. Move em direção ao player
        const moveDirection = new THREE.Vector3()
            .subVectors(player.position, enemy.position)
            .setY(0)
            .normalize();

        enemy.position.x += moveDirection.x * ENEMY_SPEED * delta * 60;
        enemy.position.z += moveDirection.z * ENEMY_SPEED * delta * 60;

        // 3. Olha para o player
        enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
    }

    // 4. Atualiza boxHelper se existir
    if (enemy.userData.boxHelper) {
        enemy.userData.boxHelper.update();
    }

    // 5. Fade out se morrer
    if (enemy.userData.hp !== undefined && enemy.userData.hp <= 0 && !enemy.userData.fading) {
        enemy.userData.fading = true;
        fadeOut(enemy, 500, () => {
            if (enemy.parent) enemy.parent.remove(enemy);
            if (enemy.userData.boxHelper && enemy.userData.boxHelper.parent) {
                enemy.userData.boxHelper.parent.remove(enemy.userData.boxHelper);
            }
        });
    }
}
/**
 * Atualiza todos os inimigos OBJ na cena usando a heurística do enemy.js
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} player - geralmente controls.getObject()
 * @param {number} delta
 */
export function updateEnemiesOBJ(scene, player, delta) {
    scene.traverse(obj => {
        if (
            obj.userData &&
            obj.userData.isEnemy &&
            obj.userData.enemyType === "obj" // Só OBJ!
        ) {
            updateEnemyBehavior(obj, player, scene, delta);
        }
    });
}
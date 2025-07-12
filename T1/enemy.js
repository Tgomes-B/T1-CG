
import * as THREE from 'three';
import { fadeOut } from './tiro.js';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

// Configurações do inimigo
const ENEMY_SEARCH_RAYS = 120; // 360° / 3
const ENEMY_DETECTION_RANGE = 50;
const ENEMY_SPEED = 0.2; // Aumente a velocidade

// Array de direções dos raios
export const searchDirections = [];
for(let i = 0; i < 360; i += 3) {
    const angle = THREE.MathUtils.degToRad(i);
    searchDirections.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
}

export function loadEnemyOBJ(path, position = { x: 20, y: 0, z: 10 }, onLoad) {

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
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                obj.updateMatrixWorld(true);

                // Helper visual (opcional)
                const boxHelper = new THREE.Box3Helper(obj.userData.collisionBox, 0x8000ff);
                obj.userData.boxHelper = boxHelper;

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

export function updateEnemyBehavior(enemy, player, scene, delta) {
    const dist = enemy.position.distanceTo(player.position);
    const detectionRadius = 40;

    // Limites da área 1 (ajuste minY/maxY conforme necessário)
    const minX = -15, maxX = 105, minZ = -60, maxZ = 60, minY = 0, maxY = 10;

    if (dist >= detectionRadius) {
        // Se chegou no alvo ou não tem alvo, sorteia novo alvo dentro da área (incluindo Y)
        if (
            !enemy.userData.idleTarget ||
            enemy.position.distanceTo(enemy.userData.idleTarget) < 1 ||
            enemy.userData.idleTarget.x < minX || enemy.userData.idleTarget.x > maxX ||
            enemy.userData.idleTarget.z < minZ || enemy.userData.idleTarget.z > maxZ ||
            enemy.userData.idleTarget.y < minY || enemy.userData.idleTarget.y > maxY
        ) {
            enemy.userData.idleTarget = new THREE.Vector3(
                Math.random() * (maxX - minX) + minX,
                Math.random() * (maxY - minY) + minY,
                Math.random() * (maxZ - minZ) + minZ
            );
        }
        // Move em direção ao alvo idle, limitado dentro da área (incluindo Y)
        const dir = new THREE.Vector3().subVectors(enemy.userData.idleTarget, enemy.position);
        if (dir.length() > 0.1) {
            dir.normalize();
            enemy.position.add(dir.multiplyScalar(ENEMY_SPEED * delta * 30));
            // Limita dentro da área
            enemy.position.x = Math.max(minX, Math.min(maxX, enemy.position.x));
            enemy.position.y = Math.max(minY, Math.min(maxY, enemy.position.y));
            enemy.position.z = Math.max(minZ, Math.min(maxZ, enemy.position.z));
            // Olha para onde está indo
            enemy.traverse(child => {
                if (child.isMesh) {
                    child.lookAt(
                        enemy.userData.idleTarget.x,
                        enemy.userData.idleTarget.y,
                        enemy.userData.idleTarget.z
                    );
                    // Ajuste a rotação do modelo se necessário (exemplo: gira 90 graus no eixo Y)
                    child.rotateY(Math.PI / 2); // ajuste o valor conforme necessário para seu modelo
                }
            });
        }
    } else {
        // Persegue player normalmente (incluindo Y)
        const moveDirection = new THREE.Vector3()
            .subVectors(player.position, enemy.position)
            .normalize();
        enemy.position.x += moveDirection.x * ENEMY_SPEED * delta * 60;
        enemy.position.y += moveDirection.y * ENEMY_SPEED * delta * 60;
        enemy.position.z += moveDirection.z * ENEMY_SPEED * delta * 60;
        enemy.lookAt(player.position.x, player.position.y, player.position.z);
    }

    if (enemy.userData.collisionBox) {
        const boxSize = 7.57;
        const boxHeight = 10;
        const boxCenter = enemy.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
        enemy.userData.collisionBox.min.copy(min);
        enemy.userData.collisionBox.max.copy(max);
    }
    if (enemy.userData.boxHelper) {
        enemy.userData.boxHelper.updateMatrixWorld(true);
    }

    if (enemy.userData.hp !== undefined && enemy.userData.hp <= 0 && !enemy.userData.fading) {
        enemy.userData.fading = true;
        fadeOut(enemy, 1000, () => {
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
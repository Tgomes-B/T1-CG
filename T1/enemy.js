
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
                const boxSize = 5;
                const boxHeight = 7;
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

    const boxSize = 5.0;
    const boxHeight = 7.0;
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

function willCollide(enemy, nextPos, scene) {
    // Cria uma cópia da bounding box do inimigo na posição prevista
    const boxSize = 5.0;
    const boxHeight = 7.0;
    const min = nextPos.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
    const max = nextPos.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
    const nextBox = new THREE.Box3(min, max);

    let collided = false;
    scene.traverse(obj => {
        if (
            obj !== enemy &&
            obj.userData?.isCollidable &&
            obj.userData?.collisionBox &&
            nextBox.intersectsBox(obj.userData.collisionBox)
        ) {
            collided = true;
        }
    });
    return collided;
}

export function updateEnemyBehavior(enemy, player, scene, delta) {
    const dist = enemy.position.distanceTo(player.position);
    const detectionRadius = 40;

    // Limites da área 1 (ajuste minY/maxY conforme necessário)
    const minX = -15, maxX = 105, minZ = -60, maxZ = 60, minY = 10, maxY = 20;
    const safeMargin = 2;
    const safeMinX = minX + safeMargin, safeMaxX = maxX - safeMargin;
    const safeMinY = minY + safeMargin, safeMaxY = maxY - safeMargin;
    const safeMinZ = minZ + safeMargin, safeMaxZ = maxZ - safeMargin;

    let moveDirection = null;

    if (dist >= detectionRadius) {
        // Se chegou no alvo ou não tem alvo, sorteia novo alvo dentro da área (incluindo Y)
        if (
            !enemy.userData.idleTarget ||
            enemy.position.distanceTo(enemy.userData.idleTarget) < 1 ||
            enemy.userData.idleTarget.x < safeMinX || enemy.userData.idleTarget.x > safeMaxX ||
            enemy.userData.idleTarget.z < safeMinZ || enemy.userData.idleTarget.z > safeMaxZ ||
            enemy.userData.idleTarget.y < safeMinY || enemy.userData.idleTarget.y > safeMaxY
        ) {
            enemy.userData.idleTarget = new THREE.Vector3(
                Math.random() * (safeMaxX - safeMinX) + safeMinX,
                Math.random() * (safeMaxY - safeMinY) + safeMinY,
                Math.random() * (safeMaxZ - safeMinZ) + safeMinZ
            );
        }
        // Agora idleTarget está garantido!
        moveDirection = new THREE.Vector3().subVectors(enemy.userData.idleTarget, enemy.position);
        if (moveDirection.length() > 0.1) {
            moveDirection.normalize();
            const nextPos = enemy.position.clone().add(moveDirection.clone().multiplyScalar(ENEMY_SPEED * delta * 30));
            if (!willCollide(enemy, nextPos, scene)) {
                enemy.position.copy(nextPos);
                // Limita dentro da área segura
                enemy.position.x = Math.max(safeMinX, Math.min(safeMaxX, enemy.position.x));
                enemy.position.y = Math.max(safeMinY, Math.min(safeMaxY, enemy.position.y));
                enemy.position.z = Math.max(safeMinZ, Math.min(safeMaxZ, enemy.position.z));
            } else {
                // Se colidir, sorteia um novo idleTarget imediatamente!
                enemy.userData.idleTarget = new THREE.Vector3(
                    Math.random() * (safeMaxX - safeMinX) + safeMinX,
                    Math.random() * (safeMaxY - safeMinY) + safeMinY,
                    Math.random() * (safeMaxZ - safeMinZ) + safeMinZ
                );
            }
        }
    }

    if (moveDirection && moveDirection.lengthSq() > 0.0001) {
        // Calcula o ângulo no plano XZ
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
    
        enemy.traverse(child => {
            if (child.isMesh) {
                // Ajuste: troque Math.PI por Math.PI/2 ou -Math.PI/2 se necessário
                child.rotation.y = angle ;
            }
        });
    }
    if (enemy.userData.collisionBox) {
        const boxSize = 5;
        const boxHeight = 7;
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
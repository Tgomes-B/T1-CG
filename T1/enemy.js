
import * as THREE from 'three';
import { fadeOut } from './tiro.js';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';
import { HealthBar } from './healthbar.js';

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

                 // Criar barra de vida
                 const healthBar = new HealthBar(obj.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();
                
                                // *** CORREÇÃO PRINCIPAL ***
                // Calcular altura real após carregamento
                obj.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(obj);
                const heightOffset = (bbox.max.y - bbox.min.y) + 1;
                
                healthBarObj.position.y = heightOffset;
                
                obj.add(healthBarObj);
                obj.userData.healthBar = healthBar;

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

function detectPlayer(enemy, player, detectionRadius, visionAngle) {
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
    const dist = toPlayer.length();
    const deltaY = Math.abs(player.position.y - enemy.position.y);
    const maxYDiff = 8;
    return (dist < detectionRadius && deltaY < maxYDiff);
}

function handleDash(enemy, toPlayer, scene, delta, dashParams) {
    enemy.userData.dashTimer += delta;
    if (!enemy.userData.dashActive && enemy.userData.dashTimer > dashParams.cooldown) {
        enemy.userData.dashActive = true;
        enemy.userData.dashTimeLeft = dashParams.duration;
        enemy.userData.dashDir = toPlayer.clone().normalize();
        console.log("DashDir:", enemy.userData.dashDir);
        enemy.userData.dashTimer = 0;
    }
    if (enemy.userData.dashActive) {
        const moveDir = enemy.userData.dashDir;
        const nextPos = enemy.position.clone().add(moveDir.clone().multiplyScalar(dashParams.speed * delta * 60));
        if (!willCollide(enemy, nextPos, scene)) {
            enemy.position.copy(nextPos);
        } else {
            console.log("Colisão detectada durante dash");
        }
        enemy.userData.dashTimeLeft -= delta;
        if (enemy.userData.dashTimeLeft <= 0) {
            enemy.userData.dashActive = false;
        }
        rotateEnemyTo(enemy, moveDir);
    } else {
        // Aproxima normalmente enquanto espera o dash
        const moveDir = toPlayer.clone().normalize();
        const nextPos = enemy.position.clone().add(moveDir.clone().multiplyScalar(ENEMY_SPEED * delta * 60));
        if (!willCollide(enemy, nextPos, scene)) {
            enemy.position.copy(nextPos);
        } else {
            console.log("Colisão detectada na aproximação normal");
        }
        rotateEnemyTo(enemy, moveDir);
    }
}

function handleIdle(enemy, scene, delta, idleParams, areaLimits) {
    enemy.userData.idleTimer += delta;
    if (
        !enemy.userData.idleTarget ||
        enemy.position.distanceTo(enemy.userData.idleTarget) < 1 ||
        enemy.userData.idleTarget.x < areaLimits.safeMinX || enemy.userData.idleTarget.x > areaLimits.safeMaxX ||
        enemy.userData.idleTarget.z < areaLimits.safeMinZ || enemy.userData.idleTarget.z > areaLimits.safeMaxZ ||
        enemy.userData.idleTarget.y < areaLimits.safeMinY || enemy.userData.idleTarget.y > areaLimits.safeMaxY ||
        enemy.userData.idleTimer > idleParams.changeTime
    ) {
        enemy.userData.idleTarget = new THREE.Vector3(
            Math.random() * (areaLimits.safeMaxX - areaLimits.safeMinX) + areaLimits.safeMinX,
            Math.random() * (areaLimits.safeMaxY - areaLimits.safeMinY) + areaLimits.safeMinY,
            Math.random() * (areaLimits.safeMaxZ - areaLimits.safeMinZ) + areaLimits.safeMinZ
        );
        enemy.userData.idleTimer = 0;
    }
    const moveDir = new THREE.Vector3().subVectors(enemy.userData.idleTarget, enemy.position);
    if (moveDir.length() > 0.1) {
        moveDir.normalize();
        const nextPos = enemy.position.clone().add(moveDir.clone().multiplyScalar(ENEMY_SPEED * delta * 30));
        if (!willCollide(enemy, nextPos, scene)) {
            enemy.position.copy(nextPos);
            enemy.position.x = Math.max(areaLimits.safeMinX, Math.min(areaLimits.safeMaxX, enemy.position.x));
            enemy.position.y = Math.max(areaLimits.safeMinY, Math.min(areaLimits.safeMaxY, enemy.position.y));
            enemy.position.z = Math.max(areaLimits.safeMinZ, Math.min(areaLimits.safeMaxZ, enemy.position.z));
        } else {
            enemy.userData.idleTarget = null;
        }
    }
    if (moveDir.lengthSq() > 0.0001) {
        rotateEnemyTo(enemy, moveDir);
    }
}

export function updateEnemyBehavior(enemy, player, scene, delta) {
    // Parâmetros do dash
    const dashParams = {
        cooldown: 15,   // segundos entre dashes
        duration: 0.7, // duração do dash em segundos
        speed: 6     // velocidade do dash (ajuste conforme necessário)
    };
    // Parâmetros do idle
    const idleParams = {
        changeTime: 2 // tempo para trocar de alvo idle
    };
    // Limites da área (ajuste conforme seu mapa)
    const areaLimits = {
        safeMinX: 115,
        safeMaxX: 235,
        safeMinY: 4,
        safeMaxY: 30,
        safeMinZ: -215,
        safeMaxZ: -95
    };

    // Inicialização dos timers e flags
    if (enemy.userData.dashTimer === undefined) enemy.userData.dashTimer = 0;
    if (enemy.userData.dashActive === undefined) enemy.userData.dashActive = false;
    if (enemy.userData.dashTimeLeft === undefined) enemy.userData.dashTimeLeft = 0;
    if (enemy.userData.hasDetectedPlayer === undefined) enemy.userData.hasDetectedPlayer = false;
    if (enemy.userData.lostPlayerTimer === undefined) enemy.userData.lostPlayerTimer = 0;
    if (enemy.userData.idleTimer === undefined) enemy.userData.idleTimer = 0;

    // Detecta o player
    const detectionRadius = 50;
    const visionAngle = 360; // não usado, mas pode ser implementado
    const detected = detectPlayer(enemy, player, detectionRadius, visionAngle);

    // Lógica de detecção e perseguição
    if (detected) {
        enemy.userData.hasDetectedPlayer = true;
        enemy.userData.lostPlayerTimer = 2;
    } else if (enemy.userData.hasDetectedPlayer) {
        enemy.userData.lostPlayerTimer -= delta;
        if (enemy.userData.lostPlayerTimer <= 0) {
            enemy.userData.hasDetectedPlayer = false;
        }
    }

    if (enemy.userData.hasDetectedPlayer) {
        // Dash na direção do player
        const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
        handleDash(enemy, toPlayer, scene, delta, dashParams);
    } else {
        // Idle
        handleIdle(enemy, scene, delta, idleParams, areaLimits);
    }

    updateCollisionBox(enemy);
    handleDeath(enemy);
}

function handleDeath(enemy) {
    if (enemy.userData.hp <= 0 && !enemy.userData.fading) {
        enemy.userData.fading = true;
        // Se quiser um fade visual, chame fadeOut (se implementado)
        if (typeof fadeOut === "function") {
            fadeOut(enemy, () => {
                if (enemy.parent) {
                    enemy.parent.remove(enemy);
                }
            });
        } else {
            // Remove imediatamente se não houver fade
            if (enemy.parent) {
                enemy.parent.remove(enemy);
            }
        }
    }
}

function rotateEnemyTo(enemy, moveDir) {
    // Gira apenas no eixo Y para olhar para a direção do movimento
    if (moveDir.lengthSq() > 0.0001) {
        const angle = Math.atan2(moveDir.x, moveDir.z);
        enemy.rotation.y = angle;
    }
}

function updateCollisionBox(enemy) {
    const boxSize = 5.0;
    const boxHeight = 7.0;
    const boxCenter = enemy.position.clone();
    const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
    const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
    if (!enemy.userData.collisionBox) {
        enemy.userData.collisionBox = new THREE.Box3(min, max);
    } else {
        enemy.userData.collisionBox.min.copy(min);
        enemy.userData.collisionBox.max.copy(max);
    }
    // Atualiza helper visual se existir
    if (enemy.userData.boxHelper) {
        enemy.userData.boxHelper.box.copy(enemy.userData.collisionBox);
        enemy.userData.boxHelper.updateMatrixWorld(true);
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
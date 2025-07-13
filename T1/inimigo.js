// inimigo.js
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js'; // Importe a classe HealthBar

export const enemyProjectiles = [];

export function adicionarInimigoCena(cena, caminhoGLB, posicoes = [{ x: 0, y: 0, z: 0 }]) {
    if (!Array.isArray(posicoes)) posicoes = [posicoes];

    const loader = new GLTFLoader();

    posicoes.forEach(posicao => {
        loader.load(
            caminhoGLB,
            (gltf) => {
                const inimigo = gltf.scene;
                inimigo.position.set(posicao.x, posicao.y, posicao.z);
                inimigo.scale.set(0.007, 0.007, 0.007);
                inimigo.rotateY(-Math.PI / 2);
                inimigo.userData.isEnemy = true;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "glb"; // Tipo GLB
                inimigo.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

                // Aumentar altura da caixa de colisão
                const boxSize = 7.57;
                const boxHeight = 10;
                const boxCenter = inimigo.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxHeight / 2, -boxSize / 2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxHeight / 2, boxSize / 2));
                inimigo.userData.collisionBox = new THREE.Box3(min, max);

                const boxHelper = new THREE.Box3Helper(inimigo.userData.collisionBox, 0xff0000);
                cena.add(boxHelper);
                inimigo.userData.boxHelper = boxHelper;
                inimigo.userData.state = "idle";
                inimigo.userData.detectionRadius = 60;
                inimigo.userData.moveType = "float";
                inimigo.userData.moveDirection = 1;
                inimigo.userData.baseY = inimigo.position.y;

                // Configurar HP e barra de vida
                inimigo.userData.hp = 50;
                inimigo.userData.maxHp = 50;

                const healthBar = new HealthBar(inimigo.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();
                
                // *** CORREÇÃO PRINCIPAL ***
                // Calcular altura real após carregamento
                inimigo.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(inimigo);
                const heightOffset = (bbox.max.y - bbox.min.y) + 1;

                healthBarObj.position.y = heightOffset;

                inimigo.add(healthBarObj);
                inimigo.userData.healthBar = healthBar;

                inimigo.traverse((child) => {
                    if (child.isMesh) {
                        child.material.transparent = true;
                    }
                });

                cena.add(inimigo);
            },
            undefined,
            (erro) => {
                console.error('Erro ao carregar o modelo GLB do inimigo:', erro);
            }
        );
    });
}

function willCollide(enemy, nextPos, scene) {
    // Cria uma cópia da bounding box do inimigo na posição prevista
    const boxSize = 7.57, boxHeight = 10;
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

function spawnEnemyProjectile(enemy, player) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffa500 }); // laranja
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(enemy.position);
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.quaternion).normalize();

    projectile.userData = {
        velocity: direction.multiplyScalar(1.5),
        isEnemyProjectile: true,
        life: 3 // segundos de vida
    };
    enemy.parent.add(projectile); // Adiciona na mesma área do inimigo
    enemyProjectiles.push(projectile);
}

export function updateEnemyProjectiles(delta, player) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = enemyProjectiles[i];
        proj.position.addScaledVector(proj.userData.velocity, delta * 10);
        proj.userData.life -= delta;
        // Colisão simples com player (pode melhorar)
        if (proj.position.distanceTo(player.position) < 1) {
            // Aqui você pode aplicar dano ao player
            proj.parent.remove(proj);
            enemyProjectiles.splice(i, 1);
            continue;
        }
        // Remove projétil se acabar o tempo de vida
        if (proj.userData.life <= 0) {
            proj.parent.remove(proj);
            enemyProjectiles.splice(i, 1);
        }
    }
}

function lookAtTarget(enemy, target) {
    enemy.lookAt(target.x, enemy.position.y, target.z);
}
export function updateEnemyBehaviorGLB(enemy, player, scene, delta) {

    // Limites da área 2
    const minX = -5, maxX = 115, minZ = -60, maxZ = 60, minY = 10, maxY = 30;
    const safeMargin = 2; // distância segura das bordas

    // Limites seguros
    const safeMinX = minX + safeMargin, safeMaxX = maxX - safeMargin;
    const safeMinY = minY + safeMargin, safeMaxY = maxY - safeMargin;
    const safeMinZ = minZ + safeMargin, safeMaxZ = maxZ - safeMargin;

    // Timer de ataque
    if (enemy.userData.attackTimer === undefined) enemy.userData.attackTimer = 0;
    enemy.userData.attackTimer -= delta;
    if (
        enemy.userData.attackTimer <= 0 &&
        enemy.userData.hasDetectedPlayer // só atira se estiver perseguindo
    ) {
        spawnEnemyProjectile(enemy, player);
        enemy.userData.attackTimer = 2;
    }

    const distXZ = Math.sqrt(
        Math.pow(enemy.position.x - player.position.x, 2) +
        Math.pow(enemy.position.z - player.position.z, 2)
    );
    const deltaY = Math.abs(enemy.position.y - player.position.y);
    const detectionRadius = enemy.userData.detectionRadius;
    const maxYDiff = 8; // altura máxima para detectar

    if (distXZ < detectionRadius && deltaY < maxYDiff) {
        enemy.userData.hasDetectedPlayer = true;
        enemy.userData.lostPlayerTimer = 2;
    } else if (enemy.userData.hasDetectedPlayer) {
        enemy.userData.lostPlayerTimer -= delta;
        if (enemy.userData.lostPlayerTimer <= 0) {
            enemy.userData.hasDetectedPlayer = false;
        }
    }

    if (enemy.userData.hasDetectedPlayer) {
        const moveDirection = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        const nextPos = enemy.position.clone().add(moveDirection.clone().multiplyScalar(5 * delta));
        if (!willCollide(enemy, nextPos, scene)) {
            enemy.position.copy(nextPos);
            // Limita dentro da área segura
            enemy.position.x = Math.max(safeMinX, Math.min(safeMaxX, enemy.position.x));
            enemy.position.y = Math.max(safeMinY, Math.min(safeMaxY, enemy.position.y));
            enemy.position.z = Math.max(safeMinZ, Math.min(safeMaxZ, enemy.position.z));
        }
        lookAtTarget(enemy, player.position);
    } else {
        // Idle como antes...
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
        const dir = new THREE.Vector3().subVectors(enemy.userData.idleTarget, enemy.position);
        if (dir.length() > 0.1) {
            dir.normalize();
            const nextPos = enemy.position.clone().add(dir.clone().multiplyScalar(5 * delta * 2));
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
            lookAtTarget(enemy, enemy.userData.idleTarget);
        }
    }
    if (enemy.userData.collisionBox) {
        const boxSize = 5.0;
        const boxHeight = 7;
        const boxCenter = enemy.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxHeight / 2, -boxSize / 2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxHeight / 2, boxSize / 2));
        enemy.userData.collisionBox.min.copy(min);
        enemy.userData.collisionBox.max.copy(max);
    }
    if (enemy.userData.boxHelper) {
        enemy.userData.boxHelper.updateMatrixWorld(true);
    }

    // console.log(enemy.userData.hasDetectedPlayer ? "Me viu!" : "Não me viu!");
}

// Atualização dos inimigos GLB
export function updateEnemies(scene, controls, delta) {
    scene.traverse(obj => {
        if (
            obj.userData &&
            obj.userData.isEnemy &&
            obj.userData.enemyType === "glb" // Só GLB!
        ) {
            if (obj.userData.mixer) {
                obj.userData.mixer.update(delta);
            }
            updateEnemyBehaviorGLB(obj, controls.getObject(), scene, delta);
        }
    });
}
// inimigo.js
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js'; // Importe a classe HealthBar

export function adicionarInimigoCena(cena, caminhoGLB, posicoes = [{ x: 0, y: 0, z: 0 }]) {
    if (!Array.isArray(posicoes)) posicoes = [posicoes];

    const loader = new GLTFLoader();

    posicoes.forEach(posicao => {
        loader.load(
            caminhoGLB,
            (gltf) => {
                const inimigo = gltf.scene;
                inimigo.position.set(posicao.x, posicao.y, posicao.z);
                inimigo.scale.set(0.012, 0.012, 0.012);
                inimigo.rotateY(0);
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

                const boxHelper = new THREE.Box3Helper(inimigo.userData.collisionBox, "red");
                cena.add(boxHelper);

                inimigo.userData.boxHelper = boxHelper;
                inimigo.userData.state = "idle";
                inimigo.userData.detectionRadius = 100;
                inimigo.userData.moveType = "float";
                inimigo.userData.moveDirection = 1;
                inimigo.userData.baseY = inimigo.position.y;

                // Configurar HP e barra de vida
                inimigo.userData.hp = 50;
                inimigo.userData.maxHp = 50;

                // Criar barra de vida
                const healthBar = new HealthBar(inimigo.userData.maxHp, 1.0, 15);
                inimigo.add(healthBar.getObject());
                inimigo.userData.healthBar = healthBar;

                inimigo.traverse((child) => {
                    if (child.isMesh) {
                        child.material.transparent = true;
                    }
                });

                cena.add(inimigo);

                // --- Animação ---
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(inimigo);
                    const idleClip = gltf.animations.find(clip => clip.name.toLowerCase() === "idle");
                    if (idleClip) {
                        const action = mixer.clipAction(idleClip);
                        action.play();
                    } else {
                        const action = mixer.clipAction(gltf.animations[0]);
                        action.play();
                    }
                    inimigo.userData.mixer = mixer;
                }
            },
            undefined,
            (erro) => {
                console.error('Erro ao carregar o modelo GLB do inimigo:', erro);
            }
        );
    });
}

function lookAtTarget(enemy, target) {
    enemy.lookAt(target.x, enemy.position.y, target.z);
}
export function updateEnemyBehaviorGLB(enemy, player, scene, delta) {
    const dist = enemy.position.distanceTo(player.position);
    const detectionRadius = enemy.userData.detectionRadius || 100;

    // Limites da área 2
    const minX = -5, maxX = 115, minZ = -60, maxZ = 60, minY = 10, maxY = 30;

    if (dist >= detectionRadius) {
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
        const dir = new THREE.Vector3().subVectors(enemy.userData.idleTarget, enemy.position);
        if (dir.length() > 0.1) {
            dir.normalize();
            enemy.position.add(dir.multiplyScalar(5 * delta * 2));
            // Limita dentro da área
            enemy.position.x = Math.max(minX, Math.min(maxX, enemy.position.x));
            enemy.position.y = Math.max(minY, Math.min(maxY, enemy.position.y));
            enemy.position.z = Math.max(minZ, Math.min(maxZ, enemy.position.z));
            // Faz o modelo inteiro olhar para onde está indo, considerando o vetor direção
            lookAtTarget(enemy, enemy.userData.idleTarget, dir);
        }
    } else {
        // Persegue player normalmente
        const moveDirection = new THREE.Vector3()
            .subVectors(player.position, enemy.position)
            .normalize();
        enemy.position.x += moveDirection.x * 5 * delta;
        enemy.position.y += moveDirection.y * 5 * delta;
        enemy.position.z += moveDirection.z * 5 * delta;
        lookAtTarget(enemy, player.position, moveDirection);
    }

    // Atualiza collisionBox e boxHelper se existirem
    if (enemy.userData.collisionBox) {
        const boxSize = 7.57;
        const boxHeight = 10;
        const boxCenter = enemy.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxHeight / 2, -boxSize / 2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxHeight / 2, boxSize / 2));
        enemy.userData.collisionBox.min.copy(min);
        enemy.userData.collisionBox.max.copy(max);
    }
    if (enemy.userData.boxHelper) {
        enemy.userData.boxHelper.updateMatrixWorld(true);
    }
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
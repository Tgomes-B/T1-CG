import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { fadeOut } from './tiro.js';

export const enemyProjectiles = [];

export function enemyShoot(enemyObj, targetPos, scene) {
    const fireballSpeed = 20;
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0xff6600, emissive: 0xff2200, shininess: 100 });
    const fireball = new THREE.Mesh(geometry, material);

    const dir = new THREE.Vector3().subVectors(targetPos, enemyObj.position).normalize();
    fireball.position.copy(enemyObj.position).add(dir.clone().multiplyScalar(4));
    fireball.userData.velocity = dir.multiplyScalar(fireballSpeed * 2);
    fireball.userData.startTime = performance.now();
    fireball.userData.shooter = enemyObj;
    fireball.visible = true;
    fireball.material.opacity = 1;
    fireball.material.transparent = false;

    scene.add(fireball);
    enemyProjectiles.push(fireball);
}

export function Comportamento(obj, playerObj, scene, delta) {
    const boxSize = 7.57;
    const playerPos = playerObj.position;
    const enemyPos = obj.position;
    const dist = playerPos.distanceTo(enemyPos);

    // Atualiza collisionBox do inimigo
    if (obj.userData.collisionBox) {
        const boxCenter = obj.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2));
        obj.userData.collisionBox.min.copy(min);
        obj.userData.collisionBox.max.copy(max);

        if (obj.userData.boxHelper) {
            obj.userData.boxHelper.box.copy(obj.userData.collisionBox);
            obj.userData.boxHelper.updateMatrixWorld(true);
        }
    }

    // Detecta altura do solo logo abaixo do inimigo
    const collidables = scene.children.filter(o =>
        o !== obj && o.userData && o.userData.isCollidable && o.userData.collisionBox
    );
    let groundY = obj.position.y - boxSize / 2;
    collidables.forEach(o => {
        if (o.userData.collisionBox.containsPoint(new THREE.Vector3(obj.position.x, groundY, obj.position.z))) {
            groundY = o.userData.collisionBox.max.y;
        }
    });
    const baseY = 8;

    // Troca de estado: idle -> perseguir
    if (obj.userData.state === "idle" && dist < obj.userData.detectionRadius) {
        obj.userData.state = "perseguir";
    }

    // Troca de estado: perseguir -> idle (desistir)
    if (obj.userData.state === "perseguir" && dist > obj.userData.detectionRadius + 10) {
        obj.userData.state = "idle";
    }

    // Idle: volta suavemente para a altura base e flutua
    if (obj.userData.state === "idle") {
        const targetY = baseY + Math.sin(performance.now() * 0.001) * 2;
        if (obj.position.y < targetY) {
            obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.05);
        } else if (obj.position.y > targetY + 0.1) {
            obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, 0.05);
        }
    }

    // Perseguir: vai atrás do player, descendo até o solo se necessário
    if (obj.userData.state === "perseguir") {
        const dir = new THREE.Vector3().subVectors(playerPos, enemyPos);
        dir.y = 0;
        const distance = dir.length();
        if (distance > 1) {
            dir.normalize();
            const nextPos = obj.position.clone().add(dir.clone().multiplyScalar(5 * delta));
            const enemyBox = new THREE.Box3(
                nextPos.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2)),
                nextPos.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2))
            );
            const collided = collidables.some(o => o.userData.collisionBox.intersectsBox(enemyBox));
            if (!collided) {
                obj.position.copy(nextPos);
            } else {
                if (obj.position.y < baseY - 0.05) {
                    let stepped = false;
                    const maxStep = Math.min(2, baseY - obj.position.y);
                    const stepIncrement = 0.1;
                    for (let step = stepIncrement; step <= maxStep; step += stepIncrement) {
                        const tryPos = nextPos.clone();
                        tryPos.y = obj.position.y + step;
                        if (tryPos.y > baseY) break;
                        const enemyBoxStep = new THREE.Box3(
                            tryPos.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2)),
                            tryPos.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2))
                        );
                        let collidedStep = collidables.some(o => o.userData.collisionBox.intersectsBox(enemyBoxStep));
                        if (!collidedStep) {
                            obj.position.copy(tryPos);
                            stepped = true;
                            break;
                        }
                    }
                }
            }
        }
        if (obj.position.y > baseY + 0.05) {
            obj.position.y = THREE.MathUtils.lerp(obj.position.y, baseY, 0.05);
        }
        const angle = Math.atan2(playerPos.x - enemyPos.x, playerPos.z - enemyPos.z);
        obj.rotation.y = angle;

        obj.userData.shootCooldown -= delta;
        if (obj.userData.shootCooldown <= 0) {
            enemyShoot(obj, playerPos, scene);
            obj.userData.shootCooldown = 3;
        }
    }
    if (obj.userData.hp !== undefined && obj.userData.hp <= 0 && !obj.userData.fading) {
        obj.userData.fading = true;
        let root = obj;
        while (root.parent && !root.parent.isScene) {
            root = root.parent;
        }
        fadeOut(root, 250, () => {
            scene.remove(root);
            if (root.userData.boxHelper) scene.remove(root.userData.boxHelper);
        });
    }
}

export function updateEnemyProjectiles(scene, controls, delta) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = enemyProjectiles[i];
        proj.position.add(proj.userData.velocity.clone().multiplyScalar(delta));

        if (proj.position.distanceTo(controls.getObject().position) < 1) {
            fadeOut(proj, 100, () => { scene.remove(proj); });
            enemyProjectiles.splice(i, 1);
            continue;
        }

        const collidables = scene.children.filter(obj =>
            obj.userData && obj.userData.isCollidable && obj.userData.collisionBox && obj !== proj.userData.shooter
        );
        const projBox = new THREE.Box3().setFromCenterAndSize(
            proj.position.clone(),
            new THREE.Vector3(0.4, 0.4, 0.4)
        );
        const hitObstacle = collidables.some(obj =>
            obj.userData.collisionBox && projBox.intersectsBox(obj.userData.collisionBox)
        );
        if (hitObstacle) {
            fadeOut(proj, 100, () => { scene.remove(proj); });
            enemyProjectiles.splice(i, 1);
            continue;
        }

        if (performance.now() - proj.userData.startTime > 3000) {
            fadeOut(proj, 100, () => { scene.remove(proj); });
            enemyProjectiles.splice(i, 1);
        }
    }
}

export function adicionarInimigoCena(cena, caminhoGLB, posicao = { x: 0, y: 0, z: 0 }) {
    const loader = new GLTFLoader();
    loader.load(
        caminhoGLB,
        (gltf) => {
            const inimigo = gltf.scene;
            inimigo.position.set(posicao.x, posicao.y, posicao.z);
            inimigo.scale.set(0.015, 0.015, 0.015);
            inimigo.userData.isEnemy = true;
            inimigo.userData.enemyType = "glb";
            inimigo.userData.isCollidable = true;
            inimigo.traverse(child => {
                if (child.isMesh) {
                    child.userData.isEnemy = true;
                }
            });

            const boxSize = 7.57; // tamanho do lado do quadrado (ajuste para o seu modelo)
            const boxCenter = inimigo.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2));
            inimigo.userData.collisionBox = new THREE.Box3(min, max);

            const boxHelper = new THREE.Box3Helper(inimigo.userData.collisionBox, "red");
            cena.add(boxHelper);
            inimigo.userData.hp = 50;
            inimigo.userData.shootCooldown = 0;
            inimigo.userData.boxHelper = boxHelper;
            inimigo.userData.state = "idle";
            inimigo.userData.detectionRadius = 100;
            inimigo.userData.moveType = "float";
            inimigo.userData.moveDirection = 1;
            inimigo.userData.baseY = inimigo.position.y;

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
}
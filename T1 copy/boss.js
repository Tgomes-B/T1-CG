import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js';

export function adicionarBossGLB(scene, caminhoGLB, posicao) {
    const loader = new GLTFLoader();
    loader.load(caminhoGLB, gltf => {
        const boss = gltf.scene;
        boss.position.copy(posicao);
        boss.scale.set(0.38, 0.38, 0.38); 
        boss.userData.isEnemy = true;
        boss.userData.isCollidable = true;
        boss.userData.enemyType = "boss";
        boss.userData.hp = 300;
        boss.userData.maxHp = 300;
        boss.userData.tipo = "boss";
        boss.userData.state = "idle";
        boss.userData.detectionRadius = 80; // maior alcance
        boss.userData.moveType = "walk";
        boss.userData.moveDirection = 1;
        boss.userData.baseY = boss.position.y;
        boss.name = "boss";
        boss.userData.name = "boss";

        // HealthBar
        const healthBar = new HealthBar(boss.userData.maxHp, 1.8); // igual ao Cacodemon, proporcional ao modelo
        const healthBarObj = healthBar.getObject();
        boss.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(boss);
        const heightOffset = bbox.max.y + boss.position.y + 2
        healthBarObj.position.set(0, heightOffset, 0); // posicionamento igual ao Cacodemon
        boss.add(healthBarObj);
        boss.userData.healthBar = healthBar;

        // Collision Box (ajustada ao novo tamanho, igual ao Cacodemon)
        boss.updateMatrixWorld(true);
        const bboxBoss = new THREE.Box3().setFromObject(boss);
        boss.userData.collisionBox = bboxBoss.clone();

        boss.traverse(child => {
            if (child.isMesh) {
                child.userData.isEnemy = true;
                child.userData.hp = boss.userData.hp;
                child.userData.enemyRoot = boss;
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.transparent = true;
            }
        });
        boss.updateMatrixWorld(true);

        scene.add(boss);
    });
}
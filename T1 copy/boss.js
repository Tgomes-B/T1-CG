import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js';

export function adicionarBossGLB(scene, caminhoGLB, posicao) {
    const loader = new GLTFLoader();
    loader.load(caminhoGLB, gltf => {
        const boss = gltf.scene;
        boss.position.copy(posicao);
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
        const healthBar = new HealthBar(boss.userData.maxHp, 2.5);
        const healthBarObj = healthBar.getObject();
        boss.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(boss);
        const heightOffset = (bbox.max.y - bbox.min.y) + 3;
        healthBarObj.position.y = heightOffset;
        boss.add(healthBarObj);
        boss.userData.healthBar = healthBar;

        // Collision Box (maior que o Skull)
        const boxSize = 12; // maior que Skull
        const boxHeight = 16;
        const boxCenter = boss.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
        boss.userData.collisionBox = new THREE.Box3(min, max);

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
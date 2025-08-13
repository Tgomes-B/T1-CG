import * as THREE from 'three';
import { HealthBar } from './healthbar.js';
import { FireEffect } from './Effects.js';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

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
                obj.userData.enemyType = "skull";
                obj.userData.fading = false;
                obj.userData.isCollidable = true;
                obj.userData.state = "patrol";
                obj.userData.originalPosition = obj.position.clone();
                // Define patrolArea como toda a areaChave
                const patrolBoxMin = new THREE.Vector3(25, 2, -30);
                const patrolBoxMax = new THREE.Vector3(75, 8, 30);
                obj.userData.patrolArea = {min: patrolBoxMin, max: patrolBoxMax};
                obj.userData.detectionRadius = 60;

                // Skull dash properties
                obj.userData.dashDirection = new THREE.Vector3();
                obj.userData.isDashing = false;
                obj.userData.lastDashTime = 0;
                obj.userData.dashDuration = 2000; // 2 seconds of dash
                obj.userData.dashSpeed = 25; // Speed of the dash
                obj.userData.maxDashDistance = 1800; // Increased dash distance to 1800 units

                const healthBar = new HealthBar(obj.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();

                obj.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(obj);
                const heightOffset = (bbox.max.y - bbox.min.y) + 1;

                healthBarObj.position.y = heightOffset;

                obj.add(healthBarObj);
                obj.userData.healthBar = healthBar;

                const boxSize = 5;
                const boxHeight = 7;
                const boxCenter = obj.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
                obj.userData.collisionBox = new THREE.Box3(min, max);

                //BoxHelper
                //const boxHelper = new THREE.BoxHelper(obj, 0xffff00); 
                //obj.userData.boxHelper = boxHelper;

                obj.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isEnemy = true;
                        child.userData.hp = obj.userData.hp;
                        child.userData.enemyRoot = obj;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material.transparent = true;
                    }
                });

                obj.updateMatrixWorld(true);

                // Adiciona efeito de fogo procedural
                const fireEffect = new FireEffect(obj, obj.parent || window.scene, {
                    radius: 2.2,
                    height: 2.5,
                    count: 32
                });
                obj.userData.fireEffect = fireEffect;

                if (onLoad) onLoad(obj);
            },
            undefined,
            (error) => {
                console.error('Erro ao carregar modelo OBJ:', error);
            }
        );
    });
}

//colisão com eles mesmos, pilares, atravessar o player no dash e movimentação coerente
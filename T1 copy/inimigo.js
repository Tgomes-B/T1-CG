// inimigo.js
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js'; 

export const enemyProjectiles = []; 

export function adicionarInimigoCena(cena, posicoes = [{ x: 0, y: 0, z: 0 }], onAllLoaded) {
    const assetPath = 'images/sprites/cacodemon.glb';    

    if (!Array.isArray(posicoes)) posicoes = [posicoes];

    const loader = new GLTFLoader();
    let loaded = 0;

    posicoes.forEach(posicao => {
        loader.load(
            assetPath,
            (gltf) => {
                const inimigo = gltf.scene;
                inimigo.position.set(posicao.x, 12, posicao.z); // y mais alto
                inimigo.scale.set(0.007, 0.007, 0.007);
                inimigo.rotateY(-Math.PI / 2);
                inimigo.userData.isEnemy = true;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "glb";
                inimigo.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

                inimigo.userData.state = "patrol";
                inimigo.userData.originalPosition = inimigo.position.clone();
                // Define patrolArea como toda a áreaElevada
                const patrolBoxMin = new THREE.Vector3(30, 2, -60);
                const patrolBoxMax = new THREE.Vector3(160, 18, 60);
                inimigo.userData.patrolArea = {min: patrolBoxMin, max: patrolBoxMax};
                inimigo.userData.detectionRadius = 60;
                inimigo.userData.moveType = "float";
                inimigo.userData.moveDirection = 1;
                inimigo.userData.baseY = inimigo.position.y;
                inimigo.userData.hp = 50;
                inimigo.userData.maxHp = 50;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "cacodemon";
                inimigo.userData.fading = false;
                inimigo.name = "cacodemon";
                inimigo.userData.name = "cacodemon";

                // Configurar HP e barra de vida
                const healthBar = new HealthBar(inimigo.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();
                
                inimigo.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(inimigo);
                const heightOffset = bbox.max.y + inimigo.position.y + 700;
                healthBarObj.position.y = heightOffset;
                inimigo.add(healthBarObj);
                inimigo.userData.healthBar = healthBar;
                
                // Collision box igual Skull, mas ajustada para o Cacodemon
                const boxSize = 6; // maior que Skull, mas menor que Boss
                const boxHeight = 8;
                const boxCenter = inimigo.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
                inimigo.userData.collisionBox = new THREE.Box3(min, max);

                //BoxHelpera
                //const boxHelper = new THREE.BoxHelper(inimigo, 0xffff00); 
                //inimigo.userData.boxHelper = boxHelper;
                //cena.add(boxHelper)
                
                inimigo.traverse((child) => {
                    if (child.isMesh) {
                        child.material.transparent = true;
                    }
                });
                
                cena.add(inimigo);
                loaded++;
                if (loaded === posicoes.length && typeof onAllLoaded === "function") {
                    onAllLoaded();
                }
            },
            undefined,
            (erro) => {
                console.error('Erro ao carregar o modelo GLB do inimigo:', erro);
            }
        );
    });
}

//colisão com eles mesmos, as torres, atirar bolas de fogo e movimentação coerente

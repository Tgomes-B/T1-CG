// inimigo.js
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js'; 

export const enemyProjectiles = []; //  pra qguardar os 3 da area 2

export function adicionarInimigoCena(cena, posicoes = [{ x: 0, y: 0, z: 0 }]) {
    const assetPath = 'images/sprites/cacodemon.glb';    

    if (!Array.isArray(posicoes)) posicoes = [posicoes];

    const loader = new GLTFLoader();

    posicoes.forEach(posicao => {
        loader.load(
            assetPath,
            (gltf) => {
                const inimigo = gltf.scene;
                inimigo.position.set(posicao.x, posicao.y, posicao.z);
                inimigo.scale.set(0.007, 0.007, 0.007);
                inimigo.rotateY(-Math.PI / 2);
                inimigo.userData.isEnemy = true;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "glb";
                inimigo.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

                inimigo.userData.state = "idle";
                inimigo.userData.detectionRadius = 60;
                inimigo.userData.moveType = "float";
                inimigo.userData.moveDirection = 1;
                inimigo.userData.baseY = inimigo.position.y;
                inimigo.userData.hp = 50;
                inimigo.userData.maxHp = 50;

                // Configurar HP e barra de vida
                const healthBar = new HealthBar(inimigo.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();
                
                inimigo.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(inimigo);
                const heightOffset = bbox.max.y + inimigo.position.y + 700;

                
                healthBarObj.position.y = heightOffset;
                healthBarObj.position.set(0, heightOffset, 0);
                
                inimigo.add(healthBarObj);
                inimigo.userData.healthBar = healthBar;
                
                inimigo.userData.collisionBox = bbox.clone();

                //BoxHelper
                //const boxHelper = new THREE.BoxHelper(inimigo, 0xffff00); 
                //inimigo.userData.boxHelper = boxHelper;
                //cena.add(boxHelper)
                
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

//colisão com eles mesmos, as torres, atirar bolas de fogo e movimentação coerente

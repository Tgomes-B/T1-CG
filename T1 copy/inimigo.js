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
                inimigo.position.set(posicao.x, 15, posicao.z); // y mais alto para evitar afundar
                inimigo.scale.set(0.007, 0.007, 0.007);
                inimigo.rotateY(-Math.PI / 2);
                inimigo.userData.isEnemy = true;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "glb";
                inimigo.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

                inimigo.userData.state = "patrol";
                inimigo.userData.originalPosition = inimigo.position.clone();
                // Define patrolArea como toda a áreaElevada
                const patrolBoxMin = new THREE.Vector3(115, 15, -60); // Y mínimo aumentado
                const patrolBoxMax = new THREE.Vector3(235, 25, 60);  // Y máximo reduzido
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
                inimigo.userData.tipo = "cacodemon";

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

export function adicionarCacodemonsArea4(cena, area4, onAllLoaded) {
    const assetPath = 'images/sprites/cacodemon.glb';
    const loader = new GLTFLoader();
    let loaded = 0;
    
    // Posições dos Cacodemons na área 4 (distribuídos estrategicamente)
    const posicoes = [
        { x: area4.position.x - 60, y: 15, z: area4.position.z - 40 },
        { x: area4.position.x + 60, y: 15, z: area4.position.z - 40 },
        { x: area4.position.x - 60, y: 15, z: area4.position.z + 40 },
        { x: area4.position.x + 60, y: 15, z: area4.position.z + 40 }
    ];

    // Define a área de patrulha baseada na área 4
    const areaSize = 190; // Tamanho da área 4
    const patrolBoxMin = new THREE.Vector3(
        area4.position.x - areaSize/2,
        15,  // Altura mínima
        area4.position.z - areaSize/2
    );
    const patrolBoxMax = new THREE.Vector3(
        area4.position.x + areaSize/2,
        25,  // Altura máxima
        area4.position.z + areaSize/2
    );

    posicoes.forEach((posicao, index) => {
        loader.load(
            assetPath,
            (gltf) => {
                const inimigo = gltf.scene;
                inimigo.position.set(posicao.x, posicao.y, posicao.z);
                inimigo.scale.set(0.007, 0.007, 0.007);
                inimigo.rotateY(-Math.PI / 2);
                inimigo.userData.isEnemy = true;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "cacodemon";
                inimigo.traverse(child => { 
                    if (child.isMesh) { 
                        child.castShadow = true; 
                        child.receiveShadow = true; 
                    } 
                });

                // Configuração do comportamento
                inimigo.userData.state = "patrol";
                inimigo.userData.originalPosition = inimigo.position.clone();
                inimigo.userData.patrolArea = { min: patrolBoxMin.clone(), max: patrolBoxMax.clone() };
                inimigo.userData.detectionRadius = 60;
                inimigo.userData.moveType = "float";
                inimigo.userData.moveDirection = 1;
                inimigo.userData.baseY = 15; // Altura base de flutuação
                inimigo.userData.hp = 50;
                inimigo.userData.maxHp = 50;
                inimigo.userData.isCollidable = true;
                inimigo.userData.enemyType = "cacodemon";
                inimigo.userData.fading = false;
                inimigo.name = `cacodemon_area4_${index}`;
                inimigo.userData.name = "cacodemon";

                // Configuração da barra de vida (mesmo estilo da área 2)
                const healthBar = new HealthBar(inimigo.userData.maxHp, 1.5);
                const healthBarObj = healthBar.getObject();
                
                inimigo.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(inimigo);
                const heightOffset = bbox.max.y + inimigo.position.y + 700; // Mesmo cálculo da área 2
                healthBarObj.position.y = heightOffset;
                inimigo.add(healthBarObj);
                inimigo.userData.healthBar = healthBar;
                
                // Configuração da caixa de colisão
                const boxSize = 6;
                const boxHeight = 8;
                const boxCenter = inimigo.position.clone();
                const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
                const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
                inimigo.userData.collisionBox = new THREE.Box3(min, max);
                
                // Configuração dos materiais
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
                console.error('Erro ao carregar o modelo GLB do Cacodemon da área 4:', erro);
            }
        );
    });
}

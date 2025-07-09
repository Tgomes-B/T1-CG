import * as THREE from 'three';
import { fadeOut } from './tiro.js';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

// Configurações do inimigo
const ENEMY_SEARCH_RAYS = 120; // 360° / 3
const ENEMY_DETECTION_RANGE = 50;
const ENEMY_SPEED = 0.05; // Aumente a velocidade

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
        loader.setMaterials(materials); // Aplica os materiais carregados
        loader.setPath(assetPath);
        loader.load(
            'skull.obj', // Use o nome do arquivo OBJ relativo ao assetPath
            (obj) => {
                obj.position.set(position.x, position.y, position.z);
                obj.scale.set(1, 1, 1); // Ajuste conforme necessário
                obj.name = "enemy";
                obj.userData.isEnemy = true;
                obj.userData.hp = 20;
                obj.userData.enemyType = "obj";
                obj.userData.fading = false;
                obj.userData.isCollidable = true;
                obj.userData.boundingBox = new THREE.Box3().setFromObject(obj);

                obj.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isEnemy = true;
                        child.userData.hp = obj.userData.hp;
                        child.userData.enemyRoot = obj;
                    }
                });

                obj.updateMatrixWorld(true);

                // Adicione o helper na cena, não como filho do obj
                const boxHelper = new THREE.BoxHelper(obj, 0x00ff00);
                obj.userData.boxHelper = boxHelper;
                if (obj.parent) {
                    obj.parent.add(boxHelper);
                } else {
                    // Adicione na cena depois de adicionar o obj
                    setTimeout(() => {
                        if (obj.parent) obj.parent.add(boxHelper);
                    }, 0);
                }

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
    boxHelper.position.set(position.x, position.y, position.z);
    enemy.name = "enemy";
    enemy.userData.isEnemy = true;
    return enemy;
}

/**
 * Atualiza o comportamento do inimigo
 */
export function updateEnemyBehavior(enemy, player, scene, delta) {
    const raycaster = new THREE.Raycaster();
    const enemyPos = enemy.position.clone();
    let playerDetected = false;
    
    // Verifica todas as direções
    for(const direction of searchDirections) {
        raycaster.set(enemyPos, direction.clone().normalize(), 0, ENEMY_DETECTION_RANGE);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if(intersects.length > 0) {
            const firstHit = intersects[0];
            
            // Verifica se é o jogador (câmera ou objeto do jogador)
            if(firstHit.object.isCamera || 
               firstHit.object.name === "player" ||
               firstHit.object.parent?.isCamera) {
                
                playerDetected = true;
                
                // Calcula direção normalizada para o jogador
                const moveDirection = new THREE.Vector3()
                    .subVectors(player.position, enemy.position)
                    .normalize();
                
                // Aplica movimento suavizado
                enemy.position.x += moveDirection.x * ENEMY_SPEED * delta * 60;
                enemy.position.z += moveDirection.z * ENEMY_SPEED * delta * 60;
                
                // Atualiza a rotação para olhar para o jogador
                enemy.lookAt(player.position);
                break;
            }
        }
        if (enemy.userData.hp !== undefined && enemy.userData.hp <= 0 && !enemy.userData.fading) {
            enemy.userData.fading = true;
            fadeOut(enemy, 500, () => {
                if (enemy.parent) enemy.parent.remove(enemy);
                if (enemy.userData.boxHelper && enemy.userData.boxHelper.parent) {
                    enemy.userData.boxHelper.parent.remove(enemy.userData.boxHelper);
                }
            });
        }
        if (enemy.userData.boxHelper) {
            enemy.userData.boxHelper.update();
        }
    }

    // Comportamento alternativo se não detectar o jogador
    if(!playerDetected) {
        // Adicione aqui patrulha ou comportamento ocioso
    }
}
import * as THREE from 'three';
import { OBJLoader } from '../build/jsm/loaders/OBJLoader.js';

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
export function loadEnemyOBJ(path, position = { x: 0, y: 2, z: 0 }, onLoad) {
    const loader = new OBJLoader();
    loader.load(
        path,
        (obj) => {
            obj.position.set(position.x, position.y, position.z);
            obj.name = "enemy";
            obj.userData.isEnemy = true;
            obj.userData.enemyType = "obj";
            if (onLoad) onLoad(obj);
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar modelo OBJ:', error);
        }
    );
}

export function createEnemy(position = { x: 0, y: 2, z: 0 }) {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    enemy.position.set(position.x, position.y, position.z);
    enemy.scale.set(0.015, 0.015, 0.015);
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
    }

    // Comportamento alternativo se não detectar o jogador
    if(!playerDetected) {
        // Adicione aqui patrulha ou comportamento ocioso
    }
}
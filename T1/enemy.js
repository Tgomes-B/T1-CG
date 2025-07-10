// enemy.js
import * as THREE from 'three';

// Configurações
const ENEMY_SEARCH_RAYS = 120;
const ENEMY_DETECTION_RANGE = 50;
const ENEMY_SPEED = 0.05;
const FOLLOW_DISTANCE = 30;
const GIVE_UP_DISTANCE = 50;
const GIVE_UP_DURATION = 10;

export function updateEnemyBehavior(enemy, player, scene, delta) {
    // Inicializar propriedades
    if (enemy.userData.giveUpTimer === undefined) {
        enemy.userData.giveUpTimer = GIVE_UP_DURATION;
        enemy.userData.isGivingUp = false;
    }
    
    // Calcular distância horizontal (ignorando altura)
    const playerPosXZ = new THREE.Vector2(player.position.x, player.position.z);
    const enemyPosXZ = new THREE.Vector2(enemy.position.x, enemy.position.z);
    const distance = playerPosXZ.distanceTo(enemyPosXZ);
    
    // Verificar detecção visual
    let playerDetected = false;
    const raycaster = new THREE.Raycaster();
    raycaster.set(enemy.position, player.position.clone().sub(enemy.position).normalize());
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        const firstHit = intersects[0];
        if (firstHit.object.isCamera || 
            firstHit.object.name === "player" || 
            firstHit.object.parent?.isCamera) {
            playerDetected = true;
        }
    }
    
    // Lógica de perseguição
    if (playerDetected && distance < FOLLOW_DISTANCE) {
        enemy.userData.giveUpTimer = GIVE_UP_DURATION;
        enemy.userData.isGivingUp = false;
        moveEnemyTowardsPlayer(enemy, player, scene, delta);
    } 
    else if (distance < GIVE_UP_DISTANCE) {
        if (enemy.userData.isGivingUp) {
            enemy.userData.isGivingUp = false;
            enemy.userData.giveUpTimer = GIVE_UP_DURATION;
        }
        moveEnemyTowardsPlayer(enemy, player, scene, delta);
    } 
    else if (distance > GIVE_UP_DISTANCE) {
        if (!enemy.userData.isGivingUp) {
            enemy.userData.isGivingUp = true;
            enemy.userData.giveUpTimer = GIVE_UP_DURATION;
        } else {
            enemy.userData.giveUpTimer -= delta;
            if (enemy.userData.giveUpTimer > 0) {
                moveEnemyTowardsPlayer(enemy, player, scene, delta);
            }
        }
    }
    
    // SOLUÇÃO REMOVIDA: Não forçar altura fixa
    // enemy.position.y = player.position.y - 2; // LINHA REMOVIDA
    
    // Debug visual
    debugEnemyPosition(enemy, player);
}

function moveEnemyTowardsPlayer(enemy, player, scene, delta) {
    // Calcular direção horizontal para o jogador
    const moveDirection = new THREE.Vector3(
        player.position.x - enemy.position.x,
        0, // Componente Y zerado (movimento vertical tratado em primeiraPessoa.js)
        player.position.z - enemy.position.z
    ).normalize();
    
    // Aplicar movimento horizontal
    enemy.position.x += moveDirection.x * ENEMY_SPEED * delta * 60;
    enemy.position.z += moveDirection.z * ENEMY_SPEED * delta * 60;
    
    // Orientação para o jogador (mantendo altura atual)
    const lookAtPosition = new THREE.Vector3(
        player.position.x,
        enemy.position.y, // Mantém altura atual
        player.position.z
    );
    enemy.lookAt(lookAtPosition);
}

// Função para debug visual
function debugEnemyPosition(enemy, player) {
    // Criar/atualizar uma linha que mostra a altura do inimigo
    if (!enemy.userData.debugLine) {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const geometry = new THREE.BufferGeometry();
        const points = [
            new THREE.Vector3(enemy.position.x, 0, enemy.position.z),
            new THREE.Vector3(enemy.position.x, 10, enemy.position.z)
        ];
        geometry.setFromPoints(points);
        enemy.userData.debugLine = new THREE.Line(geometry, material);
        scene.add(enemy.userData.debugLine);
    }
    
    // Atualizar posição da linha
    const points = [
        new THREE.Vector3(enemy.position.x, 0, enemy.position.z),
        new THREE.Vector3(enemy.position.x, 20, enemy.position.z)
    ];
    enemy.userData.debugLine.geometry.setFromPoints(points);
    enemy.userData.debugLine.geometry.attributes.position.needsUpdate = true;
    
    // Texto flutuante com a altura
    if (!enemy.userData.debugText) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = 'white';
        context.font = '48px Arial';
        context.fillText('DEBUG', 10, 50);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        enemy.userData.debugText = new THREE.Sprite(material);
        enemy.userData.debugText.scale.set(5, 2.5, 1);
        scene.add(enemy.userData.debugText);
    }
    
    // Atualizar texto
    enemy.userData.debugText.position.set(
        enemy.position.x,
        enemy.position.y + 3,
        enemy.position.z
    );
}
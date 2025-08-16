import * as THREE from 'three';

// Recebe uma lista de caixas de colisão (AABBs) para checar colisão
export function updatePatrolBehavior(obj, delta, scene, collisionBoxes = []) {
    if (!obj.userData.isEnemy || obj.userData.state !== "patrol") return;

    const isCacodemon = obj.userData.enemyType === "cacodemon";
    // Usa a área definida no userData (setada corretamente no inimigo.js)
    const patrolArea = obj.userData.patrolArea || 
        { min: new THREE.Vector3(115, 4, -215), max: new THREE.Vector3(235, 30, -95) };

    const currentTime = performance.now();
    const isInPatrolArea = isInsideArea(obj.position, patrolArea);

    // Checa colisão com qualquer AABB fornecida
    let collided = false;
    if (obj.userData.collisionBox && collisionBoxes.length > 0) {
        obj.userData.collisionBox.setFromCenterAndSize(
            obj.position,
            obj.userData.collisionBox.getSize(new THREE.Vector3())
        );
        for (const box of collisionBoxes) {
            if (obj.userData.collisionBox.intersectsBox(box)) {
                collided = true;
                break;
            }
        }
    }

    if (isInPatrolArea) {
        // Patrulha ativa dentro da área
        if (!obj.userData.patrolTarget || 
            obj.position.distanceTo(obj.userData.patrolTarget) < 5 ||
            currentTime - obj.userData.lastPatrolChange > 10000
        ) {
            // Para Cacodemons, adiciona variação vertical
            const yPos = isCacodemon ? 
                patrolArea.min.y + Math.random() * (patrolArea.max.y - patrolArea.min.y) :
                patrolArea.min.y + Math.random() * 2;
            obj.userData.patrolTarget = new THREE.Vector3(
                patrolArea.min.x + Math.random() * (patrolArea.max.x - patrolArea.min.x),
                yPos,
                patrolArea.min.z + Math.random() * (patrolArea.max.z - patrolArea.min.z)
            );
            obj.userData.lastPatrolChange = currentTime;
        }
        // Se colidiu, muda imediatamente para uma nova direção aleatória
        if (collided) {
            obj.userData.patrolDirection = new THREE.Vector3(
                Math.random() * 2 - 1,
                isCacodemon ? (Math.random() * 0.5 - 0.25) : 0,
                Math.random() * 2 - 1
            ).normalize();
            obj.userData.lastDirectionChange = currentTime;
            // Cancela o alvo atual para forçar alternância de modo
            obj.userData.patrolTarget = null;
            moveInDirection(obj, obj.userData.patrolDirection, delta, isCacodemon ? 1.5 : 1, scene, collisionBoxes);
            return;
        }
        moveToTarget(obj, obj.userData.patrolTarget, delta, isCacodemon ? 2 : 3, scene, collisionBoxes);
    } else {
        // Patrulha passiva fora da área
        if (!obj.userData.lastDirectionChange || 
            currentTime - obj.userData.lastDirectionChange > 5000 ||
            collided // Se colidiu, força nova direção
        ) {
            // Para Cacodemons, adiciona componente vertical
            const verticalComponent = isCacodemon ? (Math.random() * 0.5 - 0.25) : 0;
            obj.userData.patrolDirection = new THREE.Vector3(
                Math.random() * 2 - 1,
                verticalComponent,
                Math.random() * 2 - 1
            ).normalize();
            obj.userData.lastDirectionChange = currentTime;
        }
        moveInDirection(obj, obj.userData.patrolDirection, delta, isCacodemon ? 1.5 : 1, scene, collisionBoxes);
    }
}

function isInsideArea(position, area) {
    return (
        position.x >= area.min.x &&
        position.x <= area.max.x &&
        position.z >= area.min.z &&
        position.z <= area.max.z &&
        position.y >= area.min.y &&
        position.y <= area.max.y
    );
}

// As funções moveToTarget e moveInDirection devem ser implementadas conforme o padrão do seu projeto.
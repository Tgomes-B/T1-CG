import * as THREE from 'three';

export function updatePatrolBehavior(obj, delta, scene) {
    if (!obj.userData.isEnemy || obj.userData.state !== "patrol") return;

    // Priority for escape state - use escapeDirection if in escaping state
    if (obj.userData.patrolState === 'escaping') {
        if (obj.userData.escapeDirection) {
            // Use a higher speed for escape movement
            moveInDirection(obj, obj.userData.escapeDirection, delta, 4, scene);
        }
        return; // Skip normal patrol logic while escaping
    }

    const patrolArea = obj.userData.patrolArea;
    const currentTime = performance.now();
    const isInArea1 = isInsideArea1(obj.position, patrolArea);

    if (isInArea1) {
        // Active patrol inside area 1
        if (!obj.userData.patrolTarget || 
            obj.position.distanceTo(obj.userData.patrolTarget) < 5 ||
            currentTime - obj.userData.lastPatrolChange > 10000) {
            
            obj.userData.patrolTarget = getRandomPointInArea(patrolArea);
            obj.userData.lastPatrolChange = currentTime;
        }
        
        moveToTarget(obj, obj.userData.patrolTarget, delta, 3, scene);
    } else {
        // Passive patrol outside area 1
        if (!obj.userData.lastDirectionChange || 
            currentTime - obj.userData.lastDirectionChange > 5000) {
            
            obj.userData.patrolDirection = obj.userData.patrolDirection ?? new THREE.Vector3();
            obj.userData.patrolDirection.set(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
            
            obj.userData.lastDirectionChange = currentTime;
        }
        
        moveInDirection(obj, obj.userData.patrolDirection, delta, 1, scene);
    }
}

function isInsideArea1(position, area) {
    return (
        position.x >= area.min.x &&
        position.x <= area.max.x &&
        position.z >= area.min.z &&
        position.z <= area.max.z &&
        position.y >= area.min.y &&
        position.y <= area.max.y
    );
}

function getRandomPointInArea(area) {
    return new THREE.Vector3(
        area.min.x + Math.random() * (area.max.x - area.min.x),
        area.min.y + Math.random() * 2, // Small height variation
        area.min.z + Math.random() * (area.max.z - area.min.z)
    );
}

function moveToTarget(obj, target, delta, speed, scene) {
    const dir = target.clone().sub(obj.position).normalize();
    moveInDirection(obj, dir, delta, speed, scene);
}

function moveInDirection(obj, direction, delta, speed, scene) {
    // Log de depuração
    console.log('moveInDirection start', obj.userData.patrolState, 'has collisionBox:', !!obj.userData.collisionBox);
    
    // Garante que a caixa de colisão existe
    if (!obj.userData.collisionBox) {
        obj.userData.collisionBox = new THREE.Box3().setFromObject(obj);
        console.log('Created new collision box');
    }

    // Inicializa o estado de patrulha se não estiver definido
    if (obj.userData.patrolState === undefined) {
        obj.userData.patrolState = 'patrolling';
        obj.userData.escapeSteps = 0;
        obj.userData.maxEscapeSteps = 180; // Increased for more reliable escape
        obj.userData.desiredEscapeDistance = 10; // Distance to move away before returning to patrol
        obj.userData.safePatrolDistance = 12; // Minimum distance for new patrol targets from obstacles
    }

    // Obtém todos os objetos colidíveis na cena
    const collidables = [];
    findCollidables(scene, collidables);
    const validCollidables = collidables.filter(o => 
        o !== obj && o.userData?.collisionBox && o.userData.isCollidable
    );
    
    // Garante um limite mínimo de movimento (evita micro-movimentos)
    const moveSpeed = Math.max(speed * delta, 0.04);
    const moveVec = direction.clone().multiplyScalar(moveSpeed);
    
    const tempBox = obj.userData.collisionBox.clone();
    
    if (obj.userData.patrolState === 'escaping') {
        // Log de depuração
        console.log('ESCAPING - escapeSteps:', obj.userData.escapeSteps);
        
        // Sempre usa a direção de fuga para movimento
        if (obj.userData.escapeDirection) {
            // Cria um novo vetor de movimento na direção de fuga com impulso inicial mais forte
            const escapeMove = obj.userData.escapeDirection.clone().multiplyScalar(moveSpeed * 3); // Stronger initial push
            
            // Atualiza a direção para combinar com a direção de fuga
            direction.copy(obj.userData.escapeDirection);
            
            // Verifica colisões na direção de fuga, ignorando o último objeto colidido
            tempBox.copy(obj.userData.collisionBox);
            tempBox.translate(escapeMove);
            
            const escapeCollision = validCollidables.some(o => 
                o !== obj && 
                o !== obj.userData.lastCollided &&  // Ignore the last collided object
                o.userData?.collisionBox && 
                tempBox.intersectsBox(o.userData.collisionBox)
            );
            
            // Log de depuração
            console.log('Escape move:', escapeMove.length(), 'collision:', escapeCollision, 'lastCollided:', obj.userData.lastCollided?.name);
            
            // Move se não houver colisão na direção de fuga
            if (!escapeCollision) {
                obj.position.add(escapeMove);
                // Atualiza a direção para combinar com o movimento
                direction.copy(obj.userData.escapeDirection);
                
                // Rastreia a distância percorrida durante a fuga
                if (!obj.userData.escapeStartPos) {
                    obj.userData.escapeStartPos = obj.position.clone();
                    console.log('Fuga iniciada de:', obj.userData.escapeStartPos);
                }
                
                // Calcula a distância percorrida desde o início da fuga
                const distanceMoved = obj.position.distanceTo(obj.userData.escapeStartPos);
                
                // Se estávamos presos em algo mas já nos movemos o suficiente, limpa lastCollided
                if (obj.userData.lastCollided && distanceMoved > obj.userData.minEscapeDistance) {
                    console.log('Limpou lastCollided após mover', distanceMoved.toFixed(2), 'unidades');
                    obj.userData.lastCollided = null;
                }
            } else if (obj.userData.lastCollided) {
                // Se ainda está colidindo com o mesmo objeto, aplica um pequeno empurrão
                const pushOut = obj.userData.escapeDirection.clone().multiplyScalar(0.2);
                console.log('Aplicando empurrão de:', pushOut.length());
                obj.position.add(pushOut);
            }
            
            // Atualiza o moveVec para qualquer movimento subsequente neste frame
            moveVec.copy(escapeMove);
        }
        
        obj.userData.escapeSteps--;
        
        // Atualiza a rotação para olhar na direção do movimento
        if (direction.lengthSq() > 0.001) {
            obj.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // --- Novo término de fuga: baseado em distância mínima ou tempo limite ---
        const startPos = obj.userData.escapeStartPos;
        const desiredEscapeDistance = obj.userData.desiredEscapeDistance ?? 10;
        const distanceMoved = startPos ? obj.position.distanceTo(startPos) : 0;
        const reachedEscapeDistance = distanceMoved >= desiredEscapeDistance;

        // Prefere terminar a fuga quando a distância desejada for atingida; caso contrário, usa escapeSteps
        if (reachedEscapeDistance || obj.userData.escapeSteps <= 0) {
            console.log('Finishing escape. distanceMoved:', distanceMoved.toFixed(2), 'targetDist:', desiredEscapeDistance);

            // Limpa o estado temporário
            obj.userData.escapeStartPos = null;

            // Define tempo de espera para evitar reativação imediata
            if (obj.userData.lastCollided) {
                obj.userData.lastCollisionCooldown = performance.now() + 1200; // 1.2s cooldown
            }

            // Se em patrulha ativa (com patrolTarget), gera um novo alvo longe do último colidido
            if (obj.userData.patrolTarget) {
                const safeMinDist = obj.userData.safePatrolDistance ?? Math.max(desiredEscapeDistance, 6);
                const area = obj.userData.patrolArea;
                let tries = 0;
                let newTarget;
                do {
                    newTarget = getRandomPointInArea(area);
                    tries++;
                } while (obj.userData.lastCollided &&
                         newTarget.distanceTo(obj.userData.lastCollided.position) < safeMinDist &&
                         tries < 25);

                obj.userData.patrolTarget = newTarget;
                obj.userData.lastPatrolChange = performance.now();
                console.log('New patrol target chosen away from collider. Tries:', tries);
            } else {
                // Patrulha passiva: atualiza a direção de patrulha
                let newAngle;
                if (obj.userData.lastEscapeDirection) {
                    const escapeAngle = Math.atan2(
                        obj.userData.lastEscapeDirection.x,
                        obj.userData.lastEscapeDirection.z
                    );
                    newAngle = escapeAngle + Math.PI/2 + (Math.random() * Math.PI - Math.PI/2);
                } else {
                    newAngle = Math.random() * Math.PI * 2;
                }
                const newDirection = new THREE.Vector3(
                    Math.sin(newAngle), 
                    0, 
                    Math.cos(newAngle)
                ).normalize();
                
                obj.userData.patrolDirection = newDirection;
                obj.userData.lastDirectionChange = performance.now();
                console.log('New patrol direction after escape:', newDirection.toArray());
            }

            // Reinicia o estado de fuga
            obj.userData.patrolState = 'patrolling';
            delete obj.userData.escapeDirection;
        }
    } else {
        // Movimento normal de patrulha com detecção de colisão
        tempBox.translate(moveVec);
        const collides = validCollidables.some(o => 
            tempBox.intersectsBox(o.userData.collisionBox)
        );
        
        if (!collides) {
            // Sem colisão, move normalmente
            obj.position.add(moveVec);
            obj.userData.lastCollisionTime = 0;
            
            // Atualiza a rotação para olhar na direção do movimento
            if (direction.lengthSq() > 0.001) {
                obj.rotation.y = Math.atan2(direction.x, direction.z);
            }
        } else {
            // Trata colisão
            const now = performance.now();
            const timeSinceLastCollision = now - (obj.userData.lastCollisionTime || 0);
            
            // Verifica tempo de espera com último colidido (se existir)
            if (obj.userData.lastCollisionCooldown && now < obj.userData.lastCollisionCooldown) {
                // Ainda em tempo de espera - ignora colisão
                console.log('Colisão ignorada devido ao cooldown com lastCollided');
            } else if (!obj.userData.lastCollisionTime || timeSinceLastCollision > 1000) {
                // Encontra o objeto com que colidimos
                const collided = validCollidables.find(o => 
                    o.userData?.collisionBox && tempBox.intersectsBox(o.userData.collisionBox)
                );
                
                // Armazena o objeto com que colidimos
                if (collided) {
                    obj.userData.lastCollided = collided;
                    console.log('Colidiu com:', collided.name || 'desconhecido');
                }
                
                // Calcula direção de fuga (180 graus da direção atual)
                const escapeDirection = direction.clone().multiplyScalar(-1);
                
                // Armazena direção de fuga para movimento consistente
                obj.userData.escapeDirection = escapeDirection;
                obj.userData.lastEscapeDirection = escapeDirection.clone();
                
                // Reseta a posição de início da fuga
                obj.userData.escapeStartPos = null;
                
                // Atualiza rotação imediatamente
                obj.rotation.y = Math.atan2(escapeDirection.x, escapeDirection.z);
                
                // Inicia sequência de fuga
                obj.userData.patrolState = 'escaping';
                obj.userData.escapeSteps = obj.userData.maxEscapeSteps;
                obj.userData.lastCollisionTime = now;
                
                // Atualiza o vetor de movimento atual para combinar com a direção de fuga
                moveVec.copy(escapeDirection).multiplyScalar(moveSpeed * 1.5);
                
                // Cria novo vetor de movimento na direção de fuga
                direction.copy(escapeDirection);
                
                // Move imediatamente na nova direção
                obj.position.add(moveVec);
                
                // Atualiza posição da caixa de colisão
                obj.userData.collisionBox.setFromObject(obj);
            }
        }
    }
    
    // Atualiza a caixa de colisão após o movimento
    if (obj.userData.collisionBox) {
        obj.userData.collisionBox.setFromObject(obj);
    }
}

// Função helper para encontrar objetos colidíveis na cena
function findCollidables(object, collidables = []) {
    if (object.userData?.isCollidable) {
        collidables.push(object);
    }
    
    if (object.children) {
        object.children.forEach(child => findCollidables(child, collidables));
    }
    
    return collidables;
}


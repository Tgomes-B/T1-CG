import * as THREE from 'three';

export function updatePatrolBehavior(obj, delta, scene) {
    if (!obj.userData.isEnemy || obj.userData.state !== "patrol") return;

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
            
            obj.userData.patrolDirection = new THREE.Vector3(
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
    const moveSpeed = speed * delta;
    const moveVec = direction.clone().multiplyScalar(moveSpeed);
    
    // Check collision
    const collidables = [];
    findCollidables(scene, collidables);
    const validCollidables = collidables.filter(o => 
        o !== obj && o.userData?.collisionBox && o.userData.isCollidable
    );
    
    const tempBox = obj.userData.collisionBox?.clone();
    if (!tempBox) return;
    
    tempBox.translate(moveVec);
    const collides = validCollidables.some(o => 
        tempBox.intersectsBox(o.userData.collisionBox)
    );
    
    if (!collides) {
        obj.position.add(moveVec);
    } else {
        // Change direction on collision
        if (obj.userData.patrolTarget) {
            obj.userData.patrolTarget = null; // Get new target in next update
        } else {
            direction.multiplyScalar(-1);
        }
    }
    
    // Update rotation
    if (direction.lengthSq() > 0.001) {
        const yaw = Math.atan2(direction.x, direction.z);
        obj.rotation.y = yaw;
    }
}

// Helper function to find collidable objects in the scene
function findCollidables(object, collidables = []) {
    if (object.userData?.isCollidable) {
        collidables.push(object);
    }
    
    if (object.children) {
        object.children.forEach(child => findCollidables(child, collidables));
    }
    
    return collidables;
}

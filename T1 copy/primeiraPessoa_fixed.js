// Código anterior...
                    // Adiciona zigue-zague lateral
                    let perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
                    let zigzag = perp.multiplyScalar(Math.sin(performance.now() * 0.003) * 1.5 * obj.userData.zigzagDir);
                    let move = dir.clone().multiplyScalar(5 * delta).add(zigzag.multiplyScalar(delta));
                    
                    // Testa colisão
                    const collidables = [];
                    findCollidables(scene, collidables);
                    const validCollidables = collidables.filter(o => o !== obj && o.userData.collisionBox && o.userData.isCollidable);
                    const tempBox = obj.userData.collisionBox.clone();
                    tempBox.translate(move);
                    
                    // Verifica colisão com objetos e com o chão
                    let collides = validCollidables.some(o => tempBox.intersectsBox(o.userData.collisionBox));
                    let belowGround = obj.position.y + move.y < 0; // Verifica se está passando do chão
                    
                    if (!collides) {
                        // Aplica o movimento
                        obj.position.add(move);
                        
                        // Garante que não passe do chão
                        if (belowGround) {
                            obj.position.y = 0;
                            // Se estava caindo, zera a velocidade vertical
                            if (obj.userData.velocity) {
                                obj.userData.velocity.y = 0;
                            }
                        }
                    }
                    
                    // Rotação suave
                    if (dir.lengthSq() > 0.001) {
                        let yaw = Math.atan2(dir.x, dir.z);
                        obj.rotation.y += (yaw - obj.rotation.y) * 0.18;
                    }
// Código posterior...

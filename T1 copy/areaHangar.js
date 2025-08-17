import * as THREE from 'three';
import {
    texHangarArea3,
    texHangarArea3Normal,
    texHangarArea3Displacement
}from './Loaders.js';
import {loadOBJFile}from './airplane.js'
import { CSG } from '../libs/other/CSGMesh.js'  
import{colisionChave, criaChave}from './areaChave.js'
import { criaSoldier } from './Soldier.js';
import { HealthBar } from './healthbar.js';

let loader = new THREE.TextureLoader();

export function constroiHangar(scene){
    // Geometria do hangar
    const hangarGeometry = new THREE.CylinderGeometry(50, 50, 100, 32, 1, true, 0, Math.PI);
    // Material da lateral do hangar
    const lateralMaterial = new THREE.MeshStandardMaterial({
        map: texHangarArea3,
        displacementMap: texHangarArea3Displacement,
        displacementScale: 1,
        normalMap: texHangarArea3Normal,
        color: 0xffffff,
        roughness: 5,
        side: THREE.DoubleSide
    });

    let hangar = new THREE.Mesh(hangarGeometry, lateralMaterial);
    hangar.position.set(0, 0, 0);
    hangar.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    hangar.name = 'hangar';

    scene.add(rodape(49.9));
    scene.add(rodape(-49.9));
    paredeHangar(scene);
    portas(scene, hangar, 12.5, -12.5); // Passa scene e hangar como parâmetros

    let chaveAzul = criaChave('blue');
    chaveAzul.position.set(2, 60, 0);

    // Torna invisível e não coletável
    chaveAzul.traverse(obj => {
        if (obj.isMesh) {   
            obj.visible = false;
        }
    });
    chaveAzul.userData.isCollectable = false;

    const mesh = colisionChave();
    mesh.position.set(115, 0, 155);
    mesh.name = "coletaAzul";
    
    hangar.add(chaveAzul);
    scene.add(mesh);
    
    scene.userData.chaveAzul = chaveAzul;
    
    // Adiciona 3 soldados maiores dentro do hangar
    const soldierPositions = [
        new THREE.Vector3(190, 5, 140),  // Esquerda (10 unidades à frente)
        new THREE.Vector3(190, 5, 150),  // Centro (10 unidades à frente)
        new THREE.Vector3(190, 5, 160)   // Direita (10 unidades à frente)
    ];

    soldierPositions.forEach((pos, index) => {
        const soldier = criaSoldier(pos, scene);
        if (soldier && soldier.sprite) {
            // Aumenta o tamanho dos soldados (tamanho original é 3, então 3 * 40 = 120)
            soldier.sprite.scale.set(120, 120, 120);
            
            // Define as propriedades do inimigo
            const enemy = soldier.sprite;
            enemy.userData.hp = 50;
            enemy.userData.maxHp = 50;
            enemy.userData.isEnemy = true;
            enemy.userData.enemyType = "soldier";
            enemy.userData.fading = false;
            enemy.userData.name = `soldier_${index}`;
            
            // Define a caixa de colisão para detecção de colisão
            enemy.userData.collisionBox = new THREE.Box3().setFromObject(enemy);
            
            // Trata danos
            enemy.userData.takeDamage = function(amount) {
                if (this.userData.hp <= 0) return; // Já está morto
                
                // Reduz o dano para fazer a barra de vida diminuir mais suavemente
                const smoothAmount = Math.max(1, Math.ceil(amount / 3));
                this.userData.hp = Math.max(0, this.userData.hp - smoothAmount);
                
                if (this.userData.healthBar) {
                    // Atualiza suavemente a barra de vida
                    const currentHp = this.userData.healthBar.getCurrentHp();
                    const targetHp = this.userData.hp;
                    const diff = currentHp - targetHp;
                    
                    if (diff > 0) {
                        // Diminui gradualmente a barra de vida
                        const step = Math.max(1, Math.ceil(diff / 3));
                        const animateHealthBar = () => {
                            if (currentHp <= targetHp) return;
                            this.userData.healthBar.update(currentHp - step);
                            if (currentHp - step > targetHp) {
                                requestAnimationFrame(animateHealthBar);
                            }
                        };
                        requestAnimationFrame(animateHealthBar);
                    } else {
                        this.userData.healthBar.update(targetHp);
                    }
                }
                
                // Feedback visual em caso de colisão
                this.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (this.material) this.material.color.setHex(0xffffff);
                }, 100);
                
                // Toca som de colisão
                const hitSound = document.getElementById('SoldierHitSound');
                if (hitSound) {
                    hitSound.currentTime = 0;
                    hitSound.volume = 0.5;
                    hitSound.play();
                }
                
                // Verifica se está morto
                if (this.userData.hp <= 0) {
                    this.userData.die();
                }
            };
            
            // Trata morte
            enemy.userData.die = function() {
                if (this.userData.isDying) return;
                this.userData.isDying = true;
                
                // Toca som de morte
                const deathSound = document.getElementById('SoldierDeathSound');
                if (deathSound) {
                    deathSound.currentTime = 0;
                    deathSound.volume = 0.7;
                    deathSound.play();
                }
                
                // Inicia a animação de fade out
                this.userData.fadeOut = 1.0;
                
                // Remove a barra de vida
                if (this.userData.healthBar) {
                    this.userData.healthBar.remove();
                }
                
                // Inicia a animação de morte
                if (soldier.actions && soldier.actions.Die) {
                    soldier.actions.Die.play();
                }
                
                // Remove do cenário após a animação
                setTimeout(() => {
                    if (this.parent) {
                        this.parent.remove(this);
                    }
                    
                    // Remove do array de inimigos se existir
                    if (scene.userData.enemies) {
                        const index = scene.userData.enemies.indexOf(this);
                        if (index > -1) {
                            scene.userData.enemies.splice(index, 1);
                        }
                    }
                }, 2000); // Combine com a duração da animação de morte
            };
            
            // Adiciona ao array de inimigos se existir
            if (scene.userData.enemies) {
                scene.userData.enemies.push(enemy);
            }
        }
    });

    // Carrega o avião depois que o hangar estiver completamente construído
    loadOBJFile({x: 7, y: 0, z: 0}, hangar, (aviao) => {
        aviao.rotation.z = -Math.PI / 2;
        aviao.rotation.x = Math.PI / 2; // Ajusta a rotação do avião
    });
    return hangar;
}

function rodape(posZ){
    const rodapeGeometry = new THREE.BoxGeometry(101, 10, 1);
    const rodapeMaterial = [
        setMaterial('./images/Textures/Area3/muroLado.png', 1, 4),
        setMaterial('./images/Textures/Area3/muroLado.png', 1, 4),
        setMaterial('./images/Textures/Area3/muroLado.png', 1, 4),
        setMaterial('./images/Textures/Area3/muroLado.png', 1, 4),
        setMaterial('./images/Textures/Area3/Muro.png', 15, 4),// z+
        setMaterial('./images/Textures/Area3/Muro.png', 15, 4) //z-
    ];

    const rodape = new THREE.Mesh(rodapeGeometry, rodapeMaterial);
    rodape.position.set(175, 5, 155+posZ); 
    rodape.castShadow = true;
    rodape.receiveShadow = true;

    rodape.userData.isCollidable = true;
    
    // Atualiza a matriz do mundo antes de criar a collision box
    rodape.updateMatrixWorld(true);
    rodape.userData.collisionBox = new THREE.Box3().setFromObject(rodape);
    return rodape;
}

function paredeHangar(scene){
    let boxCSG = CSG.fromMesh(new THREE.Mesh(new THREE.BoxGeometry(55, 30, 30)));
    const paredeGeometry = new THREE.CylinderGeometry(50.25, 50.25, 0.5, 32, 1, false, 0, Math.PI);
    const paredeMaterial = new THREE.MeshStandardMaterial({
        map: texHangarArea3,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    const fundo = new THREE.Mesh(paredeGeometry, paredeMaterial);
    

    let portaCSG = CSG.fromMesh(fundo);
    portaCSG = portaCSG.subtract(boxCSG); // Subtrai um cubo para criar a porta
    let parede = CSG.toMesh(portaCSG, new THREE.Matrix4());

    fundo.position.set(175+50, 0, 155);
    fundo.castShadow = true;
    fundo.receiveShadow = true;
    fundo.userData.isCollidable = true;
    fundo.userData.collisionBox = new THREE.Box3().setFromObject(fundo);
    fundo.name = 'parede';

    parede.position.set(125, 0, 155);
    parede.material = fundo.material;
    parede.userData.isCollidable = true;
    parede.userData.collisionBox = new THREE.Box3().setFromObject(parede);
    parede.name = 'parede';

    fundo.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    parede.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    
    fundo.userData.collisionBox.setFromObject(fundo);
    parede.userData.collisionBox.setFromObject(parede);
    scene.add(fundo);
    scene.add(parede);
}

export function movePortaoH(porta1, porta2, frontRay){
    if (!porta1 || !porta2) return;
    
    // vê se as posições iniciais foram definidas
    let intersects = [];
    let intersects2 = [];
    
    if (porta1.userData.zInicial === undefined) {
        porta1.userData.zInicial = porta1.position.z;
        porta1.userData.abrindo = false;
    }
    if (porta2.userData.zInicial === undefined) {
        porta2.userData.zInicial = porta2.position.z;
        porta2.userData.abrindo = false;
    }
    
    // Verifica intersecção com as portas
    intersects = frontRay.intersectObject(porta1, true);
    intersects2 = frontRay.intersectObject(porta2, true);
    
    if (intersects.length > 0 || intersects2.length > 0) {
        porta1.userData.abrindo = true;
        porta2.userData.abrindo = true;
        
        const portaSound = document.getElementById('PortaSound');
        if (portaSound) {
            portaSound.currentTime = 0;
            portaSound.play();
        }
    }
    // se a porta 1 está abrindo, a porta 2 acompanha pro lado oposto
    if (porta1.userData.abrindo) {
        const Alvo1 = porta1.userData.zInicial + 15;
        const Alvo2 = porta2.userData.zInicial - 15;
        if (Math.abs(porta1.position.z - Alvo1) > 0.1) {
            porta1.position.z = THREE.MathUtils.lerp(porta1.position.z, Alvo1, 0.03);
            porta2.position.z = THREE.MathUtils.lerp(porta2.position.z, Alvo2, 0.03);
        } else {
            porta1.position.z = Alvo1;
            porta2.position.z = Alvo2;
            porta1.userData.abrindo = false;
            porta2.userData.abrindo = false;
        }
        // Atualiza as collision boxes após o movimento
        porta1.updateMatrixWorld(true);
        porta2.updateMatrixWorld(true);
        if (porta1.userData.collisionBox) {
            porta1.userData.collisionBox.setFromObject(porta1);
        }
        if (porta2.userData.collisionBox) {
            porta2.userData.collisionBox.setFromObject(porta2);
        }
    }
}

function portas(scene, hangar, pos1, pos2){
    const portaGeometry = new THREE.BoxGeometry(30, 1, 25);
    let cor = new THREE.MeshLambertMaterial({ color: 'rgba(255, 255, 255, 1)' });
    const portaMaterial = [
        setMaterial('./images/Textures/Area3/portaoLado.jpg', 1, 1),
        setMaterial('./images/Textures/Area3/portaoLado.jpg', 1, 1),
        setMaterial('./images/Textures/Area3/portao.jpg', 1, 1),
        setMaterial('./images/Textures/Area3/portao.jpg', 1, 1),
        setMaterial('./images/Textures/Area3/portaoLado.jpg', 1, 1),
        setMaterial('./images/Textures/Area3/portaoLado.jpg', 1, 1),
    ];

    const porta1 = new THREE.Mesh(portaGeometry, portaMaterial);
    const porta2 = new THREE.Mesh(portaGeometry, portaMaterial);
    
    // Calcula posições globais baseadas na posição do hangar
    const hangarPos = hangar.position;
    porta1.position.set(175 - 50, 15, 155 + pos1);
    porta2.position.set(175 - 50, 15, 155 + pos2);
    
    // Aplica a mesma rotação do hangar às portas
    porta1.rotation.z = hangar.rotation.z;
    porta2.rotation.z = hangar.rotation.z;

    porta1.castShadow = true;
    porta1.receiveShadow = true;
    porta1.userData.isCollidable = true;
    porta1.name = 'portaHangar';

    porta2.castShadow = true;
    porta2.receiveShadow = true;
    porta2.userData.isCollidable = true;
    porta2.name = 'portaHangar';

    // Atualiza matrizes antes de criar collision boxes
    porta1.updateMatrixWorld(true);
    porta2.updateMatrixWorld(true);
    
    porta1.userData.collisionBox = new THREE.Box3().setFromObject(porta1);
    porta2.userData.collisionBox = new THREE.Box3().setFromObject(porta2);

    // Adiciona as portas diretamente à scene
    scene.add(porta1);
    scene.add(porta2);
}

function setMaterial(file, repeatU = 1, repeatV = 1, color = 'rgb(255,255,255)'){
   let mat = new THREE.MeshBasicMaterial({ map: loader.load(file), color:color});
      mat.map.colorSpace = THREE.SRGBColorSpace;
   mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
   mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
   mat.map.repeat.set(repeatU,repeatV); 
   return mat;
}




import * as THREE from 'three';
import { criaBlocoChave, criaChave } from './areaChave.js';
import { moveAnimate } from './primeiraPessoa.js';

const SHOW_COLLISION_BOXES = false;

export function setupArea2(area, scene) {
    // Cria torres na área elevada
    const base = 10;
    const alturas = [22, 28, 19, 16, 27, 25, 21, 30, 18, 24, 29, 20, 17, 23, 26];
    const espacoX = 90 / 4;
    const espacoZ4 = (120 - base*4)/3;
    const espacoZ3 = (120 - base*3)/4;
    const iniZ4 = -60 + base/2;
    const iniZ3 = -60 + base / 2 + espacoZ3;
    const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const torresLinha = [4, 3, 4, 3];
    let z = 0;

        // Função para criar uma torre com colisão
        function createTower(x, y, z, width, height, depth) {
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const tower = new THREE.Mesh(geometry, material.clone());
            
            tower.position.set(x, y, z);
            tower.name = "torre";
            tower.castShadow = true;
            tower.receiveShadow = true;
            tower.userData.isCollidable = true;
        
            // Cria caixa de colisão em coordenadas globais
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const halfDepth = depth / 2;
            const min = new THREE.Vector3(x - halfWidth, y - halfHeight, z - halfDepth);
            const max = new THREE.Vector3(x + halfWidth, y + halfHeight, z + halfDepth);
        
            // Visualização de depuração das caixas de colisão
            if (SHOW_COLLISION_BOXES) {
                const boxHelper = new THREE.Box3Helper(tower.userData.collisionBox, 0x00ff00);
                scene.add(boxHelper);
                tower.userData.boxHelper = boxHelper;
            }
        
            return tower;
        }

        let i = 0;
    for (let row = 0; row < torresLinha.length; row++) {
        for (let col = 0; col < torresLinha[row]; col++) {
            if (i >= alturas.length) break;
            const altura = alturas[i];
            
            if(torresLinha[row] === 4){
                z = iniZ4 + (espacoZ4 + base) * col;
            }
            else if(torresLinha[row] === 3){
                z = iniZ3 + (espacoZ3 + base) * col;
            } else {
                break;
            }
            
            const x = 30 + row * espacoX;
            const y = 5 + altura / 2;

            const geometry = new THREE.BoxGeometry(base, altura, base);  
            const torre = new THREE.Mesh(geometry, material);

            torre.position.set(x, 5 + altura / 2, z);
            torre.name = "torre";
            torre.userData.isCollidable = true;
            torre.castShadow = true;
            torre.receiveShadow = true;

            const min = new THREE.Vector3(
                torre.position.x - base / 2,
                torre.position.y - altura / 2,
                torre.position.z - base / 2
            );
            const max = new THREE.Vector3(
                torre.position.x + base / 2,
                torre.position.y + altura / 2,
                torre.position.z + base / 2
            );
            torre.userData.collisionBox = new THREE.Box3(min, max);
            torre.userData.isCollidable = true;
            torre.castShadow = true;
            torre.receiveShadow = true;
            
            area.add(torre);
            
            torre.updateMatrixWorld(true);
            torre.userData.collisionBox = new THREE.Box3().setFromObject(torre);
            torre.userData.isCollidable = true;

            // Tratamento especial para a torre com a chave
            if(i === 6) { 
                let chave = criaChave('yellow');
                chave.position.set(x, 7, z);
                chave.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                area.add(chave);
                torre.translateY(10);
            }
            
            i++; // Move to next tower
        }
    }
    let bloco = criaBlocoChave();
    bloco.name = 'bloco';
    //bloco.position.set(100, 2, 0);
    bloco.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    scene.add(bloco);
    elevador(scene);
}

function elevador(scene) {
    const portaGeometry = new THREE.BoxGeometry(5, 10, 20);
    const portaMaterial = new THREE.MeshLambertMaterial({ color: 'red' });
    const portaMesh = new THREE.Mesh(portaGeometry, portaMaterial);

    const elevadorGeometry = new THREE.BoxGeometry(15, 10, 20);
    const elevadorMaterial = new THREE.MeshLambertMaterial({ color: 'blue' });
    const elevadorMesh = new THREE.Mesh(elevadorGeometry, elevadorMaterial);

    portaMesh.position.set(117.5, 5, 0);
    elevadorMesh.position.set(127.5, 5, 0);

    elevadorMesh.name = 'elevador';
    portaMesh.name = 'porta';
    
    // Enable shadows
    portaMesh.castShadow = true;
    portaMesh.receiveShadow = true;
    portaMesh.userData.isCollidable = true;
    portaMesh.userData.descendo = false; 
    elevadorMesh.castShadow = true;
    elevadorMesh.receiveShadow = true;
    elevadorMesh.userData.isCollidable = true;

    scene.add(elevadorMesh);
    scene.add(portaMesh);

    elevadorMesh.userData.isCollidable = true;
    portaMesh.userData.isCollidable = true;
}

export function movePorta(porta, frontRay){
    // Só permite descer se a chave foi colocada no bloco
    const bloco = scene.getObjectByName('bloco');
    if (!bloco || !bloco.userData.chaveColocada) return;

    // Abaixa a porta ao detectar o raycast
    const intersects = frontRay.intersectObject(porta, false);
    if (intersects.length > 0 && !porta.userData.descendo) {
        if (porta.userData.yInicial === undefined) {
            porta.userData.yInicial = porta.position.y;
        }
        porta.userData.descendo = true;
    }
    // Se a porta está marcada para descer, faz a animação até o alvo
    if (porta.userData.descendo) {
        const yAlvo = porta.userData.yInicial - 11; 
        if (porta.position.y > yAlvo) {
            porta.position.y = THREE.MathUtils.lerp(porta.position.y, yAlvo, 0.1);
        } else {
            porta.position.y = yAlvo;
            porta.userData.descendo = false;
        }
        porta.userData.collisionBox.setFromObject(porta);
    }
}

export function moveElevador(elevador, downRay, frontRay){
    // Raycast frontal para descer
    const frontIntersects = frontRay.intersectObject(elevador, false);
    if (frontIntersects.length > 0 && !elevador.userData.descendo && !elevador.userData.subindo) {
        if (elevador.userData.yInicial === undefined) {
            elevador.userData.yInicial = elevador.position.y;
        }
        elevador.userData.descendo = true;
        elevador.userData.subindo = false;
    }

    // Raycast para baixo para subir
    const downIntersects = downRay.intersectObject(elevador, false);
    if (downIntersects.length > 0 && !elevador.userData.subindo && !elevador.userData.descendo) {
        if (elevador.userData.yInicial === undefined) {
            elevador.userData.yInicial = elevador.position.y;
        }
        elevador.userData.subindo = true;
        elevador.userData.descendo = false;
    }

    // Animação de descida
    if (elevador.userData.descendo) {
        const yAlvo = elevador.userData.yInicial - 11; // ajuste a altura de descida
        if (elevador.position.y > yAlvo + 0.1) {
            elevador.position.y = THREE.MathUtils.lerp(elevador.position.y, yAlvo, 0.1);
            elevador.userData.collisionBox.setFromObject(elevador);
        } else {
            elevador.position.y = yAlvo;
            elevador.userData.descendo = false;
        }
    }

    // Animação de subida
    if (elevador.userData.subindo) {
        const yAlvo = elevador.userData.yInicial;
        if (elevador.position.y < yAlvo - 0.1) {
            elevador.position.y = THREE.MathUtils.lerp(elevador.position.y, yAlvo, 0.1);
            elevador.userData.collisionBox.setFromObject(elevador);
        } else {
            elevador.position.y = yAlvo;
            elevador.userData.subindo = false;
        }
    }
}
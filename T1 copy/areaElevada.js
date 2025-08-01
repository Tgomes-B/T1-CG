import * as THREE from 'three';
import { criaBlocoChave, criaChave } from './areaChave.js';
import { moveAnimate } from './primeiraPessoa.js';

const SHOW_COLLISION_BOXES = false;

// Função para criar uma torre
function createTower(x, y, z, width, height, depth, material) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const tower = new THREE.Mesh(geometry, material.clone());
    tower.position.set(x+120, y, z);
    tower.name = "torre";
    tower.castShadow = true;
    tower.receiveShadow = true;
    tower.userData.isCollidable = true;
    tower.userData.collisionBox = new THREE.Box3().setFromObject(tower);
    return tower;
}

// Função para adicionar visualização da caixa de colisão
function addCollisionHelper(obj, parent) {
    if (SHOW_COLLISION_BOXES && obj.userData.collisionBox) {
        const boxHelper = new THREE.Box3Helper(obj.userData.collisionBox, 0xff00ff);
        parent.add(boxHelper);
        obj.userData.boxHelper = boxHelper;
    }
}

// Função para criar todas as torres na área elevada
function createTowers(scene) {
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
    let i = 0;
    let torres = [];

    for (let row = 0; row < torresLinha.length; row++) {
        for (let col = 0; col < torresLinha[row]; col++) {
            if (i >= alturas.length) break;
            const altura = alturas[i];

            if (torresLinha[row] === 4) {
                z = iniZ4 + (espacoZ4 + base) * col;
            } else if (torresLinha[row] === 3) {
                z = iniZ3 + (espacoZ3 + base) * col;
            } else {
                break;
            }

            const x = 30 + row * espacoX;
            const y = 5 + altura / 2;

            const torre = createTower(x, y, z, base, altura, base, material);
            scene.add(torre);
            addCollisionHelper(torre, scene);
            torres.push(torre);

            // Torre especial com chave
            if (i === 6) {
                let chave = criaChave('yellow');
                chave.position.set(0, (altura -25), 0);
                chave.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                torre.add(chave); 
                torre.userData.collisionBox.setFromObject(torre); 
            
                // Para ver só a chave, deixe a torre visível e torne o material transparente:
                // torre.material.transparent = true;
                //torre.material.opacity = 0.1; // ou 0 para totalmente invisível
            
                // Se torre.visible = false, a chave também ficará invisível!
                // torre.visible = false; // <-- remova ou comente esta linha
            
                scene.userData.torreEspecial = torre;
                scene.userData.chaveAmarela = chave;
            }

            i++;
        }
    }
    return torres;
}

// Função para criar o bloco da chave
function createBlocoChave(scene) {
    let Bluck = 1
    let bloco = criaBlocoChave(Bluck);
    bloco.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    scene.add(bloco);
    return bloco;
}

// Função para criar o elevador e porta
function createElevador(scene) {
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

    portaMesh.castShadow = true;
    portaMesh.receiveShadow = true;
    portaMesh.userData.isCollidable = true;
    portaMesh.userData.descendo = false;
    portaMesh.userData.collisionBox = new THREE.Box3().setFromObject(portaMesh);

    elevadorMesh.castShadow = true;
    elevadorMesh.receiveShadow = true;
    elevadorMesh.userData.isCollidable = true;
    elevadorMesh.userData.collisionBox = new THREE.Box3().setFromObject(elevadorMesh);

    scene.add(elevadorMesh);
    scene.add(portaMesh);

    addCollisionHelper(portaMesh, scene);
    addCollisionHelper(elevadorMesh, scene);

    return { elevador: elevadorMesh, porta: portaMesh };
}

// Função principal para montar a área elevada
export function setupArea2(scene) {
    createTowers(scene);
    createBlocoChave(scene);
    createElevador(scene);
}

export function setupCacodemonElimination(scene) {
    let cacodemons = [];
    scene.traverse(obj => {
        if (obj.userData?.isEnemy && obj.name === "cacodemon") cacodemons.push(obj);
    });
    scene.userData.cacodemons = cacodemons;
    console.log(cacodemons.length);
    scene.userData.eliminados = 0;
    cacodemons.forEach(caco => {
        caco.userData.eliminate = () => {
            if (caco.userData._eliminated) return;
            caco.userData._eliminated = true;
            scene.remove(caco);
            scene.userData.eliminados++;
            if (
                scene.userData.eliminados === cacodemons.length &&
                !scene.userData.animandoTorre &&
                !scene.userData.torreEspecialAnimada
            ) {
                scene.userData.animandoTorre = true;
                scene.userData.torreEspecialAnimada = true;
                scene.userData.tempoAnimacaoTorre = 0;
                scene.userData.torreEspecialY0 = scene.userData.torreEspecial.position.y;
                scene.userData.torreEspecialY1 = scene.userData.torreEspecial.position.y + 10;
                scene.userData.chaveAmarelaY0 = scene.userData.chaveAmarela.position.y;
                scene.userData.chaveAmarelaY1 = scene.userData.chaveAmarela.position.y - 8;
            }
        };
    });
}

// (As funções movePorta e moveElevador permanecem iguais)
export function movePorta(porta, frontRay){
    const bloco = porta.parent.getObjectByName('bloco1');
    if (!bloco || !bloco.userData.chaveColocada) return;

    const intersects = frontRay.intersectObject(porta, false);
    if (intersects.length > 0 && !porta.userData.descendo) {
        if (porta.userData.yInicial === undefined) {
            porta.userData.yInicial = porta.position.y;
        }
        porta.userData.descendo = true;
    }
    if (porta.userData.descendo) {
        const yAlvo = porta.userData.yInicial - 11;
        if (porta.position.y > yAlvo) {
            porta.position.y = THREE.MathUtils.lerp(porta.position.y, yAlvo, 0.03);
        } else {
            porta.position.y = yAlvo;
            porta.userData.descendo = false;
        }
        porta.userData.collisionBox.setFromObject(porta);
    }
}

export function moveElevador(elevador, downRay, frontRay){
    const frontIntersects = frontRay.intersectObject(elevador, false);
    if (frontIntersects.length > 0 && !elevador.userData.descendo && !elevador.userData.subindo) {
        if (elevador.userData.yInicial === undefined) {
            elevador.userData.yInicial = elevador.position.y;
        }
        elevador.userData.descendo = true;
        elevador.userData.subindo = false;
    }

    const downIntersects = downRay.intersectObject(elevador, false);
    if (downIntersects.length > 0 && !elevador.userData.subindo && !elevador.userData.descendo) {
        if (elevador.userData.yInicial === undefined) {
            elevador.userData.yInicial = elevador.position.y;
        }
        elevador.userData.subindo = true;
        elevador.userData.descendo = false;
    }

    if (elevador.userData.descendo) {
        const yAlvo = elevador.userData.yInicial - 11;
        if (elevador.position.y > yAlvo + 0.1) {
            elevador.position.y = THREE.MathUtils.lerp(elevador.position.y, yAlvo, 0.01);
            elevador.userData.collisionBox.setFromObject(elevador);
        } else {
            elevador.position.y = yAlvo;
            elevador.userData.descendo = false;
        }
    }

    if (elevador.userData.subindo) {
        const yAlvo = elevador.userData.yInicial;
        if (elevador.position.y < yAlvo - 0.1) {
            elevador.position.y = THREE.MathUtils.lerp(elevador.position.y, yAlvo, 0.01);
            elevador.userData.collisionBox.setFromObject(elevador);
        } else {
            elevador.position.y = yAlvo;
            elevador.userData.subindo = false;
        }
    }
}
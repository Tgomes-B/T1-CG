import * as THREE from 'three';
import { criaBlocoChave, criaChave } from './areaChave.js';

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

    let i = 0;
    for (let row = 0; row < torresLinha.length; row++) {
        for (let col = 0; col < torresLinha[row]; col++) {
            if (i >= alturas.length) break;
            const altura = alturas[i++];
            if(torresLinha[row] == 4){
                z = iniZ4 + (espacoZ4 + base) * col;
            }
            else if(torresLinha[row] == 3){
                z = iniZ3 + (espacoZ3 + base) * col;
            }else{
                break;
            }
            
            let x = 30 + row * espacoX;
            const geometry = new THREE.BoxGeometry(base, altura, base);  
            const torre = new THREE.Mesh(geometry, material);

            torre.position.set(x, 5 + altura / 2, z);
            torre.name = "torre";
            torre.userData.isCollidable = true;
            torre.castShadow = true;
            torre.receiveShadow = true;

            area.add(torre);
            if(i == 6){
                let chave = criaChave('yellow');
                chave.position.set(x, 9, z);
                chave.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                area.add(chave);
                torre.translateY(10);
            }
        }
    }
    let bloco = criaBlocoChave();
    bloco.name = 'bloco';
    bloco.position.set(100, 2, 0);
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
    elevadorMesh.castShadow = true;
    elevadorMesh.receiveShadow = true;

    scene.add(elevadorMesh);
    scene.add(portaMesh);
    //movimentoElevador(elevadorMesh, portaMesh);
    elevadorMesh.userData.isCollidable = true;
    portaMesh.userData.isCollidable = true;
}

function movimentoElevador(elevadorMesh, portaMesh) {
    // Animação do elevador e da porta
    const downRay = new THREE.Raycaster(
        playerObj.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        4);
    const portaColision = scene.children.filter(obj =>
        obj.userData && obj.userData.isCollidable && obj.name === 'elevador'
    );

    const portaIntersects = downRay.intersectObjects(portaColision, false);

    


}
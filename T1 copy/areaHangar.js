import * as THREE from 'three';
import {
    texHangarArea3,
    texHangarArea3Normal,
    texHangarArea3Displacement
}from './Loaders.js';
import {loadOBJFile}from './airplane.js'
import { CSG } from '../libs/other/CSGMesh.js'  
import{criaChave}from './areaChave.js'

let loader = new THREE.TextureLoader();

export function constroiHangar(scene){
    const hangarGeometry = new THREE.CylinderGeometry(50, 50, 100, 32, 1, true, 0, Math.PI);
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

    hangar.add(rodape(49.9));
    hangar.add(rodape(-49.9));
    paredeHangar(hangar);
    portas(scene, hangar, 12.5, -12.5); // Passa scene e hangar como parâmetros
    let chaveAzul = criaChave('blue');
    chaveAzul.position.set(2, 60, 0);
    
    hangar.add(chaveAzul);

    // Carrega o avião depois que o hangar estiver completamente construído
    loadOBJFile({x: 7, y: 0, z: 0}, hangar, (aviao) => {
        //aviao.rotation.x = -Math.PI / 2;
        aviao.rotation.z = - Math.PI / 2;
        aviao.rotation.x =  Math.PI / 2; // Ajusta a rotação do avião
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
    rodape.rotation.z = Math.PI / 2;
    rodape.position.set(5, -0.5, posZ); // o X e o Y estão invertidos
    rodape.castShadow = true;
    rodape.receiveShadow = true;

    rodape.userData.isCollidable = true;
    
    // Atualiza a matriz do mundo antes de criar a collision box
    rodape.updateMatrixWorld(true);
    rodape.userData.collisionBox = new THREE.Box3().setFromObject(rodape);

    return rodape;
}

function paredeHangar(hangar){
    let boxCSG = CSG.fromMesh(new THREE.Mesh(new THREE.BoxGeometry(55, 30, 30)));
    const paredeGeometry = new THREE.CylinderGeometry(50.25, 50.25, 0.5, 32, 1, false, 0, Math.PI);
    const paredeMaterial = new THREE.MeshStandardMaterial({
        map: texHangarArea3,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    const fundo = new THREE.Mesh(paredeGeometry, paredeMaterial);
    fundo.position.set(0, 0, 0);

    let portaCSG = CSG.fromMesh(fundo);
    portaCSG = portaCSG.subtract(boxCSG); // Subtrai um cubo para criar a porta
    let parede = CSG.toMesh(portaCSG, new THREE.Matrix4());

    fundo.position.set(0, -49, 0);
    fundo.castShadow = true;
    fundo.receiveShadow = true;
    fundo.userData.isCollidable = true;
    fundo.userData.collisionBox = new THREE.Box3().setFromObject(fundo);
    fundo.name = 'parede';

    parede.position.set(0, 49, 0);
    parede.material = fundo.material;
    parede.userData.isCollidable = true;
    parede.userData.collisionBox = new THREE.Box3().setFromObject(parede);
    parede.name = 'parede';


    fundo.userData.collisionBox.setFromObject(fundo);
    parede.userData.collisionBox.setFromObject(parede);
    hangar.add(fundo);
    hangar.add(parede);
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




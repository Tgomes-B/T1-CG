import * as THREE from 'three';


let loader = new THREE.TextureLoader();

export function constroiHangar(){
    const hangarGeometry = new THREE.CylinderGeometry(50, 50, 100, 32, 1, false, 0, Math.PI);

    const hangarMaterial = [
        setMaterial('./images/Textures/Area 3/telha.jpg', 4, 4), // parte de cima
        setMaterial('./images/Textures/Area 3/parteInterna.jpg', 6, 6), // parte de traz
        new THREE.MeshLambertMaterial({ color: 'rgba(200, 200, 200, 1)' }) // parte da frente
    ];

    const hangar = new THREE.Mesh(hangarGeometry, hangarMaterial);
    hangar.position.set(0, 5, 0);
    hangar.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    return hangar;
}


function setMaterial(file, repeatU = 1, repeatV = 1, color = 'rgb(255,255,255)'){
   let mat = new THREE.MeshBasicMaterial({ map: loader.load(file), color:color});
      mat.map.colorSpace = THREE.SRGBColorSpace;
   mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
   mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
   mat.map.repeat.set(repeatU,repeatV); 
   return mat;
}
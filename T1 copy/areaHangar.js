import * as THREE from 'three';


let loader = new THREE.TextureLoader();

export function constroiHangar(){
    const hangarGeometry = new THREE.CylinderGeometry(50, 50, 100, 32, 1, false, 0, Math.PI);

    const hangarMaterial = [
        setMaterial('./images/Textures/Area3/telha.jpg', 4, 4), // parte de cima
        new THREE.MeshLambertMaterial({ color: 'rgba(255, 29, 29, 1)' }), // parte da frente
        new THREE.MeshLambertMaterial({ color: 'rgba(255, 41, 41, 1)' }) // parte da frente
    ];

    let hangar = new THREE.Mesh(hangarGeometry, hangarMaterial);
    hangar.position.set(0, 0, 0);
    hangar.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    hangar.castShadow = true;
    hangar.receiveShadow = true;


    hangar.add(rodape(50));
    hangar.add(rodape(-50));

    portas(hangar, 12.5, -12.5);

    return hangar;
}




function rodape(posZ){
    const rodapeGeometry = new THREE.BoxGeometry(99, 10, 2);
    const rodapeMaterial = new THREE.MeshLambertMaterial({ color: 'rgba(254, 6, 6, 1)' });
    const rodape = new THREE.Mesh(rodapeGeometry, rodapeMaterial);
    rodape.rotation.z = Math.PI / 2;
    rodape.position.set(5, 0, posZ); // o X e o Y estão invertidos
    
    rodape.castShadow = true;
    rodape.receiveShadow = true;

    return rodape;
}

export function movePorta(porta1, porta2){
    // vê se as posições iniciais foram definidas
        if (porta1.userData.zInicial === undefined) {
            porta1.userData.zInicial = porta1.position.z;
        }
        if (porta2.userData.zInicial === undefined) {
            porta2.userData.zInicial = porta2.position.z;
        }
        porta1.userData.abrindo = true;
    
    // se a porta 1 está abrindo, a porta 2 acompanha pro lado oposto
    if (porta1.userData.abrindo) {
        const Alvo1 = porta1.userData.zInicial + 15;
        const Alvo2 = porta2.userData.zInicial - 15;
        if (porta1.position.z > Alvo1) {
            porta1.position.z = THREE.MathUtils.lerp(porta1.position.z, Alvo1, 0.03);
            porta2.position.z = THREE.MathUtils.lerp(porta2.position.z, Alvo2, 0.03);
        } else {
            porta1.position.z = Alvo1;
            porta1.userData.abrindo = false;
        }
        porta1.userData.collisionBox.setFromObject(porta1);
        porta2.userData.collisionBox.setFromObject(porta2);
    }
}

function portas(hangar, pos1, pos2){
    const portaGeometry = new THREE.BoxGeometry(30, 1, 25);
    const portaMaterial = new THREE.MeshLambertMaterial({ color: 'rgba(200, 200, 200, 1)' });

    const porta1 = new THREE.Mesh(portaGeometry, portaMaterial);
    const porta2 = new THREE.Mesh(portaGeometry, portaMaterial);
    
    porta1.position.set(15, 50, pos1);
    porta2.position.set(15, 50, pos2);

    porta1.castShadow = true;
    porta1.receiveShadow = true;
    porta1.userData.isCollidable = true;
    porta1.userData.collisionBox = new THREE.Box3().setFromObject(porta1);
    porta1.name = 'porta1';


    porta2.castShadow = true;
    porta2.receiveShadow = true;
    porta2.userData.isCollidable = true;
    porta2.userData.collisionBox = new THREE.Box3().setFromObject(porta2);
    porta2.name = 'porta2';

    hangar.add(porta1);
    hangar.add(porta2);
}

function setMaterial(file, repeatU = 1, repeatV = 1, color = 'rgb(255,255,255)'){
   let mat = new THREE.MeshBasicMaterial({ map: loader.load(file), color:color});
      mat.map.colorSpace = THREE.SRGBColorSpace;
   mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
   mat.map.minFilter = mat.map.magFilter = THREE.LinearFilter;
   mat.map.repeat.set(repeatU,repeatV); 
   return mat;
}
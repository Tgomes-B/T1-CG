import * as THREE from 'three';



export function constroiHangar(){
    const hangarGeometry = new THREE.CylinderGeometry(50, 50, 100, 32, 1, false, 0, Math.PI);
    const hangarMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(200, 200, 200)' });
    const hangar = new THREE.Mesh(hangarGeometry, hangarMaterial);
    hangar.position.set(0, 0, 0);
    hangar.rotation.z = Math.PI / 2; // Rotaciona para ficar horizontal
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    return hangar;
}

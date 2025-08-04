import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

// --- Texturas da área 1 ---
export const texArea1 = textureLoader.load('./images/Textures/area1/romanGround.png');
texArea1.wrapS = THREE.RepeatWrapping;
texArea1.wrapT = THREE.RepeatWrapping;
texArea1.repeat.set(10, 10);
texArea1.offset.set(0, 0); 

// --- Texturas da área 2 (topo e base) ---
export const texArea2Top = textureLoader.load('./images/Textures/area2/ground/Metal.png');
export const texarea2Alt = textureLoader.load('./images/Textures/area2/ground/Metal.png');
export const texArea2Metallic = textureLoader.load('./images/Textures/area2/ground/MetalMetallic.png');
export const texArea2Roughness = textureLoader.load('./images/Textures/area2/ground/MetalRoughness.png');

// --- Texturas das torres (laterais) ---
export const texTowerRight = textureLoader.load('./images/Textures/area2/laterals/sides.jpg');
export const texTowerLeft  = textureLoader.load('./images/Textures/area2/laterals/sides.jpg');
export const texTowerFront = textureLoader.load('./images/Textures/area2/laterals/sides.jpg');
export const texTowerBack = textureLoader.load('./images/Textures/area2/laterals/sides.jpg');
export const texTowerTop = textureLoader.load('./images/Textures/area2/laterals/top.jpg');
texTowerTop.wrapT = THREE.RepeatWrapping;
texTowerTop.repeat.set(1, 1);

export const texArea2Faces = [
    textureLoader.load('./images/Textures/area2/ground/Metal.png'), // right
    textureLoader.load('./images/Textures/area2/ground/Metal.png'), // left
    textureLoader.load('./images/Textures/area2/ground/Metal.png'), // top
    textureLoader.load('./images/Textures/area2/ground/Metal.png'), // bottom
    textureLoader.load('./images/Textures/area2/ground/Metal.png'), // front
    textureLoader.load('./images/Textures/area2/ground/Metal.png')  // back
];

// --- Pilares da area 1 ---
export const texPillarArea1 = textureLoader.load('./images/Textures/area1/romanPillar.png');
texPillarArea1.wrapS = THREE.RepeatWrapping;
texPillarArea1.wrapT = THREE.RepeatWrapping;
texPillarArea1.repeat.set(1,1);

export const texPillarArea1Displacement = textureLoader.load('./images/Textures/area1/romanPilar_heigh.png');
texPillarArea1Displacement.wrapS = THREE.RepeatWrapping;
texPillarArea1Displacement.wrapT = THREE.RepeatWrapping;
texPillarArea1.repeat.set(1,1);
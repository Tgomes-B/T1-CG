import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

// --- Texturas da área 1 ---
export const texArea1 = textureLoader.load('./images/Textures/area1/romanGround.png');
texArea1.wrapS = THREE.RepeatWrapping;
texArea1.wrapT = THREE.RepeatWrapping;
texArea1.repeat.set(10, 10);
texArea1.offset.set(0, 0); 
export const texArea1Wall = textureLoader.load('./images/Textures/area1/wallArea1.png')
texArea1Wall.wrapS = THREE.RepeatWrapping;
texArea1Wall.wrapS = THREE.RepeatWrapping;
texArea1Wall.repeat.set(10,1);
texArea1Wall.offset.set(0, 0); 
export const texDisc = textureLoader.load('./images/Textures/area1/romanPilarDisc.png');
export const texDiscTop = textureLoader.load('./images/Textures/area1/PilarDiscTop.png');
export const texPreda = textureLoader.load('../assets/textures/porcelanatoC.png');

export const texPillarArea1Normal = textureLoader.load('./images/Textures/area1/nomalPilar.png');
texPillarArea1Normal.wrapS = THREE.RepeatWrapping;
texPillarArea1Normal.wrapT = THREE.RepeatWrapping;
texPillarArea1Normal.repeat.set(1, 1);

// --- Texturas da área 2 (topo e base) ---
export const texArea2Top = textureLoader.load('./images/Textures/area2/ground/Metal.png');
export const texarea2Alt = textureLoader.load('./images/Textures/area2/ground/Metal.png');
export const texArea2Metallic = textureLoader.load('./images/Textures/area2/ground/MetalMetallic.png');
export const texArea2Roughness = textureLoader.load('./images/Textures/area2/ground/MetalRoughness.png');
export const texArea2Wall = textureLoader.load('./images/Textures/area2/laterals/area2Wall.png');
texArea2Wall.wrapT = THREE.RepeatWrapping;
texArea2Wall.wrapS = THREE.RepeatWrapping;
texArea2Wall.repeat.set(10, 1);

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
// --- Texturas elevador ---
export const texElevadorTop = textureLoader.load('./images/Textures/area2/elevadorTop.jpeg');
export const texElevadorSides = textureLoader.load('./images/Textures/area2/elevadorSides.jpeg');

// --- Textura portão ---

export const texGate = textureLoader.load('./images/Textures/area2/ScifiGate.jpeg');

// --- Pilares da area 1 ---
export const texPillarArea1 = textureLoader.load('./images/Textures/area1/romanPillar.png');
texPillarArea1.wrapS = THREE.RepeatWrapping;
texPillarArea1.wrapT = THREE.RepeatWrapping;
texPillarArea1.repeat.set(1,1);

export const texPillarArea1Displacement = textureLoader.load('./images/Textures/area1/romanPilar_height_contraste_extremo.png');
texPillarArea1Displacement.wrapS = THREE.RepeatWrapping;
texPillarArea1Displacement.wrapT = THREE.RepeatWrapping;
texPillarArea1.repeat.set(1, 1);

// --- Blocos pra chaves ---
export const texBlockTop = textureLoader.load('./images/Textures/blocos/blockTop.png');
export const texBlockSide = textureLoader.load('./images/Textures/blocos/blockSide.png');
export const texBlockSide2 = textureLoader.load('./images/Textures/blocos/blockSide2.png');

// --- Parte de baixo da area ---
export const texBottom = textureLoader.load('./images/Textures/areasBottom.png');
texBottom.wrapS = THREE.RepeatWrapping;
texBottom.wrapT = THREE.RepeatWrapping;
texBottom.repeat.set(1, 1);

export const texArea4Ground = textureLoader.load('./images/Textures/area4/Floor4.png');
texArea4Ground.wrapS = THREE.RepeatWrapping;
texArea4Ground.wrapT = THREE.RepeatWrapping;
texArea4Ground.repeat.set(15, 15);

export const texPortalBlue = textureLoader.load('./images/Textures/area4/portal_ring_blue.png');
export const texPortalOrange = textureLoader.load('./images/Textures/area4/portal_ring_orange.png');
export const texPortalRed = textureLoader.load('./images/Textures/area4/portal_ring_red.png');

export const texParedeArea4 = textureLoader.load('./images/Textures/area4/Wall4.jpg');
texParedeArea4.wrapS = THREE.RepeatWrapping;
texParedeArea4.wrapT = THREE.RepeatWrapping;
texParedeArea4.repeat.set(1, 1);
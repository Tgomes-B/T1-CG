import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { texPortalBlue, texPortalOrange } from './Loaders.js';
import * as THREE from 'three';

let prediosData = [];
const ringMaterialBlue = new THREE.MeshBasicMaterial({
    map: texPortalBlue,
    transparent: true,
    side: THREE.DoubleSide
});
const ringMaterialOrange = new THREE.MeshBasicMaterial({
    map: texPortalOrange,
    transparent: true,
    side: THREE.DoubleSide
});

/**
 * Carrega 8 prédios (Predio1.glb e predio3.glb) em posições variadas, simulando cidade/quarteirões.
 * Todos ficam acima do plano da área 4.
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} area4
 *
 */
export function adicionaPrediosArea4(scene, area4,onAllLoaded) {
    const loader = new GLTFLoader();
    const alturaBase = area4.position.y + 5; // 5 unidades acima do plano da área 4
    prediosData = [
        { file: 'predio1.glb', pos: { x: -60, y: alturaBase, z: -60 }, scale: 0.7 },
        { file: 'predio2.glb', pos: { x: -40, y: alturaBase +15, z: -20 }, scale: 0.8 },
        { file: 'predio1.glb', pos: { x: -65, y: alturaBase, z: 25 }, scale: 0.6 },
        { file: 'predio2.glb', pos: { x: -35, y: alturaBase +17, z: 60 }, scale: 0.9 },
        { file: 'predio2.glb', pos: { x: 40, y: alturaBase +12.5, z: -50 }, scale: 0.7 },
        { file: 'predio1.glb', pos: { x: 60, y: alturaBase, z: -10 }, scale: 0.8 },
        { file: 'predio2.glb', pos: { x: 35, y: alturaBase +10, z: 35 }, scale: 0.6 },
        { file: 'predio1.glb', pos: { x: 55, y: alturaBase, z: 70 }, scale: 0.9 },
        { file: 'predio1.glb', pos: { x: 80, y: alturaBase, z: -80 }, scale: 0.75 },
        { file: 'predio2.glb', pos: { x: -30, y: alturaBase + 16.5, z: 47}, scale: 0.85 }
    ];

    let loaded = 0;

    function addPortais() {
        // --- Portal Azul ---
        const ringGeometry = new THREE.PlaneGeometry(4, 6);
        const ringMeshBlue = new THREE.Mesh(ringGeometry, ringMaterialBlue);
        ringMeshBlue.position.set(area4.position.x -30 - 0.05, area4.position.y +5, area4.position.z + 105);
        ringMeshBlue.scale.set(1, 2.2, 1);  
        ringMeshBlue.rotation.y = 0;
        ringMeshBlue.name = 'portalBlue';
        scene.add(ringMeshBlue);
    
        const centerMaterialBlue = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7 // deixa o centro translúcido
        });
        const centerGeometry = new THREE.CircleGeometry(1.8, 64);
        const centerMeshBlue = new THREE.Mesh(centerGeometry, centerMaterialBlue);
        centerMeshBlue.position.set(area4.position.x-30, area4.position.y +5, area4.position.z + 105- 0.05);
        centerMeshBlue.scale.set(1, 2.7, 1);
        scene.add(centerMeshBlue);
    
        // --- Portal Laranja ---
        const ringMeshOrange = new THREE.Mesh(ringGeometry, ringMaterialOrange);
        ringMeshOrange.position.set(area4.position.x , area4.position.y +5, area4.position.z - 54);
        ringMeshOrange.scale.set(1, 2.2, 1);
        ringMeshOrange.rotation.y = Math.PI;
        ringMeshOrange.name = 'portalOrange';
        scene.add(ringMeshOrange);
    
        const centerMaterialOrange = new THREE.MeshBasicMaterial({
            color: 0xffbb33,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const centerMeshOrange = new THREE.Mesh(centerGeometry, centerMaterialOrange);
        centerMeshOrange.position.set(area4.position.x, area4.position.y +5, area4.position.z - 54 + 0.05);
        centerMeshOrange.scale.set(1, 2.7, 1);
        scene.add(centerMeshOrange);
    }

    prediosData.forEach((predio,idx) => {
        loader.load('./images/Textures/area4/' + predio.file, (gltf) => {
            const object = gltf.scene;
            object.position.copy(area4.position);
            object.position.x += predio.pos.x;
            object.position.y = predio.pos.y;
            object.position.z += predio.pos.z;
            object.name = 'predio_' + loaded; 
            object.scale.set(predio.scale, predio.scale, predio.scale);

            if (idx === prediosData.length - 1) {
                object.rotation.y = Math.PI / 2; // 90 graus
            }

            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(object);
            

            loaded++;
            if (loaded === prediosData.length && typeof onAllLoaded === "function") {
                onAllLoaded();
                addPortais();
            }
        });
    });
}

export function checaTeleportePortais(playerObj, portalBlue, portalOrange, predioColiders) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, 2, 0.3)
    );
    const portalBlueBox = new THREE.Box3().setFromObject(portalBlue);
    const portalOrangeBox = new THREE.Box3().setFromObject(portalOrange);

    function destinoLivre(destino) {
        const destinoBox = playerBox.clone();
        destinoBox.translate(destino.clone().sub(playerObj.position));
        return !predioColiders.some(box => box.intersectsBox(destinoBox));
    }

    // Calcula posição à frente do portal de destino
    function frenteDoPortal(portal) {
        // Normal do plano do portal (eixo Z local)
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(portal.quaternion);
        // Desloca 2 unidades à frente do portal
        return portal.position.clone().add(normal.multiplyScalar(2));
    }

    // Azul -> Laranja
    if (portalBlueBox.intersectsBox(playerBox)) {
        const destino = frenteDoPortal(portalOrange);
        if (destinoLivre(destino)) playerObj.position.copy(destino);
    }
    // Laranja -> Azul
    if (portalOrangeBox.intersectsBox(playerBox)) {
        const destino = frenteDoPortal(portalBlue);
        if (destinoLivre(destino)) playerObj.position.copy(destino);
    }
}

export function getPredioColiders(area4, predios) {
    // Retorna um array de Box3 para cada prédio
    return predios.map(predio => {
        const pos = {
            x: area4.position.x + predio.pos.x,
            y: predio.pos.y,
            z: area4.position.z + predio.pos.z
        };
        // Ajuste o tamanho conforme necessário
        const size = new THREE.Vector3(10 * predio.scale, 30 * predio.scale, 10 * predio.scale);
        const min = new THREE.Vector3(
            pos.x - size.x / 2,
            pos.y,
            pos.z - size.z / 2
        );
        const max = new THREE.Vector3(
            pos.x + size.x / 2,
            pos.y + size.y,
            pos.z + size.z / 2
        );
        return new THREE.Box3(min, max);
    });
}

export function getPredioColidersFromScene(scene) {
    // Filtra objetos com nome 'predio_' e gera Box3 para cada
    return scene.children
        .filter(obj => obj.name && obj.name.startsWith('predio_'))
        .map(obj => {
            // Usa bounding box do objeto 3D real
            return new THREE.Box3().setFromObject(obj);
        });
}

export function checaColisaoPredios(playerObj, predioColiders) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, 2, 0.3)
    );
    return predioColiders.some(box => box.intersectsBox(playerBox));
}
export { prediosData };
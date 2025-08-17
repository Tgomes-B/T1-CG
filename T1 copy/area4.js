import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { texPortalBlue, texPortalOrange,texPortalRed, texParedeArea4 } from './Loaders.js';
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
const ringMaterialRed = new THREE.MeshBasicMaterial({
    map: texPortalRed ,
    transparent: true,
    side: THREE.DoubleSide
})

/**
 * Carrega 8 prédios (Predio1.glb e predio3.glb) em posições variadas, simulando cidade/quarteirões.
 * Todos ficam acima do plano da área 4.
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} area4
 *
 */
export function adicionaPrediosArea4(scene, area4,controls,onAllLoaded) {
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
            object.userData.isCollidable = true;
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
                if (window.camera && window.renderer) {
                    const posInicial = window.camera.position.clone();
                    const lookInicial = window.camera.getWorldDirection(new THREE.Vector3()).clone();
            
                    window.camera.position.set(area4.position.x, area4.position.y + 10, area4.position.z + 10);
                    window.camera.lookAt(area4.position.x, area4.position.y + 5, area4.position.z);
                    console.log('prewarm');
            
                    window.renderer.render(scene, window.camera);
            
                    window.camera.position.copy(posInicial);
                    window.camera.lookAt(posInicial.x + lookInicial.x, posInicial.y + lookInicial.y, posInicial.z + lookInicial.z);
                }
            
                // Reposiciona o jogador para a posição inicial
                if (controls && controls.getObject) {
                    controls.getObject().position.set(10, 7, 1); // posição inicial do seu jogo
                }

                onAllLoaded();
                addPortais();
                criaPortalVermelhoArea4(scene, area4);
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

export function criaParedesArea4(scene, area4) {
    const largura = 190;
    const altura = 60;
    const espessura = 4;
    const material = new THREE.MeshLambertMaterial({ 
        map: texParedeArea4, 
        side: THREE.DoubleSide 
    });
    
    // Norte (Z+)
    const paredeNorte = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, espessura),
        material
    );
    paredeNorte.position.set(area4.position.x, area4.position.y + altura / 2, area4.position.z + 155 / 2 + 79.5);
    paredeNorte.userData.isCollidable = true;
    paredeNorte.userData.altura = altura;
    paredeNorte.castShadow = true;
    paredeNorte.receiveShadow = true;
    scene.add(paredeNorte);

    // Sul (Z-)
    const paredeSul = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, espessura),
        material
    );
    paredeSul.position.set(area4.position.x, area4.position.y + altura / 2, area4.position.z - 155 / 2 - 79.5);
    paredeSul.userData.isCollidable = true;
    paredeSul.userData.altura = altura;
    paredeSul.castShadow = true;
    paredeSul.receiveShadow = true;
    scene.add(paredeSul);
    
    // Leste (X+)
    const paredeLeste = new THREE.Mesh(
        new THREE.BoxGeometry(espessura, altura, 310),
        material
    );
    paredeLeste.position.set(area4.position.x + largura / 2, area4.position.y + altura / 2, area4.position.z);
    paredeLeste.userData.isCollidable = true;
    paredeLeste.userData.altura = altura;
    paredeLeste.castShadow = true;
    paredeLeste.receiveShadow = true;
    scene.add(paredeLeste);
    
    // Oeste (X-)
    const paredeOeste = new THREE.Mesh(
        new THREE.BoxGeometry(espessura, altura, 310),
        material
    );
    paredeOeste.position.set(area4.position.x - largura / 2, area4.position.y + altura / 2, area4.position.z);
    paredeOeste.userData.isCollidable = true;
    paredeOeste.userData.altura = altura;
    paredeOeste.castShadow = true;
    paredeOeste.receiveShadow = true;
    scene.add(paredeOeste);
}

export function desceParedesArea4(scene, alturaFinal = 0, velocidade = 1) {
    // Seleciona todas as paredes criadas pela função criaParedesArea4
    const paredes = scene.children.filter(obj =>
        obj.userData && obj.userData.isCollidable
    );

    function animate() {
        let todasAbaixadas = true;
        paredes.forEach(parede => {
            const destinoY = alturaFinal - (parede.userData.altura / 2) - 10;
            if (parede.position.y > destinoY) {
                parede.position.y = Math.max(parede.position.y - velocidade, destinoY);
                todasAbaixadas = false;

                // Atualiza a bounding box de colisão
                if (!parede.userData.collisionBox) {
                    parede.userData.collisionBox = new THREE.Box3().setFromObject(parede);
                } else {
                    parede.userData.collisionBox.setFromObject(parede);
                }
            }
        });
        if (!todasAbaixadas) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}

export function criaPortalVermelhoArea4(scene, area4, pos = { x: 0, y: 5, z: 0 }) {
    // Geometria do anel
    const ringGeometry = new THREE.PlaneGeometry(4, 6);

    const ringMeshRed = new THREE.Mesh(ringGeometry, ringMaterialRed);
    ringMeshRed.position.set(area4.position.x + pos.x, area4.position.y + pos.y, area4.position.z + pos.z);
    ringMeshRed.scale.set(1, 2.2, 1);
    ringMeshRed.rotation.y = Math.PI / 2;
    ringMeshRed.material.opacity = 0;
    ringMeshRed.name = 'portalRed';
    scene.add(ringMeshRed);

    // Centro translúcido
    const centerMaterialRed = new THREE.MeshBasicMaterial({
        color: 0xff2222,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const centerGeometry = new THREE.CircleGeometry(1.8, 64);
    const centerMeshRed = new THREE.Mesh(centerGeometry, centerMaterialRed);
    centerMeshRed.position.set(area4.position.x + pos.x, area4.position.y + pos.y, area4.position.z + pos.z - 0.05);
    centerMeshRed.scale.set(1, 2.7, 1);
    centerMeshRed.rotation.y = Math.PI / 2;
    centerMeshRed.material.opacity = 0;
    scene.add(centerMeshRed);
}

export function checaPortalVermelho(playerObj, scene) {
    // Encontra o portal vermelho na cena
    const portalRed = scene.getObjectByName('portalRed');
    if (!portalRed) return false;

    // Cria bounding box do jogador e do portal
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        playerObj.position.clone(),
        new THREE.Vector3(0.3, 2, 0.3)
    );
    const portalBox = new THREE.Box3().setFromObject(portalRed);

    // Retorna true se colidiu
    return portalBox.intersectsBox(playerBox);
}

export { prediosData };
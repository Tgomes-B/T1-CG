import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

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

    // Posições variadas, espaçadas e alternadas para simular cidade
    const predios = [
        { file: 'Predio1.glb', pos: { x: -60, y: alturaBase, z: -60 }, scale: 0.7 },
        { file: 'predio2.glb', pos: { x: -40, y: alturaBase +15, z: -20 }, scale: 0.8 },
        { file: 'Predio1.glb', pos: { x: -65, y: alturaBase, z: 25 }, scale: 0.6 },
        { file: 'predio2.glb', pos: { x: -35, y: alturaBase +17, z: 60 }, scale: 0.9 },
        { file: 'predio2.glb', pos: { x: 40, y: alturaBase +12.5, z: -50 }, scale: 0.7 },
        { file: 'Predio1.glb', pos: { x: 60, y: alturaBase, z: -10 }, scale: 0.8 },
        { file: 'predio2.glb', pos: { x: 35, y: alturaBase +10, z: 35 }, scale: 0.6 },
        { file: 'Predio1.glb', pos: { x: 55, y: alturaBase, z: 70 }, scale: 0.9 },
        { file: 'Predio1.glb', pos: { x: 80, y: alturaBase, z: -80 }, scale: 0.75 },
        { file: 'predio2.glb', pos: { x: 35, y: alturaBase + 16.5, z: 100 }, scale: 0.85 }
    ];
    let loaded = 0;

    predios.forEach((predio) => {
        loader.load('./images/Textures/area4/' + predio.file, (gltf) => {
            const object = gltf.scene;
            object.position.copy(area4.position);
            object.position.x += predio.pos.x;
            object.position.y = predio.pos.y;
            object.position.z += predio.pos.z;
            object.scale.set(predio.scale, predio.scale, predio.scale);

            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(object);
            

            loaded++;
            if (loaded === predios.length && typeof onAllLoaded === "function") {
                onAllLoaded();
            }
        });
    });
}
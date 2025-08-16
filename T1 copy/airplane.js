import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

// Função para ajustar posição, rotação e escala do avião
export function loadOBJFile(position, hangar, onLoad) {
    const modelPath = './images/Textures/aviao/';
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega o arquivo GLB
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        modelPath + 'plane.glb',
        (gltf) => {
            const obj = gltf.scene;
            obj.position.set(position.x, position.y, position.z);
            obj.scale.set(2, 2, 2);
            obj.name = 'plane';
            obj.visible = true;

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            hangar.add(obj);
            obj.updateMatrixWorld(true);
            if (onLoad) onLoad(obj);
        },
        (progress) => {
            console.log('Progresso GLB:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Erro ao carregar modelo GLB:', error);
        }
    );
}
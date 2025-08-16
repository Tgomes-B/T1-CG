import * as THREE from 'three';
import {OBJLoader} from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

// Função para ajustar posição, rotação e escala do avião
export function loadOBJFile(position, hangar, onLoad) {
    const modelPath = './images/Textures/aviao/'
    const mtlLoader = new MTLLoader();

    mtlLoader.setPath(modelPath);

    mtlLoader.load('plane.mtl', 
        (materials) => {
            console.log("MTL carregado com sucesso");
            materials.preload();
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath(modelPath);
            objLoader.load(
                'plane.obj',
            (obj) => {
                obj.position.set(position.x, position.y, position.z);
                obj.scale.set(20, 20, 20);
                obj.name = 'plane';
                obj.visible = true;

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.material) child.material.side = THREE.DoubleSide;
                });
                obj.updateMatrixWorld(true);
                if (onLoad) onLoad(obj);
            },
            (progress) => {
                console.log('Progresso:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Erro ao carregar modelo OBJ:', error);
            }
        );
    },
    (progress) => {
        console.log('Progresso MTL:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Erro ao carregar MTL:', error);
    });
}
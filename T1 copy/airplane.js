import * as THREE from 'three';
import {OBJLoader} from '../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../build/jsm/loaders/MTLLoader.js';

// Função para ajustar posição, rotação e escala do avião
export function loadOBJFile(position, scene, onLoad) {
    const modelPath = './images/Textures/aviao/';
    const textureLoader = new THREE.TextureLoader();

    // Carrega a textura BMP diretamente
    const bmpTexture = textureLoader.load(modelPath + 'BodyTexture.bmp');
    
    // Carrega apenas o OBJ sem MTL
    const objLoader = new OBJLoader();
    objLoader.setPath(modelPath);
    objLoader.load(
        'P-51Mustang.obj',
        (obj) => {
            obj.position.set(position.x, position.y, position.z);
            obj.scale.set(200, 200, 200);
            obj.name = 'plane';
            obj.visible = true;

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Cria um material novo com a textura BMP
                    child.material = new THREE.MeshPhongMaterial({
                        map: bmpTexture,
                        side: THREE.DoubleSide
                    });
                }
            });
            scene.add(obj);
            obj.updateMatrixWorld(true);
            console.log("Avião carregado com textura BMP:", obj);
            if (onLoad) onLoad(obj);
        },
        (progress) => {
            console.log('Progresso OBJ:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Erro ao carregar modelo OBJ:', error);
        }
    );
}
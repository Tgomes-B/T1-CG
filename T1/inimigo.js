import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

export function adicionarInimigoCena(cena, caminhoGLB, posicao = { x: 0, y: 0, z: 0 }) {
    const loader = new GLTFLoader();
    loader.load(
        caminhoGLB,
        (gltf) => {
            const inimigo = gltf.scene;
            inimigo.position.set(posicao.x, posicao.y, posicao.z);
            inimigo.scale.set(0.015, 0.015, 0.015);
            inimigo.userData.isEnemy = true;
            inimigo.userData.isCollidable = true;
            inimigo.traverse(child => {
                if (child.isMesh) {
                    child.userData.isEnemy = true;
                }
            });

            const boxSize = 7.57; // tamanho do lado do quadrado (ajuste para o seu modelo)
            const boxCenter = inimigo.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxSize / 2, -boxSize / 2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxSize / 2, boxSize / 2));
            inimigo.userData.collisionBox = new THREE.Box3(min, max);

            const boxHelper = new THREE.Box3Helper(inimigo.userData.collisionBox, "red");
            cena.add(boxHelper);
            inimigo.userData.hp = 50;
            inimigo.userData.shootCooldown = 0;
            inimigo.userData.boxHelper = boxHelper;
            inimigo.userData.state = "idle";
            inimigo.userData.detectionRadius = 100;
            inimigo.userData.moveType = "float";
            inimigo.userData.moveDirection = 1;
            inimigo.userData.baseY = inimigo.position.y;

            cena.add(inimigo);

            // --- Animação ---
            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(inimigo);
                const idleClip = gltf.animations.find(clip => clip.name.toLowerCase() === "idle");
                if (idleClip) {
                    const action = mixer.clipAction(idleClip);
                    action.play();
                } else {
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                }
                inimigo.userData.mixer = mixer;
            }
        },
        undefined,
        (erro) => {
            console.error('Erro ao carregar o modelo GLB do inimigo:', erro);
        }
    );
}
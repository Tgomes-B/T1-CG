// inimigo.js
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js';

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

            // Configurar caixa de colisão maior
            const boxSize = 9.0; // Tamanho aumentado
            const boxHeight = 12.0; // Tamanho aumentado
            const boxCenter = inimigo.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize / 2, -boxHeight / 2, -boxSize / 2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize / 2, boxHeight / 2, boxSize / 2));
            inimigo.userData.collisionBox = new THREE.Box3(min, max);

            // Helper visual (opcional)
            const boxHelper = new THREE.Box3Helper(inimigo.userData.collisionBox, "red");
            cena.add(boxHelper);
            inimigo.userData.boxHelper = boxHelper;

            // Configurar estados do inimigo
            inimigo.userData.state = "idle";
            inimigo.userData.detectionRadius = 100;
            inimigo.userData.baseY = inimigo.position.y;
            
            // Configurar HP e barra de vida
            inimigo.userData.hp = 100;
            inimigo.userData.maxHp = 100;
            
            // Criar barra de vida
            const healthBar = new HealthBar(inimigo.userData.maxHp, 1.0, 15);
            inimigo.add(healthBar.getObject());
            inimigo.userData.healthBar = healthBar;
            
            // Tornar materiais transparentes para fade-out
            inimigo.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = true;
                }
            });

            cena.add(inimigo);

            // Configurar animações
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
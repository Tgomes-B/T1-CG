import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';

export function adicionarBossGLB(scene, caminhoGLB, posicao) {
    const loader = new GLTFLoader();
    loader.load(caminhoGLB, gltf => {
        const boss = gltf.scene;
        boss.position.copy(posicao);
        boss.userData.isEnemy = true;
        boss.userData.hp = 300; // HP do boss
        boss.userData.tipo = "boss";

        // (Opcional) Adicione barra de vida, colisão, etc, como nos outros inimigos
        // Exemplo:
        // adicionarHealthBar(boss);
        // adicionarCollisionBox(boss);

        scene.add(boss);
    });
}
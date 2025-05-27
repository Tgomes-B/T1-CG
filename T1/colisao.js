import * as THREE from 'three';

/**
 * Marca paredes, chão, rampas e áreas como colidíveis para uso em lógica de colisão.
 * @param {THREE.Scene} scene - A cena com os objetos.
 */
export function setupCollision(scene) {
    const collidables = scene.children.filter(obj =>
        obj instanceof THREE.Mesh &&
        (
            (obj.name && obj.name.startsWith('wall')) ||
            (obj.name && obj.name.startsWith('area')) ||
            obj.name === 'ground'
        )
    );
    collidables.forEach(obj => {
        console.log('Colisor:', obj.name);
        // Garante que a bounding box está correta
        if (obj.geometry && !obj.geometry.boundingBox) {
            obj.geometry.computeBoundingBox();
        }
        if (obj.userData.isCollidable === false) return; // NÃO marque se já está desativado
        obj.userData.isCollidable = true;
        obj.userData.collisionBox = new THREE.Box3().setFromObject(obj);

        // Visualize as caixas de colisão (opcional)
        const helper = new THREE.Box3Helper(obj.userData.collisionBox, 0xff0000);
        scene.add(helper);
    });
}

/* Pra pobre alma que for mexer nisso aqui de falar o problema a forma que isso foi feito (as areas) foi facil pra fazer a 
o ambiente, mas um cu para fazer a colisão fora isso que eu me lembre coloquei a colisão nas paredes, chão e rampas inclusive ou
eu não achei ou não tem a area maior, voltando pra merda da area se tu pegou pra fazer tu tem que fazer as boxes pra esquerda direita
e pro fundo da area pra poder cobrir tudo pega as medidas do ambiente ou pergunta pro Victor (se não for ele fazendo isso) e é isso*/
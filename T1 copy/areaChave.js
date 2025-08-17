import * as THREE from 'three';
import { CSG } from '../libs/other/CSGMesh.js';

export function criaChave(cor) {
    let keyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const keyMaterial = new THREE.MeshPhongMaterial({
        color: cor,
        shininess: 100,
        specular: "rgb(255, 255, 255)"
    });
    keyMesh.castShadow = true;
    keyMesh.receiveShadow = true;
    let keyCSG = CSG.fromMesh(keyMesh);

    let cylinGeometry = new THREE.CylinderGeometry(0.30, 0.30, 2, 26);
    
    let cylinGeometryY = cylinGeometry.clone();
    let cylinMeshY = new THREE.Mesh(cylinGeometryY);

    let cylinGeometryX = cylinGeometry.clone();
    cylinGeometryX.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    let cylinMeshX = new THREE.Mesh(cylinGeometryX);

    let cylinGeometryZ = cylinGeometry.clone();
    cylinGeometryZ.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    let cylinMeshZ = new THREE.Mesh(cylinGeometryZ);

    let cylinCSG = CSG.fromMesh(cylinMeshX);
    keyCSG = keyCSG.subtract(cylinCSG);

    cylinCSG = CSG.fromMesh(cylinMeshY);
    keyCSG = keyCSG.subtract(cylinCSG);

    cylinCSG = CSG.fromMesh(cylinMeshZ);
    keyCSG = keyCSG.subtract(cylinCSG);

    keyMesh = CSG.toMesh(keyCSG, new THREE.Matrix4());
    keyMesh.material = keyMaterial;
    keyMesh.castShadow = true;
    keyMesh.userData.isCollectable = true;
    keyMesh.receiveShadow = true;

    return keyMesh;
}

/**
 * Gerencia a área da chave: inimigos, pilar e chave animada.
 * @param {THREE.Scene} scene - Cena principal
 * @param {THREE.Object3D} area - Área onde tudo acontece (ex: areas[0])
 */
export function setupAreaChave(scene, area, enemies) {
    let defeatedCount = 0;
    let chave = null;

    // Adicione o método de eliminação para cada inimigo já criado
    enemies.forEach(enemy => {
        enemy.userData.eliminate = () => {
            if (enemy.userData._eliminated) return;
            enemy.userData._eliminated = true;

            if (enemy.parent) enemy.parent.remove(enemy);
            if (enemy.userData.boxHelper && enemy.userData.boxHelper.parent) {
                enemy.userData.boxHelper.parent.remove(enemy.userData.boxHelper);
            }
            scene.remove(enemy);
            defeatedCount++;
            if (defeatedCount === enemies.length) {
                showPilarComChave();
            }
        };
    });

    let blocoAnimado = null;
    let animandoBloco = false;
    let tempoAnimacao = 0;
    const duracaoAnimacao = 2.5; // segundos
    let posFinalBloco = null;
    let posFinalChave = null;
    let chaveAnimada = null;
    let baseY = 8;

    function showPilarComChave() {
        let Bluck = 2;
        let bloco = criaBlocoChave(Bluck);
        bloco.position.y = -4; // começa em -5
        scene.add(bloco);
    
        chave = criaChave('red');
        chave.position.set(0, 6, 0); // 6 é o topo do bloco (altura do bloco/2 + metade da chave)
        bloco.add(chave);
    
        // Guarda referências para animar
        blocoAnimado = bloco;
        chaveAnimada = chave;
        animandoBloco = true;
        tempoAnimacao = 0;
        posFinalBloco = 6; // final desejado do bloco
        posFinalChave = 6; // a chave sempre fica no topo do bloco
        baseY = 6; // para flutuação depois
    
        return bloco;
    }

    return {
        enemies,
        eliminarInimigo: (enemy) => {
            if (enemy.userData && typeof enemy.userData.eliminate === 'function') {
                enemy.userData.eliminate();
            }
        },
        get animandoBloco() { return animandoBloco; },
        set animandoBloco(val) { animandoBloco = val; },
        get blocoAnimado() { return blocoAnimado; },
        get chaveAnimada() { return chaveAnimada; },
        get tempoAnimacao() { return tempoAnimacao; },
        set tempoAnimacao(val) { tempoAnimacao = val; },
        duracaoAnimacao,
        posFinalBloco,
        posFinalChave,
        getChaveAnimada: () => chaveAnimada,
        getBaseY: () => baseY
    };
} 
export function colisionChave(){
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 20, 2),
        new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            visible: false,
            wireframe: true
        })
    );
    mesh.userData.collisionBox = new THREE.Box3().setFromObject(mesh);
    mesh.userData.isCollectionArea = true;
    return mesh;
}

export function criaBlocoChave(Bluck){
    const blocoGeometry = new THREE.BoxGeometry(2,4,2);
    const blocoMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(200, 200, 200)' });
    let bloco = new THREE.Mesh(blocoGeometry, blocoMaterial);
    if (Bluck === 1) {
        bloco.name = 'bloco1';
        bloco.position.set(45, 0.5, 0);
    } else {
        bloco.name = 'bloco2';
        bloco.position.set(175, 2, -155);
    }
    bloco.castShadow = true;
    bloco.receiveShadow = true;
    bloco.userData.isCollidable = true;
    

    // Cria uma caixa de colisão um pouco maior
    const size = new THREE.Vector3(2.5, 5, 2.5); // aumente conforme desejar
    bloco.userData.collisionBox = new THREE.Box3().setFromCenterAndSize(
        bloco.position.clone(),
        size
    );

    const boxHelper = new THREE.Box3Helper(bloco.userData.collisionBox, 0xff00ff);
    bloco.userData.boxHelper = boxHelper;

    return bloco;
}
export function recriarPilarComChave() {
    // Encontra o pilar antigo
    const pilarAntigo = scene.getObjectByName('bloco2');
    let chave = null;

    // Se o pilar antigo existe, remove ele da cena e pega a chave dele
    if (pilarAntigo) {
        // Procura a chave como filho do pilar antigo
        chave = pilarAntigo.children.find(child => child.userData && child.userData.isCollectable);
        if (chave) {
            pilarAntigo.remove(chave);
        }
        scene.remove(pilarAntigo);
    }

    // Cria um novo pilar
    const novoPilar = criaBlocoChave(2);
    novoPilar.position.y = 4; // posição final, ajuste se quiser animar
    scene.add(novoPilar);

        // Atualiza a collisionBox do novo pilar
        const size = new THREE.Vector3(2.5, 5, 2.5);
        novoPilar.userData.collisionBox = new THREE.Box3().setFromCenterAndSize(
            novoPilar.position.clone(),
            size
        );

    // Se havia uma chave, adiciona ao novo pilar
    if (chave) {
        chave.position.set(0, 4, 0); // posição relativa ao topo do pilar
        novoPilar.add(chave);
    }
}
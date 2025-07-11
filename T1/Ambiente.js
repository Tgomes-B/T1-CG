import * as THREE from 'three';
import { CSG } from '../libs/other/CSGMesh.js';
import GUI from '../libs/util/dat.gui.module.js';
import { setupCollision } from './colisao.js';

/**
 * Cria áreas, rampas e chão do ambiente 3D.
 * @param {THREE.Scene} scene - A cena onde os objetos serão adicionados
 * @returns {Object} Objeto contendo as áreas, rampa e chão criados
 */
export function criaAreasRampas(scene) {
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(249, 223, 184)' });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    ground.name = "ground";
    scene.add(ground);
    ground.receiveShadow = true; // Adicionar esta linha
    ground.name = "ground";

    const areaGeometry = new THREE.BoxGeometry(120, 10, 120);
    const areaAzulGeometry = new THREE.BoxGeometry(120, 10, 310);
    const areaMaterial = [
        new THREE.MeshLambertMaterial({ color: 'rgb(155, 249, 134)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(210, 202, 55)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(255, 100, 100)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(100, 123, 255)' })
    ];

    let molde, areas = [], posZ = -155, comp = 30 / 8, ramp, rotY = -0.102 * Math.PI;
    let boxMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 20));
    boxMesh.position.set(0, 0, 0);
    let boxCSG = CSG.fromMesh(boxMesh);

    const rampGeometry = new THREE.PlaneGeometry(31.62, 20);
    const rampMaterial = new THREE.MeshLambertMaterial({});
    

    function updateObject(mesh) {
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
    }

    function cortaArea(areaInteira, boxAuxiliar) {
        return areaInteira.subtract(boxAuxiliar);
    }

    function criaEscada(posX, posZ, comp, rampX) {
        let degrau;
        const alt = 10 / 8;
        const degrauGeometry = new THREE.BoxGeometry(30 / 8, alt, 20);
        const degrauMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(96, 52, 255)' });
        
        for (let i = 0; i < 8; i++) {
            degrau = new THREE.Mesh(degrauGeometry, degrauMaterial);
            degrau.position.set(i * comp + comp / 2 + posX, i * alt + alt / 2, posZ);
            degrau.castShadow = true;
            degrau.receiveShadow = true;
            scene.add(degrau);
        }
        
        ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.rotation.x = 1.5 * Math.PI;
        ramp.rotation.y = rotY;
        ramp.position.set(rampX, 5, posZ);
        ramp.name = 'ramp';
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        scene.add(ramp);
    }

    function criaAreaColisao(areaX, areaY, areaZ, dimensoes, rotacionarY = false) {
        const [largura, altura, profundidade] = dimensoes;
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(...dimensoes),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.5,
                visible: false
            })
        );
        
        if (rotacionarY) {
            mesh.rotateY(Math.PI / 2);
        }
        
        mesh.position.set(areaX, areaY, areaZ);
        mesh.userData.isCollidable = true;
        mesh.name = 'topo_colisao';
        scene.add(mesh);
        return mesh;
    }

    for (let i = 0; i <= 3; i++) {
        let areaX, areaY, areaZ;
                
        if (i < 3) {
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(45, 0, 0);
            areaX = 130;
            areaY = 5;
            areaZ = posZ;

            criaAreaColisao(areaX + 45, areaY + 60 - 60, areaZ + 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 45, areaY + 60 - 60, areaZ - 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 60, areaY + 60 - 60, areaZ, [90, 10, 20]);
        } else {
            molde = new THREE.Mesh(areaAzulGeometry, areaMaterial[i]);
            molde.position.set(-45, 0, 0);
            areaX = -130;
            areaY = 5;
            areaZ = 0;

            criaAreaColisao(areaX - 45, areaY + 155 - 155, areaZ + 82.5, [145, 10, 120], true);
            criaAreaColisao(areaX - 45, areaY + 155 - 155, areaZ - 82.5, [145, 10, 120], true);
            criaAreaColisao(areaX - 60, areaY + 155 - 155, areaZ, [90, 10, 20]);
        }

        updateObject(molde);
        let auxCSG = CSG.fromMesh(molde);
        let objectCSG = cortaArea(auxCSG, boxCSG);
        areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4());
        
        if (i == 3) {
            areas[i].position.set(-130, 5, 0);
            comp = -1 * comp;
            posZ = 0;
            rotY = rotY * -1;
            criaEscada(-115, posZ, comp, -130);
        } else if (i < 3) {
            areas[i].position.set(130, 5, posZ);
            criaEscada(115, posZ, comp, 130);
        }
        
        areas[i].material = areaMaterial[i];
        areas[i].castShadow = true;
        areas[i].receiveShadow = true;
        posZ += 155;
        scene.add(areas[i]);
    }

    return { areas, ramp, ground };
}

/**
 * Cria as paredes do ambiente 3D.
 * @param {THREE.Scene} scene - A cena onde as paredes serão adicionadas
 * @returns {Array} Array contendo as paredes criadas
 */
export function criaParedes(scene) {
    const wallThickness = 5;
    const wallHeight = 50;
    const wallLength = 500;
    const wallMaterial = new THREE.MeshLambertMaterial({ 
        color: 'rgba(255, 140, 0, 0.65)',
        side: THREE.DoubleSide
      });
    
    const walls = [];
    
    // Norte (topo)
    const wallN = createWall(wallLength, wallHeight, wallThickness, [0, wallHeight/2, -250], 'wall0');
    // Sul (baixo)
    const wallS = createWall(wallLength, wallHeight, wallThickness, [0, wallHeight/2, 250], 'wall1');
    // Oeste (esquerda)
    const wallW = createWall(wallThickness, wallHeight, wallLength, [-250, wallHeight/2, 0], 'wall2');
    // Leste (direita)
    const wallE = createWall(wallThickness, wallHeight, wallLength, [250, wallHeight/2, 0], 'wall3');

    walls.push(wallN, wallS, wallW, wallE);
    walls.forEach(wall => scene.add(wall));
    return walls;

    /**
     * Cria uma parede com as dimensões e posição especificadas
     * @private
     * @param {number} width - Largura da parede
     * @param {number} height - Altura da parede
     * @param {number} depth - Profundidade da parede
     * @param {number[]} position - Array [x, y, z] com a posição da parede
     * @param {string} name - Nome identificador da parede
     * @returns {THREE.Mesh} A parede criada
     */
// 2. Função createWall atualizada:
function createWall(width, height, depth, position, name) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const wall = new THREE.Mesh(geometry, wallMaterial);
  wall.position.set(...position);
  wall.name = name;
  wall.userData.isCollidable = true;
  
  // Habilitar sombras
  wall.castShadow = true;
  wall.receiveShadow = true;
  
  return wall;
}
}

/**
 * Configura a iluminação da cena 3D
 * @param {THREE.Scene} scene - A cena a ser iluminada
 * @returns {THREE.SpotLightHelper} Helper visual para a spotlight
 */


export function setupLighting(scene) {
    // 1. Luz ambiente (mantida)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // 2. Luz direcional principal (ajustada para maior altura)
    const directionalLight = createDirectionalLight();
    
    // 3. Segunda luz direcional (preenchimento) - também ajustada para maior altura
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, 150, -30); // Altura aumentada para 150
    fillLight.castShadow = false; // Sem sombras

    scene.add(directionalLight);
    scene.add(fillLight);

    // Helper (opcional)
    const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    scene.add(directionalLightHelper);

    // Atualização da GUI
    buildLightingInterface(directionalLight, fillLight, directionalLightHelper, ambientLight, scene);

    return directionalLightHelper;

    function createDirectionalLight() {
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(100, 250, 30); // Altura aumentada para 250 (antes era 150)
        
        // Configurações de sombra
        light.castShadow = true;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -250;
        light.shadow.camera.right = 250;
        light.shadow.camera.top = 250;
        light.shadow.camera.bottom = -250;
        
        // Ajustes de bias para melhorar a qualidade das sombras
        light.shadow.bias = -0.0001;
        light.shadow.normalBias = 0.05;

        return light;
    }

    function buildLightingInterface(directionalLight, fillLight, helper, ambientLight, scene) {
        const lightControls = {
            intensidadePrincipal: directionalLight.intensity,
            intensidadePreenchimento: fillLight.intensity,
            intensidadeAmbiente: ambientLight.intensity,
            mostrarHelpers: true
        };

        const gui = new GUI({ width: 300 });
        const pasta = gui.addFolder('Controle de Iluminação');
        pasta.open();
        
        pasta.add(lightControls, 'intensidadePrincipal', 0, 2, 0.1)
            .name('Intensidade Principal')
            .onChange(val => directionalLight.intensity = val);
            
        pasta.add(lightControls, 'intensidadePreenchimento', 0, 2, 0.1)
            .name('Intensidade Preenchimento')
            .onChange(val => fillLight.intensity = val);
            
        pasta.add(lightControls, 'intensidadeAmbiente', 0, 2, 0.1)
            .name('Intensidade Ambiente')
            .onChange(val => ambientLight.intensity = val);
            
        pasta.add(lightControls, 'mostrarHelpers')
            .name('Mostrar Helpers')
            .onChange(val => helper.visible = val);
    }
}
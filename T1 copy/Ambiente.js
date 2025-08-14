import * as THREE from 'three';
import { CSG } from '../libs/other/CSGMesh.js';
import GUI from '../libs/util/dat.gui.module.js';
import {
    texArea2Top,
    texDisc,
    texDiscTop,
    texPillarArea1,
    texPillarArea1Displacement,
    texPreda,
    texBottom,
    texPillarArea1Normal,
    texArea4Ground
} from './Loaders.js';
import { criaTexturaArea2 } from './textureArea2.js';
import { criaTexturaArea1 } from './textureArea1.js';
import { adicionaPrediosArea4 } from './area4.js';
/**
 * Cria áreas, rampas e chão do ambiente 3D.
 * @param {THREE.Scene} scene - A cena onde os objetos serão adicionados
 * @returns {Object} Objeto contendo as áreas, rampa e chão criados
 */
export function criaAreasRampas(scene) {
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('../assets/textures/darkcement.jpg');
    groundTexture.offset.set(0.5, 0.5);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(5, 5);

    // Melhora a qualidade:
    groundTexture.minFilter = THREE.LinearFilter;
    groundTexture.magFilter = THREE.LinearFilter;
    groundTexture.anisotropy = 8;
    
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    ground.name = "ground";
    ground.receiveShadow = true;
    scene.add(ground);
    
    texArea2Top.wrapS = THREE.RepeatWrapping;
    texArea2Top.wrapT = THREE.RepeatWrapping;
    texArea2Top.repeat.set(1, 2); // ajuste conforme necessário
    texArea2Top.offset.set(0.5, 0.5);
    
    const envMap = textureLoader.load('./images/SkyBoxT3/SkyBox2.png');
    envMap.mapping = THREE.EquirectangularReflectionMapping;

    const areaGeometry = new THREE.BoxGeometry(120, 10, 120);
    const areaAzulGeometry = new THREE.BoxGeometry(190, 0.3, 310);
    const areaMaterial = [
        new THREE.MeshLambertMaterial({ color: 'rgb(29, 219, 11)' }),
         new THREE.MeshLambertMaterial({ color: 0x3b82f6 }),
        new THREE.MeshLambertMaterial({ color: 'rgb(255, 100, 100)' }),
        new THREE.MeshLambertMaterial({ map: texArea4Ground }) 
    ];

    let molde, areas = [], posZ = -155, comp = 30 / 8, ramp, rotX = 1.5 * Math.PI;
    let boxMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 20));
    boxMesh.position.set(0, 0, 0);
    let boxCSG = CSG.fromMesh(boxMesh);

    const rampGeometry = new THREE.PlaneGeometry(31.62, 20);
    const rampMaterial = new THREE.MeshLambertMaterial({});

    function updateObject(mesh) {
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
    }


    function criaEscada(posX, posZ, comp, rampX, alt, angulo, rampY) {
        let degrau;
        let altura = alt / 8;
        const degrauGeometry = new THREE.BoxGeometry(30 / 8, altura, 20);
        const degrauMaterial = new THREE.MeshLambertMaterial({ map: texPreda });
        
        for (let i = 0; i < 8; i++) {
            degrau = new THREE.Mesh(degrauGeometry, degrauMaterial);
            degrau.position.set(i * comp + comp / 2 + posX, i * altura + altura / 2, posZ);
            degrau.castShadow = true;
            degrau.receiveShadow = true;
            scene.add(degrau);
        }
        
        ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.rotation.x = rotX;
        ramp.rotation.y = angulo;
        ramp.position.set(rampX, rampY, posZ);
        ramp.name = 'ramp';
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        scene.add(ramp);
    }

    function criaAreaColisao(areaX, areaY, areaZ, dimensoes, rotacionarY = false, material = null) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(...dimensoes),
            material || new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.5,
                visible: false
            })
        );
        if (rotacionarY) mesh.rotateY(Math.PI / 2);
        mesh.position.set(areaX, areaY, areaZ);
        mesh.userData.isCollidable = true;
        mesh.name = 'topo_colisao';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
    }

    for (let i = 0; i <= 3; i++) {
        let areaX, areaY, areaZ;
    
        if (i == 0) {
            // Área 1
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(45, 0, 0);
            areaX = 130;
            areaY = 2;
            areaZ = posZ;
    
            criaAreaColisao(areaX + 45, areaY, areaZ + 35, [50, 4, 120], true);
            criaAreaColisao(areaX + 45, areaY, areaZ - 35, [50, 4, 120], true);
            criaAreaColisao(areaX + 60, areaY, areaZ, [90, 4, 20], false);
        } else if (i == 1) {
            // Área 2
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(55, 0, 0);
            areaX = 130;
            areaY = 5;
            areaZ = posZ;
    
            criaAreaColisao(areaX + 45, areaY, areaZ + 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 45, areaY, areaZ - 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 55, areaY, areaZ, [100, 10, 20], false);
        } else if (i == 2) {
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(45, 0, 0);
            areaX = 130;
            areaY = 5;
            areaZ = posZ;
    
            criaAreaColisao(areaX + 45, areaY, areaZ + 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 45, areaY, areaZ - 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 60, areaY, areaZ, [90, 10, 20]);
        } else if (i == 3) {
            molde = new THREE.Mesh(areaAzulGeometry, areaMaterial[i]);
            molde.position.set(-45, 0, 0);
            areaX = -130;
            areaY = 2;
            areaZ = 0;
            areas[i] = molde; // Apenas atribui o molde diretamente para a área 4
            areas[i].material = new THREE.MeshLambertMaterial({ map: texArea4Ground });
            areas[i].castShadow = true;
            areas[i].receiveShadow = true;   
            areas[i].visible = true;
        }
    
        if (i !== 3) { // Evita realizar o CSG na área 4
            updateObject(molde);
            let auxCSG = CSG.fromMesh(molde);
            let objectCSG = auxCSG.subtract(boxCSG);
            areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4());
            areas[i].visible = false;
        } else {
            areas[i] = molde; // Apenas atribui o molde diretamente para a área 4
            areas[i].visible = true; // Torna a área 4 visível
        }
    
        // Adiciona as texturas visuais corretas para cada área
        if (i == 0) {
            // Área 1: topo sólido
            criaTexturaArea1(scene, { x: 130, y: 2, z: posZ });
            areas[i].position.set(130, 2, posZ);
            criaEscada(115, posZ, comp, 130, 4, -0.1325, 2);
        } else if (i == 1) {
            // Área 2: topo com buraco e laterais
            criaTexturaArea2(scene, { x: 175, y: 0, z: posZ });
            areas[i].position.set(120, 5, posZ);
        } else if (i == 2) {
            areas[i].position.set(130, 5, posZ);
            criaEscada(115, posZ, comp, 130, 10, -0.102 * Math.PI, 5);
        } else if (i == 3) {
            areas[i].position.set(-130, 0.5, 0);
            comp = -1 * comp;
            posZ = 0;
            areas[i].visible = true;

            const area4CollisionBox = new THREE.Box3().setFromObject(areas[i]);
            areas[i].userData.collisionBox = area4CollisionBox;
        }
    
        areas[i].material = areaMaterial[i];
        areas[i].castShadow = true;
        areas[i].receiveShadow = true;
        posZ += 155;
        scene.add(areas[i]);
    }
    criaPilares(scene, areas[0]);
    
    return { areas, ramp, ground };
}

// Debug caixa de colisão
const SHOW_COLLISION_BOXES = false;

export function criaPilares(scene, area1) {
    const pilarGeometry = new THREE.CylinderGeometry(4, 4, 30, 64);

    const lateralMaterial = new THREE.MeshStandardMaterial({
        map: texPillarArea1,
        displacementMap: texPillarArea1Displacement,
        displacementScale: 2.5,
        normalMap: texPillarArea1Normal,
        color: 0xffffff,
        roughness: 0.7
    });
    const capMaterial = new THREE.MeshStandardMaterial({
        map: texPillarArea1,
        side: THREE.DoubleSide
    });

    const pilarMaterials = [lateralMaterial, capMaterial, capMaterial];
    
    let Xcont = -9;
    let Zcont = -35;
    let contBack = -33;
    
    // Obtém a posição global da área
    const areaPosition = new THREE.Vector3();
    area1.getWorldPosition(areaPosition);
    
    // Cria um grupo para conter todos os pilares
    const pillarsGroup = new THREE.Group();
    pillarsGroup.name = "pillarsGroup";
    
    // Função para criar um pilar com colisão
    function createPillar(x, y, z) {
        const pilar = new THREE.Mesh(pilarGeometry, pilarMaterials);
        pilar.position.set(x, y, z);
        pilar.castShadow = true;
        pilar.receiveShadow = true;
        pilar.userData.isCollidable = true;
        pilar.name = "pilar";
    
        // Cria uma caixa de colisão em coordenadas globais
        const height = 30;
        const radius = 4;
        const min = new THREE.Vector3(x - radius, y - height / 2, z - radius);
        const max = new THREE.Vector3(x + radius, y + height / 2, z + radius);
        pilar.userData.collisionBox = new THREE.Box3(min, max);
    
        // (Opcional) Visualização
        if (SHOW_COLLISION_BOXES) {
            const boxHelper = new THREE.Box3Helper(pilar.userData.collisionBox, 0xffff00);
            scene.add(boxHelper);
            pilar.userData.boxHelper = boxHelper;
        }
    
        return pilar;
    }
    
    // Primeira fileira de pilares (frente e trás)
    while (Xcont <= 114) {
        // Pilares da frente
        const frontPillar = createPillar(
            areaPosition.x + Xcont, 
            18.75,
            areaPosition.z - 55
        );
        pillarsGroup.add(frontPillar);
        
        // Pilares de trás
        const backPillar = createPillar(
            areaPosition.x + Xcont, 
            18.75,
            areaPosition.z + 55
        );
        pillarsGroup.add(backPillar);
        
        Xcont += 22;
    }
    
    // Pilares do lado esquerdo
    while (Zcont <= 35) {
        const leftPillar = createPillar(
            areaPosition.x - 10,
            18.75,
            areaPosition.z + Zcont
        );
        pillarsGroup.add(leftPillar);
        
        if (Zcont === -15) {
            Zcont += 30;
        } else {
            Zcont += 20;
        }
    }
    
    // Pilares do lado direito
    while (contBack <= 33) {
        const rightPillar = createPillar(
            areaPosition.x + 100,
            18.75, 
            areaPosition.z + contBack
        );
        pillarsGroup.add(rightPillar);
        contBack += 22;
    }
    
    // Adiciona o grupo de pilares à cena
    scene.add(pillarsGroup);
    
    // Atualiza todas as matrizes no grupo
    pillarsGroup.updateMatrixWorld(true);

    const discoGeometry = new THREE.CylinderGeometry(8, 8, 2, 64);
    texDisc.wrapS = THREE.RepeatWrapping;
    texDisc.wrapT = THREE.RepeatWrapping;
    texDisc.repeat.set(7, 1);
    const discoMaterials = [
        new THREE.MeshStandardMaterial({
            map: texDisc,         
            color: 0xffffff,
            metalness: 0.2,
            roughness: 0.7
        }),
        new THREE.MeshStandardMaterial({
            map: texDiscTop,     
            color: 0xffffff,
            metalness: 0.2,
            roughness: 0.7
        }),
        new THREE.MeshStandardMaterial({
            map: texDiscTop,      
            color: 0xffffff,
            metalness: 0.2,
            roughness: 0.7
        })
    ];

    // Array para guardar referências dos pilares
    const pilarMeshes = [];
    pillarsGroup.children.forEach(pilar => {
        // Adiciona disco
        const disco = new THREE.Mesh(discoGeometry, discoMaterials);
        disco.position.set(0, 16, 0);
        disco.castShadow = true;
        disco.receiveShadow = true;
        pilar.add(disco);

        pilarMeshes.push(pilar);
    });

    pilarMeshes.sort((a, b) => {
        if (a.position.x !== b.position.x) return a.position.x - b.position.x;
        return a.position.z - b.position.z;
    });
    
    // Seleciona sempre os mesmos 7 pilares pelos índices fixos
    const indicesFixos = [3, 10, 16, 1, 14, 7, 18]; // (lembre: índice começa em 0)
    const escolhidos = indicesFixos.map(idx => pilarMeshes[idx]).filter(Boolean);
    
    const blocoGeometry = new THREE.BoxGeometry(14, 4, 18);
    const blocoMaterial = new THREE.MeshStandardMaterial({
        map: texPreda, // tom de pedra clara
        metalness: 0.1,
        roughness: 0.9
    });
    
    escolhidos.forEach(pilar => {
        const bloco = new THREE.Mesh(blocoGeometry, blocoMaterial);
        bloco.position.set(0, 19, 0); // ajuste conforme altura do disco/pilar
    
    // Rotaciona o bloco apenas se o pilar está nas laterais (esquerda ou direita)
    if (pilar.position.x - areaPosition.x > -5 && pilar.position.x - areaPosition.x < 80) {
        bloco.rotation.y = Math.PI / 2;
    }
    
        bloco.castShadow = true;
        bloco.receiveShadow = true;
        pilar.add(bloco);
    });

    return area1;
}

/**
 * Cria as paredes do ambiente 3D.
 * @param {THREE.Scene} scene - A cena onde as paredes serão adicionadas
 * @returns {Array} Array contendo as paredes criadas
 */
export function criaParedes(scene) {
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('../assets/textures/displacement/rockWall.jpg');
    const wallDisplacement = textureLoader.load('../assets/textures/displacement/rockWall_Height.jpg');

    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(50, 20); 
    wallTexture.offset.set(0, 0.5); // Ajuste de offset para melhor visualização

    const wallThickness = 5;
    const wallHeight = 50;
    const wallLength = 500;
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        displacementMap: wallDisplacement,
        displacementScale: 1.5, // ajuste para mais/menos relevo
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    const walls = [];
    
    // Norte (topo)
    const wallN = createWall(wallLength, wallHeight, wallThickness, [0, wallHeight / 2, -250], 'wall0');
    // Sul (baixo)
    const wallS = createWall(wallLength, wallHeight, wallThickness, [0, wallHeight / 2, 250], 'wall1');
    // Oeste (esquerda)
    const wallW = createWall(wallThickness, wallHeight, wallLength, [-250, wallHeight / 2, 0], 'wall2');
    // Leste (direita)
    const wallE = createWall(wallThickness, wallHeight, wallLength, [250, wallHeight / 2, 0], 'wall3');

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
    // ...código anterior...

    function createWall(width, height, depth, position, name) {
        const geometry = new THREE.BoxGeometry(width, height, depth, 128, 128, 128);
    
        // Crie uma nova textura para o topo/base desta parede
        const topTexture = new THREE.TextureLoader().load('../assets/textures/displacement/rockWall.jpg');
        topTexture.wrapS = THREE.RepeatWrapping;
        topTexture.wrapT = THREE.RepeatWrapping;
    
        // Ajuste o repeat conforme a orientação
        if (width > depth) {
            topTexture.repeat.set(width / 20, 1);
        } else {
            topTexture.repeat.set(1, depth / 20);
        }
    
        const topBottomMaterial = new THREE.MeshStandardMaterial({
            map: topTexture,
            color: 0xffffff,
            side: THREE.DoubleSide
        });
    
        const wallMaterials = [
            wallMaterial,         // right
            wallMaterial,         // left
            topBottomMaterial,    // top
            topBottomMaterial,    // bottom
            wallMaterial,         // front
            wallMaterial          // back
        ];
    
        const wall = new THREE.Mesh(geometry, wallMaterials);
        wall.position.set(...position);
        wall.name = name;
        wall.userData.isCollidable = true;
        wall.castShadow = true;
        wall.receiveShadow = true;
        return wall;
    }
}

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
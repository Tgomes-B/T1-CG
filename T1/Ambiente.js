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

    const areaGeometry = new THREE.BoxGeometry(120, 10, 120);
    const areaAzulGeometry = new THREE.BoxGeometry(120, 10, 310);
    const areaMaterial = [
        new THREE.MeshLambertMaterial({ color: 'rgb(155, 249, 134)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(210, 202, 55)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(255, 100, 100)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(100, 123, 255)' })
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
        const degrauMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(96, 52, 255)' });
        
        for (let i = 0; i < 8; i++) {
            degrau = new THREE.Mesh(degrauGeometry, degrauMaterial);
            degrau.position.set(i * comp + comp / 2 + posX, i * altura + altura / 2, posZ);
            scene.add(degrau);
        }
        
        ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.rotation.x = rotX;
        ramp.rotation.y = angulo;
        ramp.position.set(rampX, rampY, posZ);
        ramp.name = 'ramp';
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
        if( i == 0) {
            const PrimAreaGeometry = new THREE.BoxGeometry(120, 4, 120);
            molde = new THREE.Mesh(PrimAreaGeometry, areaMaterial[i]);
            molde.position.set(45, 0, 0);
            areaX = 130;
            areaY = 2;
            areaZ = posZ;

            criaAreaColisao(areaX + 45, areaY, areaZ + 35, [50, 4, 120], true);
            criaAreaColisao(areaX + 45, areaY, areaZ - 35, [50, 4, 120], true);
            criaAreaColisao(areaX + 60, areaY, areaZ, [90, 4, 20]);
        }else if (i == 1) {
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(55, 0, 0);
            areaX = 130;
            areaY = 5;
            areaZ = posZ;

            criaAreaColisao(areaX + 45, areaY, areaZ + 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 45, areaY, areaZ - 35, [50, 10, 120], true);
            criaAreaColisao(areaX + 55, areaY, areaZ, [100, 10, 20]);
        }else if (i == 2) {
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
            areaY = 5;
            areaZ = 0;

            criaAreaColisao(areaX - 45, areaY, areaZ + 82.5, [145, 10, 120], true);
            criaAreaColisao(areaX - 45, areaY, areaZ - 82.5, [145, 10, 120], true);
            criaAreaColisao(areaX - 60, areaY, areaZ, [90, 10, 20]);
        }

        updateObject(molde);
        let auxCSG = CSG.fromMesh(molde);
        let objectCSG = auxCSG.subtract(boxCSG);
        areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4());
        
        if (i == 3) {
            areas[i].position.set(-130, 5, 0);
            comp = -1 * comp;
            posZ = 0;
            criaEscada(-115, posZ, comp, -130, 10, 0.102 * Math.PI, 5);
        
        }else if (i == 0) {
            areas[i].position.set(130, 2, posZ);
            criaEscada(115, posZ, comp, 130, 4, -0.1325, 2);
        }else if (i == 1) {
            areas[i].position.set(120, 5, posZ);
            elevador(areas);
            criaTorres(areas[i]);
        }else if (i == 2) {
            areas[i].position.set(130, 5, posZ);
            criaEscada(115, posZ, comp, 130, 10, -0.102 * Math.PI, 5);
        }
        
        areas[i].material = areaMaterial[i];
        posZ += 155;
        scene.add(areas[i]);
    }
    criaPilares(areas[0]);
    
    return { areas, ramp, ground };
}

export function criaPilares(area1){
    const pilarGeometry = new THREE.CylinderGeometry(4, 4, 30, 32);
    const pilarMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(200, 200, 200)' });
    let Xcont = -10;
    let Zcont = -35;
    let contBack = -33;
    while (Xcont <= 114){
        let pilar = new THREE.Mesh(pilarGeometry, pilarMaterial);
        let pilarLat = new THREE.Mesh(pilarGeometry, pilarMaterial);
        pilar.position.set(Xcont, 17, -55);
        pilarLat.position.set(Xcont, 17, 55);
        area1.add(pilar);
        area1.add(pilarLat);
        Xcont = Xcont + 22;
        pilar.name = "pilar";
        pilarLat.name = "pilar";
    }
    while (Zcont <= 35){
        let pilarFron = new THREE.Mesh(pilarGeometry, pilarMaterial);
        pilarFron.position.set(-10, 17, Zcont);
        area1.add(pilarFron);
        pilarFron.name = "pilar";
        if (Zcont == -15) {
            Zcont += 30;
        }else{
            Zcont += 20;
        }
    }
    while (contBack <= 33){
        let pilarBack = new THREE.Mesh(pilarGeometry, pilarMaterial);
        pilarBack.position.set(100, 17, contBack);
        area1.add(pilarBack);
        pilarBack.name = "pilar";
        contBack += 22;
    }
    return area1;
}
function elevador(areas) {
    const portaGeometry = new THREE.BoxGeometry(5, 10, 20);
    const portaMaterial = new THREE.MeshLambertMaterial({ color: 'red' });
    const portaMesh = new THREE.Mesh(portaGeometry, portaMaterial);

    const elevadorGeometry = new THREE.BoxGeometry(15, 10, 20);
    const elevadorMaterial = new THREE.MeshLambertMaterial({ color: 'blue' });
    const elevadorMesh = new THREE.Mesh(elevadorGeometry, elevadorMaterial);

    portaMesh.position.set(-2.5, 0, 0);
    elevadorMesh.position.set(7.5, 0, 0);
    areas[1].add(elevadorMesh);
    elevadorMesh.userData.isCollidable = true;
    //areas[1].add(portaMesh);

    return elevadorMesh;
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = createDirectionalLight();
    const spotlight = createSpotlight();
    const spotLightHelper = new THREE.SpotLightHelper(spotlight);
    scene.add(spotLightHelper);

    buildLightingInterface(spotlight, directionalLight, spotLightHelper, scene);

    return spotLightHelper;

    /**
     * Cria uma luz direcional com configurações padrão
     * @private
     * @returns {THREE.DirectionalLight} A luz direcional criada
     */
    function createDirectionalLight() {
        const light = new THREE.DirectionalLight(0xffffff, 0.6);
        light.position.set(100, 100, 50);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -250;
        light.shadow.camera.right = 250;
        light.shadow.camera.top = 250;
        light.shadow.camera.bottom = -250;
        scene.add(light);
        return light;
    }

    /**
     * Cria uma spotlight com configurações padrão
     * @private
     * @returns {THREE.SpotLight} A spotlight criada
     */
    function createSpotlight() {
        const light = new THREE.SpotLight(0xffffff, 1);
        light.position.set(0, 30, 0);
        light.angle = Math.PI / 6;
        light.penumbra = 0.2;
        light.decay = 1.5;
        light.distance = 150;
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 200;
        scene.add(light);
        return light;
    }

    /**
     * Constrói a interface gráfica para controle de iluminação
     * @private
     * @param {THREE.SpotLight} spotlight - Instância da spotlight
     * @param {THREE.DirectionalLight} directionalLight - Instância da luz direcional
     * @param {THREE.SpotLightHelper} spotLightHelper - Helper da spotlight
     * @param {THREE.Scene} scene - Cena principal
     */
    function buildLightingInterface(spotlight, directionalLight, spotLightHelper, scene) {
        const lightModes = {
            ANTIGA: 'Antiga (Spotlight)',
            NOVA: 'Nova (Direcional)'
        };

        const lightControls = {
            modo: lightModes.NOVA,
            intensidadeSpot: spotlight.intensity,
            intensidadeDirecional: directionalLight.intensity,
            mostrarHelpers: true
        };

        function setModoIluminacao(modo) {
            spotlight.visible = (modo === lightModes.ANTIGA);
            directionalLight.visible = (modo === lightModes.NOVA);
        }

        function setHelpers(ativo) {
            spotLightHelper.visible = ativo;
            scene.children.forEach(child => {
                if (child instanceof THREE.PointLightHelper) {
                    child.visible = ativo;
                }
            });
        }

        const gui = new GUI({ width: 300 });
        const pasta = gui.addFolder('Controle de Iluminação');
        pasta.open();
        
        pasta.add(lightControls, 'modo', [lightModes.ANTIGA, lightModes.NOVA])
            .name('Modo de Iluminação')
            .onChange(modo => setModoIluminacao(modo));
            
        pasta.add(lightControls, 'intensidadeSpot', 0, 2, 0.1)
            .name('Intensidade Spotlight')
            .onChange(val => { spotlight.intensity = val; });
            
        pasta.add(lightControls, 'intensidadeDirecional', 0, 2, 0.1)
            .name('Intensidade Direcional')
            .onChange(val => { directionalLight.intensity = val; });
            
        pasta.add(lightControls, 'mostrarHelpers')
            .name('Mostrar Helpers')
            .onChange(val => setHelpers(val));

        setModoIluminacao(lightControls.modo);
        setHelpers(lightControls.mostrarHelpers);
    }
}

function criaTorres(area) {
    const base = 10;
    const alturas = [22, 28, 19, 16, 27, 25, 21, 30, 18, 24, 29, 20, 17, 23, 26];
    const espacoX = 90 / 4;
    const espacoZ4 = (120 - base*4)/3;
    const espacoZ3 = (120 - base*3)/4;
    const iniZ4 = -60 + base/2;
    const iniZ3 = -60 + base / 2 + espacoZ3;
    const material = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const torresLinha = [4, 3, 4, 3];
    let z = 0;

    let i = 0;
    for (let row = 0; row < torresLinha.length; row++) {
        for (let col = 0; col < torresLinha[row]; col++) {
            if (i >= alturas.length) break;
            const altura = alturas[i++];
            if(torresLinha[row] == 4){
                z = iniZ4 + (espacoZ4 + base) * col;
            }
            else if(torresLinha[row] == 3){
                z = iniZ3 + (espacoZ3 + base) * col;
            }else{
                break;
            }
            
            let x = 30 + row * espacoX;
            const geometry = new THREE.BoxGeometry(base, altura, base);  
            const torre = new THREE.Mesh(geometry, material);

            torre.position.set(x, 5 + altura / 2, z);
            torre.name = "torre";
            torre.userData.isCollidable = true;

            area.add(torre);
            if(alturas[i]==25){
                // torre que guarda a chave
            }
        }
    }
}
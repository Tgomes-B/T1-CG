import * as THREE from 'three';
import { CSG } from '../libs/other/CSGMesh.js';
import GUI from '../libs/util/dat.gui.module.js';
import { setupCollision } from './colisao.js';

/**
 * Cria áreas, rampas e chão do ambiente.
 * Adiciona todos os objetos à cena recebida.
 * @param {THREE.Scene} scene - A cena onde os objetos serão adicionados.
 * @returns {Object} Retorna um objeto com as áreas, rampa e chão criados.
 */
export function criaAreasRampas(scene) {
    // Criação do chão
    const planeGeometry = new THREE.PlaneGeometry(500, 500, 5);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(249, 223, 184)' });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.position.set(0, 0, 0);
    ground.rotation.x = -0.5 * Math.PI;
    ground.name = "ground";
    scene.add(ground);

    // Criação das áreas
    const areaGeometry = new THREE.BoxGeometry(120, 120, 10);
    const areaAzulGeometry = new THREE.BoxGeometry(120, 310, 10);
    const areaMaterial = [
        new THREE.MeshLambertMaterial({ color: 'rgb(155, 249, 134)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(210, 202, 55)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(255, 100, 100)' }),
        new THREE.MeshLambertMaterial({ color: 'rgb(100, 123, 255)' })
    ];

    let molde, areas = [], posZ = -155, comp = 30 / 8, ramp, rotY = -Math.PI / 10;
    let boxMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 10));
    boxMesh.position.set(0, 0, 0);
    let boxCSG = CSG.fromMesh(boxMesh);

    const rampGeometry = new THREE.PlaneGeometry(38, 20);
    const rampMaterial = new THREE.MeshLambertMaterial({});

    // Atualiza a matriz do objeto para operações CSG
    function updateObject(mesh) {
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
    }
    // Realiza a subtração CSG para cortar as áreas
    function cortaArea(areaInteira, boxAuxiliar) {
        return areaInteira.subtract(boxAuxiliar);
    }
    // Cria uma escada composta por degraus e uma rampa
    function criaEscada(posX, posZ, comp, rampX) {
        let degrau;
        const alt = 10 / 8; // Altura de cada degrau
        const degrauGeometry = new THREE.BoxGeometry(30 / 8, alt, 20);
        const degrauMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(96, 52, 255)' });
        for (let i = 0; i < 8; i++) {
            degrau = new THREE.Mesh(degrauGeometry, degrauMaterial);
            degrau.position.set(i * comp + comp / 2 + posX, i * alt + alt / 2, posZ);
            scene.add(degrau);
        }
        ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.rotation.x = 1.5 * Math.PI;
        ramp.rotation.y = rotY;
        ramp.position.set(rampX, 3.75, posZ);
        //ramp.visible = false;
        ramp.name = 'ramp';
        scene.add(ramp);
    }

    // Criação das áreas com corte CSG e posicionamento das escadas
    for (let i = 0; i <= 3; i++) {
        let areaX, areaY, areaZ;
                
        if (i < 3) {
            molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
            molde.position.set(45, 0, 0);
            areaX = 130;
            areaY = 5;
            areaZ = posZ;
            // Divide o topo da área em 3 cubos: esquerda, centro (buraco/rampa), direita
            const topoAltura = 10; // altura do topo (fino)
            const topoY = areaY + 60; // topo da área (meio da altura)

            // Cubo esquerda do topo
            const topoEsq = new THREE.Mesh(
                new THREE.BoxGeometry(50, topoAltura, 120),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 , visible: false})
            );
            topoEsq.rotateY(Math.PI / 2);
            topoEsq.position.set(areaX + 45, topoY - 60, areaZ+35); // ajuste Z conforme necessário
            topoEsq.userData.isCollidable = true;
            scene.add(topoEsq);

            // Cubo direita do topo
            const topoDir = new THREE.Mesh(
                new THREE.BoxGeometry(50, topoAltura, 120),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 , visible: false})
            );
            topoDir.rotateY(Math.PI / 2);
            topoDir.position.set(areaX + 45, topoY - 60, areaZ - 35);
            topoDir.userData.isCollidable = true;
            scene.add(topoDir);

            // Cubo atrás da rampa (fundo do topo)
            const topoFundo = new THREE.Mesh(
                new THREE.BoxGeometry(90, topoAltura, 20),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 , visible: false})
            );
            topoFundo.position.set(areaX + 60, topoY - 60, areaZ);
            topoFundo.userData.isCollidable = true;
            scene.add(topoFundo);
        } else {
            molde = new THREE.Mesh(areaAzulGeometry, areaMaterial[i]);
            molde.position.set(-45, 0, 0);
            areaX = -130;
            areaY = 5;
            areaZ = 0;
            const topoAlturaAzul = 10;
            const topoYAzul = areaY + 155; // metade da altura da área azul (310/2)
            const topoProfundidadeAzul = 120;

            // Cubo esquerda do topo da área azul
            const topoAzulEsq = new THREE.Mesh(
                new THREE.BoxGeometry(145, topoAlturaAzul, topoProfundidadeAzul),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5,visible: false  })
            );
            topoAzulEsq.rotateY(Math.PI / 2);
            topoAzulEsq.position.set(areaX -45, topoYAzul-155, areaZ+82.5);
            topoAzulEsq.userData.isCollidable = true;
            scene.add(topoAzulEsq);

            // Cubo direita do topo da área azul
            const topoAzulDir = new THREE.Mesh(
                new THREE.BoxGeometry(145, topoAlturaAzul, topoProfundidadeAzul),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5,visible: false  })
            );
            topoAzulDir.rotateY(Math.PI / 2);
            topoAzulDir.position.set(areaX -45, topoYAzul-155, areaZ-82.5);
            topoAzulDir.userData.isCollidable = true;
            scene.add(topoAzulDir);

            // Cubo fundo do topo da área azul (atrás da rampa)
            const topoAzulFundo = new THREE.Mesh(
                new THREE.BoxGeometry(90, topoAlturaAzul, 20),
                new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5,visible: false })
            );
            topoAzulFundo.position.set(areaX -60, topoYAzul-155, areaZ);
            topoAzulFundo.userData.isCollidable = true;
            scene.add(topoAzulFundo);
        }
        updateObject(molde);
        let auxCSG = CSG.fromMesh(molde);
        let objectCSG = cortaArea(auxCSG, boxCSG);
        areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4());
        //areas[i].name = 'area' + i;
        if (i == 3) {
            areas[i].position.set(-130, 5, 0);
            comp = -1 * comp;
            posZ = 0;
            rotY = rotY * -1;
            criaEscada(-115, posZ, comp, -126);//posição X da escada , posição Z da escada, comprimento dos degraus, posição X da rampa

        } else if (i < 3) {
            areas[i].position.set(130, 5, posZ);
            criaEscada(115, posZ, comp, 126); //posição X da escada , posição Z da escada, comprimento dos degraus, posição X da rampa
        }
        areas[i].rotation.x = -0.5 * Math.PI;
        areas[i].material = areaMaterial[i];
        posZ += 155;
        scene.add(areas[i]);
    }

    return { areas, ramp, ground };
}

/**
 * Cria as paredes do ambiente e adiciona à cena.
 * @param {THREE.Scene} scene - A cena onde as paredes serão adicionadas.
 * @returns {Array} Array com as paredes criadas.
 */
export function criaParedes(scene) {
    const WallGeometry = new THREE.PlaneGeometry(500, 50);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 'rgba(255, 140, 0, 0.65)' });
    const walls = [];
    for (let i = 0; i <= 3; i++) {
        walls.push(new THREE.Mesh(WallGeometry, wallMaterial));
        walls[i].name = 'wall' + i;
    }
    walls[0].position.set(0, 25, -250);
    walls[1].position.set(0, 25, 250); walls[1].rotation.y = Math.PI;
    walls[2].position.set(-250, 25, 0); walls[2].rotation.y = Math.PI / 2;
    walls[3].position.set(250, 25, 0); walls[3].rotation.y = Math.PI / -2;
    walls.forEach(wall => scene.add(wall));
    return walls;
}

/**
 * Configura a iluminação da cena, adicionando luz ambiente, direcional e spotlight.
 * Também adiciona helpers e interface GUI para controle das luzes.
 * @param {THREE.Scene} scene - A cena a ser iluminada.
 * @returns {THREE.SpotLightHelper} O helper da spotlight para atualização no render loop.
 */
export function setupLighting(scene) {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Luz direcional
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -250;
    directionalLight.shadow.camera.right = 250;
    directionalLight.shadow.camera.top = 250;
    directionalLight.shadow.camera.bottom = -250;
    scene.add(directionalLight);

    // Spotlight
    const spotlight = new THREE.SpotLight(0xffffff, 1);
    spotlight.position.set(0, 30, 0);
    spotlight.angle = Math.PI / 6;
    spotlight.penumbra = 0.2;
    spotlight.decay = 1.5;
    spotlight.distance = 150;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    spotlight.shadow.camera.near = 0.5;
    spotlight.shadow.camera.far = 200;
    scene.add(spotlight);

    // Helper visual para spotlight
    const spotLightHelper = new THREE.SpotLightHelper(spotlight);
    scene.add(spotLightHelper);

    // Interface gráfica para controle das luzes
    function buildLightingInterface() {
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
            if (modo === lightModes.ANTIGA) {
                spotlight.visible = true;
                directionalLight.visible = false;
            } else if (modo === lightModes.NOVA) {
                spotlight.visible = false;
                directionalLight.visible = true;
            }
        }
        function setHelpers(ativo) {
            spotLightHelper.visible = ativo;
            scene.children.forEach(child => {
                if (child instanceof THREE.PointLightHelper) {
                    child.visible = ativo;
                }
            });
        }
        const gui = new GUI();
        const pasta = gui.addFolder('Configuração de Iluminação');
        pasta.open();
        pasta.add(lightControls, 'modo', [lightModes.ANTIGA, lightModes.NOVA])
            .name('Modo de Iluminação')
            .onChange(modo => setModoIluminacao(modo));
        pasta.add(lightControls, 'intensidadeSpot', 0, 2)
            .name('Intensidade Spotlight')
            .onChange(val => { spotlight.intensity = val; });
        pasta.add(lightControls, 'intensidadeDirecional', 0, 2)
            .name('Intensidade Direcional')
            .onChange(val => { directionalLight.intensity = val; });
        pasta.add(lightControls, 'mostrarHelpers')
            .name('Mostrar Helpers')
            .onChange(val => setHelpers(val));
        setModoIluminacao(lightControls.modo);
        setHelpers(lightControls.mostrarHelpers);
    }
    buildLightingInterface();

    return spotLightHelper;
}
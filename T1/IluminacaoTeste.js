import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import {PointerLockControls} from '../build/jsm/controls/PointerLockControls.js';
import GUI from '../libs/util/dat.gui.module.js';
import {initRenderer,
        onWindowResize} from "../libs/util/util.js";

import { CSG } from '../libs/other/CSGMesh.js'  // Constructive Solid Geometry(CSG), para fazer as Areas
        
var stats = new Stats();          // To show FPS information
var renderer = initRenderer("rgb(70, 150, 240)");    // View function in util/utils
renderer.shadowMap.enabled = true;  // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow type for better quality

const scene = new THREE.Scene();
const frustum = new THREE.Frustum();
const cameraViewProjectionMatrix = new THREE.Matrix4();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.updateMatrixWorld();
cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
const controls = new PointerLockControls(camera, renderer.domElement);

//Calculo do angulo da camera
controls.getObject().position.set(10, 2, 1); 
const lookAtTarget = new THREE.Vector3(0.5, 2, 1);
const direction = new THREE.Vector3().subVectors(lookAtTarget, controls.getObject().position).normalize();
const angleY = Math.atan2(direction.x, direction.z);
controls.getObject().rotation.y = angleY;
scene.add(controls.getObject());
scene.add(camera);

window.camera = camera; //deixo a camera global pra testes 

const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 2);

// Configuração do sistema de iluminação
// 1. Luz ambiente - ilumina uniformemente toda a cena
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // cor, intensidade
scene.add(ambientLight);

// 2. Luz direcional - simula a luz do sol
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // cor, intensidade
directionalLight.position.set(100, 100, 50); // posição da luz
directionalLight.castShadow = true; // habilita sombras para esta luz

// Configuração das sombras da luz direcional //Pego de referências
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -250;
directionalLight.shadow.camera.right = 250;
directionalLight.shadow.camera.top = 250;
directionalLight.shadow.camera.bottom = -250;
scene.add(directionalLight);

// 3. Luzes pontuais - irradiam luz em todas as direções a partir de um ponto
const pointLights = [];
const pointLightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
const pointLightPositions = [
    new THREE.Vector3(130, 15, -155), // verde
    new THREE.Vector3(130, 15, 0),   // amarelo
    new THREE.Vector3(130, 15, 155),  // vermelho
    new THREE.Vector3(-130, 15, 0)    // azul
];

/*for (let i = 0; i < 4; i++) {
    const pointLight = new THREE.PointLight(pointLightColors[i], 1, 100); // cor, intensidade, distância
    pointLight.position.copy(pointLightPositions[i]);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    pointLight.shadow.camera.near = 0.1;
    pointLight.shadow.camera.far = 100;
    scene.add(pointLight);
    pointLights.push(pointLight);
    
    // Adiciona helper para visualizar a posição da luz (opcional)
    const sphereSize = 1;
    const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
    scene.add(pointLightHelper);
}*/

// 4. Spotlight - luz em forma de cone // Tomado como exemplo do
const spotlight = new THREE.SpotLight(0xffffff, 1); // cor, intensidade
spotlight.position.set(0, 30, 0);
spotlight.angle = Math.PI / 6; // ângulo do cone de luz
spotlight.penumbra = 0.2; // suavidade das bordas do cone
spotlight.decay = 1.5; // taxa de decaimento da intensidade com a distância
spotlight.distance = 150; // distância máxima da luz
spotlight.castShadow = true;
spotlight.shadow.mapSize.width = 1024;
spotlight.shadow.mapSize.height = 1024;
spotlight.shadow.camera.near = 0.5;
spotlight.shadow.camera.far = 200;
scene.add(spotlight);

// Adiciona helper para visualizar o cone da spotlight (opcional)
const spotLightHelper = new THREE.SpotLightHelper(spotlight);
scene.add(spotLightHelper);


//criando o chão
const planeGeometry = new THREE.PlaneGeometry(500, 500, 5);
const planeMaterial = new THREE.MeshLambertMaterial({
    color:'rgb(249, 223, 184)'
});
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.position.set(0, 0, 0);
ground.rotation.x = -0.5 * Math.PI;
ground.receiveShadow = true; // O chão recebe sombras
scene.add(ground);

// Geometria das areas
const areaGeometry = new THREE.BoxGeometry(120, 120, 10);
const areaAzulGeometry = new THREE.BoxGeometry(120, 310, 10);

// Cores das areas - Ainda vou buscar um jeito melhor de fazer isso
const areaMaterial = [];
areaMaterial[0] = new THREE.MeshLambertMaterial({
    color:'rgb(155, 249, 134)'
});
areaMaterial[1] = new THREE.MeshLambertMaterial({
    color:'rgb(210, 202, 55)'
});
areaMaterial[2] = new THREE.MeshLambertMaterial({
    color:'rgb(255, 100, 100)'
});
areaMaterial[3] = new THREE.MeshLambertMaterial({
    color:'rgb(100, 123, 255)'
});

// Cria o cubo que corta as areas
let molde; 
let areas = [];
let posZ = -155;
let boxCSG, boxMesh, auxCSG, objectCSG;

const rampGeometry = new THREE.PlaneGeometry(31.622, 20);
const rampMaterial = new THREE.MeshLambertMaterial({
});
const ramp = new THREE.Mesh(rampGeometry, rampMaterial);

boxMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 10)) // cubo que vai cortar as areas (x, y, z),
boxMesh.position.set(0, 0, 0) // posição do cubo que vai cortar as areas
boxCSG = CSG.fromMesh(boxMesh); // passa o cubo para CSG

// cria e corta as areas
for(let i=0; i<=3; i++){
    if(i<3){
        molde = new THREE.Mesh(areaGeometry, areaMaterial[i]);
        molde.position.set(45, 0, 0);
    }
    else if(i==3){
        molde = new THREE.Mesh(areaAzulGeometry, areaMaterial[i]);
        molde.position.set(-45, 0, 0);
    }
    updateObject(molde); // atualiza a posição do objeto
    auxCSG = CSG.fromMesh(molde); // passa o molde para CSG
    objectCSG = cortaArea(auxCSG, boxCSG);
    areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4()); 
    if(i == 3){
        areas[i].position.set(-130, 5, 0);
    }
    else if(i < 3){
        areas[i].position.set(130, 5, posZ);
        criaEscada(115,posZ);
    }
    areas[i].rotation.x = -0.5 * Math.PI;
    areas[i].material = areaMaterial[i];
    posZ+=155;
}

//criaEscada(115,0);

function criaEscada(posX, posZ){
    let degrau = [];
    const alt = 10/8;
    const comp = 30/8;
    const degrauGeometry = new THREE.BoxGeometry(comp, alt, 20);
    const degrauMaterial = new THREE.MeshLambertMaterial({
        color:'rgb(96, 52, 255)'
    });
    for(let i=0; i<8; i++){
        degrau = new THREE.Mesh(degrauGeometry, degrauMaterial);
        degrau.position.set(i*comp + comp/2 + posX, i*alt + alt/2 , posZ);
        degrau.castShadow = true;    // Os degraus projetam sombras
        degrau.receiveShadow = true; // Os degraus recebem sombras
        scene.add(degrau);
    }
    
    ramp.rotation.x = 1.5 * Math.PI;
    ramp.rotation.y = -Math.PI / 12;
    ramp.position.set(130, alt*4, posZ);
    ramp.castShadow = true;    // A rampa projeta sombras
    ramp.receiveShadow = true; // A rampa recebe sombras
    scene.add(ramp);
    
}

// Adiciona as areas a cena e configura para receber e projetar sombras
areas.forEach(area => {
    area.receiveShadow = true; // As áreas recebem sombras
    area.castShadow = true;    // As áreas projetam sombras
    scene.add(area);
});
//scene.add(boxMesh)



function updateObject(mesh)
{
   mesh.matrixAutoUpdate = false;
   mesh.updateMatrix();
}

function cortaArea(areaInteira, boxAuxiliar){
    let csgObject;
    csgObject = areaInteira.subtract(boxAuxiliar) // Subtrai parte da area
    return csgObject;
}


// Paredes do Ambiente
const WallGeometry = new THREE.PlaneGeometry(500, 50);
// Mudando de MeshBasicMaterial para MeshLambertMaterial para que as paredes reajam à iluminação
const wallMaterial = new THREE.MeshLambertMaterial({
    color:'rgba(255, 140, 0, 0.85)',
    transparent: true,
    side: THREE.DoubleSide // Renderiza ambos os lados da parede
});

const walls = [];
for (let i = 0; i <= 3; i++) {
    walls.push(new THREE.Mesh(WallGeometry, wallMaterial));
    walls[i].receiveShadow = true; // As paredes recebem sombras
    walls[i].castShadow = true;    // As paredes projetam sombras
}

walls[0].position.set(0, 25, -250);

walls[1].position.set(0, 25, 250);
walls[1].rotation.y = Math.PI;

walls[2].position.set(-250, 25, 0);
walls[2].rotation.y = Math.PI / 2;

walls[3].position.set(250, 25, 0);
walls[3].rotation.y = Math.PI / -2;
walls.forEach(wall => scene.add(wall));


const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', function () {
    controls.lock();
}, false);

controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
});

scene.add(controls.getObject());

const speed = 100;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));

function movementControls(key, value) {
    switch (key) {
        case 87: // W
            moveForward = value;
            break;
        case 83: // S
            moveBackward = value;
            break;
        case 65: // A
            moveLeft = value;
            break;
        case 68: // D
            moveRight = value;
            break;
        case 32:
            moveUp = value;
            break;
        case 16:
            moveDown = value;
            break;
    }
}

function moveAnimate(delta) {
    raycaster.ray.origin.copy(controls.getObject().position);
    const isIntersectingGround = raycaster.intersectObjects([ground, areas[0], areas[1], areas[2], areas[3]]).length > 0;
    const isIntersectingRamp = raycaster.intersectObject(ramp).length > 0;

    if (moveForward) {
        controls.moveForward(speed * delta);
    }
    else if (moveBackward) {
        controls.moveForward(speed * -1 * delta);
    }

    if (moveRight) {
        controls.moveRight(speed * delta);
    }
    else if (moveLeft) {
        controls.moveRight(speed * -1 * delta);
    }

    if (moveUp && camera.position.y <= 100) {
        camera.position.y += speed * delta;
    }
    else if (moveDown && !isIntersectingGround && !isIntersectingRamp) {
        camera.position.y -= speed * delta;
    }
    else if (isIntersectingRamp) {
        camera.position.y += speed / 2 * delta;
    }
}

// Interface de controle da iluminação
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

    // Função para alternar modos
    function setModoIluminacao(modo) {
        if (modo === lightModes.ANTIGA) {
            spotlight.visible = true;
            directionalLight.visible = false;
            // Pontuais e helpers podem ser desligados se quiser
        } else if (modo === lightModes.NOVA) {
            spotlight.visible = false;
            directionalLight.visible = true;
        }
    }

    // Helpers das luzes
    function setHelpers(ativo) {
        spotLightHelper.visible = ativo;
        scene.children.forEach(child => {
            if (child instanceof THREE.PointLightHelper) {
                child.visible = ativo;
            }
        });
    }

    // GUI
    const gui = new GUI();
    const pasta = gui.addFolder('Configuração de Iluminação');
    pasta.open();

    pasta.add(lightControls, 'modo', [lightModes.ANTIGA, lightModes.NOVA])
        .name('Modo de Iluminação')
        .onChange(modo => {
            setModoIluminacao(modo);
        });

    pasta.add(lightControls, 'intensidadeSpot', 0, 2)
        .name('Intensidade Spotlight')
        .onChange(val => {
            spotlight.intensity = val;
        });
    pasta.add(lightControls, 'intensidadeDirecional', 0, 2)
        .name('Intensidade Direcional')
        .onChange(val => {
            directionalLight.intensity = val;
        });
    pasta.add(lightControls, 'mostrarHelpers')
        .name('Mostrar Helpers')
        .onChange(val => {
            setHelpers(val);
        });

    // Inicializa estado
    setModoIluminacao(lightControls.modo);
    setHelpers(lightControls.mostrarHelpers);
}


buildLightingInterface();

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

const clock = new THREE.Clock();
render();
function render() {
    stats.update();

    // Atualiza o frustum da câmera
    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix); 

    // Atualiza a posição do spotlight para seguir a câmera (opcional)
    // spotlight.position.copy(camera.position);
    // spotlight.position.y += 5; // Um pouco acima da câmera
    // spotlight.target.position.copy(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10)));
    // spotlight.target.updateMatrixWorld();
    // spotLightHelper.update();

    if (controls.isLocked) {
        moveAnimate(clock.getDelta());
    }
    
    // Atualiza os helpers das luzes
    spotLightHelper.update();
    
    //A fazer (Thales) adicionar logica pra as areas que iram renderizar
    // Exemplo de lógica para verificar se as áreas estão visíveis
    // talvez alterar a visibilidade do que está fora do frustum
    // Exemplo: areas.forEach(area => area.visible = frustum.intersectsObject(area));
    areas.forEach(area => {
        if (frustum.intersectsObject(area)) {
            // Coloque aqui qualquer lógica que só deve rodar para áreas visíveis
            // Exemplo: area.material.color.set('rgb(0,255,0)');
        }
    });

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

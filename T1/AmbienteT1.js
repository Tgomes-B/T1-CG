import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import {PointerLockControls} from '../build/jsm/controls/PointerLockControls.js';
import {initRenderer,
        initDefaultBasicLight,
        onWindowResize} from "../libs/util/util.js";

import { CSG } from '../libs/other/CSGMesh.js'  // Constructive Solid Geometry(CSG), para fazer as Areas

var stats = new Stats();          // To show FPS information
var renderer = initRenderer("rgb(70, 150, 240)");    // View function in util/utils

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-5, 2, -5);
camera.lookAt(new THREE.Vector3(0, 2, 0));
scene.add(camera);

const raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0).normalize(), 0, 2);
initDefaultBasicLight(scene); // Create a basic light to illuminate the scene


//criando o chão
const planeGeometry = new THREE.PlaneGeometry(500, 500, 5);
const planeMaterial = new THREE.MeshLambertMaterial({
    color:'rgb(249, 223, 184)'
});
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.position.set(0, 0, 0);
ground.rotation.x = -0.5 * Math.PI;
scene.add(ground);

// Geometria das areas
const boxGeometry = new THREE.BoxGeometry(120, 120, 0.5);

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

// Cria as Areas e posiciona uma ao lado da outra
let molde, area4; 
let areas = [];
let postZ = -155;
let cubeCSG, cubeMesh, auxCSG, objectCSG;
cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 2)) // cubo que vai cortar as areas (x, y, z)
cubeMesh.position.set(0, 0, 0) // posição do cubo que vai cortar as areas


molde = new THREE.Mesh(boxGeometry, areaMaterial[0]);
molde.position.set(45, 0, 0);
updateObject(molde); // atualiza a posição do objeto
cubeCSG = CSG.fromMesh(cubeMesh); // passa o cubo para CSG
auxCSG = CSG.fromMesh(molde);
objectCSG = cortaArea(auxCSG, cubeCSG);

for (let i=0; i<3; i++){
    areas[i] = CSG.toMesh(objectCSG, new THREE.Matrix4()); 
    areas[i].position.set(130, 5, postZ);
    areas[i].rotation.x = -0.5 * Math.PI;
    areas[i].material = areaMaterial[i];
    postZ+=155;
}

// cria a Area 4
const boxAzulGeometry = new THREE.BoxGeometry(120, 310, 0.5);
area4 = new THREE.Mesh(boxAzulGeometry, areaMaterial[3]); 
area4.position.set(-45, 0, 0);
updateObject(area4); // atualiza a posição do objeto
auxCSG = CSG.fromMesh(area4);  // cópia da area 4 em CSG
objectCSG = cortaArea(auxCSG, cubeCSG); // corta a area 4
area4 = CSG.toMesh(objectCSG, new THREE.Matrix4());
area4.rotation.x = -0.5 * Math.PI;
area4.material = areaMaterial[3];
area4.position.set(-130, 5, 0);


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

// Adiciona as areas a cena
areas.forEach(area => scene.add(area));
scene.add(area4);
//scene.add(cubeMesh);

// a rampa ainda será removida
const rampGeometry = new THREE.PlaneGeometry(11, 10);
const rampMaterial = new THREE.MeshLambertMaterial({
});
const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
ramp.rotation.x = 1.5 * Math.PI;
ramp.rotation.y = -Math.PI / 6;
ramp.position.set(28.5, 2, 0);
scene.add(ramp);

// Paredes do Ambiente
const WallGeometry = new THREE.PlaneGeometry(500, 5);
const wallMaterial = new THREE.MeshBasicMaterial({
    color:'rgba(255, 140, 0, 0.65)'
});

const walls = [];
for (let i = 0; i <= 3; i++) {
    walls.push(new THREE.Mesh(WallGeometry, wallMaterial));
}

walls[0].position.set(0, 2.5, -250);

walls[1].position.set(0, 2.5, 250);
walls[1].rotation.y = Math.PI;

walls[2].position.set(-250, 2.5, 0);
walls[2].rotation.y = Math.PI / 2;

walls[3].position.set(250, 2.5, 0);
walls[3].rotation.y = Math.PI / -2;
walls.forEach(wall => scene.add(wall));

const controls = new PointerLockControls(camera, renderer.domElement);

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
    const isIntersectingGround = raycaster.intersectObjects([ground, areas[0], areas[1], areas[2], area4]).length > 0;
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

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

const clock = new THREE.Clock();
render();
function render() {
    stats.update();

    if (controls.isLocked) {
        moveAnimate(clock.getDelta());
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

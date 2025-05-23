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
        degrau.position.set(i*comp + comp/2 + posX, i*alt + alt/2 , posZ)
        scene.add(degrau);
    }
    
    ramp.rotation.x = 1.5 * Math.PI;
    ramp.rotation.y = -Math.PI / 12;
    ramp.position.set(130, alt*4, posZ);
    scene.add(ramp);
    
}

// Adiciona as areas a cena
areas.forEach(area => scene.add(area));
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
const wallMaterial = new THREE.MeshBasicMaterial({
    color:'rgba(255, 140, 0, 0.65)'
});

const walls = [];
for (let i = 0; i <= 3; i++) {
    walls.push(new THREE.Mesh(WallGeometry, wallMaterial));
}

walls[0].position.set(0, 25, -250);

walls[1].position.set(0, 25, 250);
walls[1].rotation.y = Math.PI;

walls[2].position.set(-250, 25, 0);
walls[2].rotation.y = Math.PI / 2;

walls[3].position.set(250, 25, 0);
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

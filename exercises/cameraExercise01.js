import * as THREE from  'three';
import KeyboardState from '../libs/util/KeyboardState.js'
import {TeapotGeometry} from '../build/jsm/geometries/TeapotGeometry.js';
import {initRenderer, 
        initDefaultSpotlight,
        createGroundPlaneXZ,
        SecondaryBox, 
        onWindowResize} from "../libs/util/util.js";

let scene, renderer, light, camera, keyboard;
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // View function in util/utils
light = initDefaultSpotlight(scene, new THREE.Vector3(5.0, 5.0, 5.0)); // Use default light    
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );
keyboard = new KeyboardState();

var groundPlane = createGroundPlaneXZ(10, 10, 40, 40); // width, height, resolutionW, resolutionH
scene.add(groundPlane);

// Create objects
createTeapot( 2.0,  0.4,  0.0, Math.random() * 0xffffff);
createTeapot(0.0,  0.4,  2.0, Math.random() * 0xffffff);  
createTeapot(0.0,  0.4, -2.0, Math.random() * 0xffffff);    

let camPos  = new THREE.Vector3(3, 4, 8);
let camUp   = new THREE.Vector3(0.0, 1.0, 0.0);
let camLook = new THREE.Vector3(0.0, 0.0, 0.0);
var message = new SecondaryBox("");

// Main camera
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
   camera.position.copy(camPos);
   camera.up.copy( camUp );
   camera.lookAt(camLook);

render();

function updateCamera()
{
    // 👉 Atualiza de fato a câmera a cada frame
   camera.position.copy(camPos);
   camera.lookAt(camLook);

   message.changeMessage(
      "Pos: { " + camPos.x.toFixed(2) + ", " + camPos.y.toFixed(2) + ", " + camPos.z.toFixed(2) + " }" +
      " / LookAt: { " + camLook.x.toFixed(2) + ", " + camLook.y.toFixed(2) + ", " + camLook.z.toFixed(2) + " }"
   );
}

function keyboardUpdate() {

   keyboard.update();

   const delta = 0.1; // unidades por frame — ajuste para calibrar a velocidade

   // —————— POSIÇÃO da câmera ——————
   if (keyboard.pressed("left"))     camPos.x -= delta;
   if (keyboard.pressed("right"))    camPos.x += delta;
   if (keyboard.pressed("up"))       camPos.z -= delta;
   if (keyboard.pressed("down"))     camPos.z += delta;
   if (keyboard.pressed("pageup"))   camPos.y += delta;
   if (keyboard.pressed("pagedown")) camPos.y -= delta;

   // —————— PONTO de lookAt ——————
   if (keyboard.pressed("A"))        camLook.x -= delta;
   if (keyboard.pressed("D"))        camLook.x += delta;
   if (keyboard.pressed("W"))        camLook.z -= delta;
   if (keyboard.pressed("S"))        camLook.z += delta;
   if (keyboard.pressed("Q"))        camLook.y -= delta;
   if (keyboard.pressed("E"))        camLook.y += delta;

   updateCamera();
}

function createTeapot(x, y, z, color )
{
   var geometry = new TeapotGeometry(0.5);
   var material = new THREE.MeshPhongMaterial({color, shininess:"200"});
      material.side = THREE.DoubleSide;
   var obj = new THREE.Mesh(geometry, material);
      obj.castShadow = true;
      obj.position.set(x, y, z);
   scene.add(obj);
}

function render()
{
   requestAnimationFrame(render);
   keyboardUpdate();
   renderer.render(scene, camera) // Render scene
}
import * as THREE from 'three';

// Cena, câmera e renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Anexar o canvas à div 'webgl-output'
const container = document.getElementById('webgl-output');
container.appendChild(renderer.domElement);

// Criar objetos
const geometry1 = new THREE.BoxGeometry();
const material1 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const objeto1 = new THREE.Mesh(geometry1, material1);
scene.add(objeto1);

const geometry2 = new THREE.BoxGeometry();
const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const objeto2 = new THREE.Mesh(geometry2, material2);
objeto2.position.x = 2; // Posicionar o segundo objeto
scene.add(objeto2);

// Configurar câmera
camera.position.set(0, 0, 5);

function animate() {
    // Atualizar a posição do objeto 1
    objeto1.position.x += 0.01;
    if (objeto1.position.x > 2) {
        objeto1.position.x = -2; // Reiniciar a posição
    }
    // Verificar colisão
    if (objeto1.position.distanceTo(objeto2.position) < 1) {
        objeto1.material.color.set(0xff0000); // Mudar a cor do objeto 1 para vermelho
        objeto2.material.color.set(0xff0000); // Mudar a cor do objeto 2 para vermelho
    } else {
        objeto1.material.color.set(0x00ff00); // Voltar à cor original
        objeto2.material.color.set(0x0000ff); // Voltar à cor original
    }
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}



animate();
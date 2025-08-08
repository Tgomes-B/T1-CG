import * as THREE from 'three';
import {
    texArea1,
    texArea1Wall
 } from './Loaders.js';

// Cria o topo da área 1 (sem buraco)
export function criaTexturaArea1(scene, pos = { x: 130, y: 2, z: 0 }) {
    // --- Parâmetros ---
    const width = 120, depth = 120, height = 4;
    const buracoLargura = 20; // ajuste conforme necessário
    const buracoProfundidade = 30;
    const buracoOffsetX = -width / 2 + buracoLargura / 2 + 2;

    // --- Topo com buraco ---
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -depth / 2);
    shape.lineTo(width / 2, -depth / 2);
    shape.lineTo(width / 2, depth / 2);
    shape.lineTo(-width / 2, depth / 2);
    shape.lineTo(-width / 2, -depth / 2);

    // Buraco (sentido anti-horário), centralizado em X, encostado na frente (Z = +depth/2)
    const hole = new THREE.Path();
    hole.moveTo(-buracoLargura / 2, depth / 2);
    hole.lineTo(buracoLargura / 2, depth / 2);
    hole.lineTo(buracoLargura / 2, depth / 2 - buracoProfundidade);
    hole.lineTo(-buracoLargura / 2, depth / 2 - buracoProfundidade);
    hole.lineTo(-buracoLargura / 2, depth / 2);
    shape.holes.push(hole);

    const topGeometry = new THREE.ShapeGeometry(shape);

    // Corrige UV para repeat funcionar corretamente
    topGeometry.computeBoundingBox();
    const max = topGeometry.boundingBox.max, min = topGeometry.boundingBox.min;
    const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
    const range = new THREE.Vector2(max.x - min.x, max.y - min.y);

    topGeometry.attributes.uv.array.forEach((_, i, arr) => {
        if (i % 2 === 0) { // x
            arr[i] = (arr[i] + offset.x) / range.x;
        } else { // y
            arr[i] = (arr[i] + offset.y) / range.y;
        }
    });

    texArea1.wrapS = THREE.RepeatWrapping;
    texArea1.wrapT = THREE.RepeatWrapping;
    texArea1.repeat.set(10, 10); // ajuste conforme o visual desejado

    const topMaterial = new THREE.MeshStandardMaterial({
        map: texArea1,
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.7,
        side: THREE.DoubleSide
    });
    const topPlane = new THREE.Mesh(topGeometry, topMaterial);
    topPlane.position.set(pos.x + 45, pos.y + height / 2 + 0.01, pos.z);
    topPlane.rotation.x = -Math.PI / 2;
    topPlane.rotation.z = Math.PI / 2;
    topPlane.receiveShadow = true;
    topPlane.castShadow = true;
    scene.add(topPlane);

  // --- Laterais ---
  const lateralHeight = height;
  const lateralY = pos.y ;
  const lateralMaterial = new THREE.MeshStandardMaterial({
      map: texArea1Wall,
      color: 0xffffff,
      side: THREE.DoubleSide
  });

  // Frente (Z positivo)
  const frontGeometry = new THREE.PlaneGeometry(width, lateralHeight);
  const frontPlane = new THREE.Mesh(frontGeometry, lateralMaterial);
  frontPlane.position.set(pos.x + 45, lateralY, pos.z + depth / 2);
  scene.add(frontPlane);

  // Trás (Z negativo)
  const backGeometry = new THREE.PlaneGeometry(width, lateralHeight);
  const backPlane = new THREE.Mesh(backGeometry, lateralMaterial);
  backPlane.position.set(pos.x + 45, lateralY, pos.z - depth / 2);
  backPlane.rotation.y = Math.PI;
    scene.add(backPlane);
    
  const leftWidth = (depth - buracoProfundidade) / 2;

  const leftTopGeometry = new THREE.PlaneGeometry(leftWidth +5, lateralHeight);
  const leftTopPlane = new THREE.Mesh(leftTopGeometry, lateralMaterial);
  leftTopPlane.position.set(
      pos.x + 45 - width / 2, // X negativo (esquerda)
      lateralY,
      pos.z + (buracoProfundidade / 2) + (leftWidth / 2) -2.5 // acima do buraco
  );
  leftTopPlane.rotation.y = Math.PI / 2;
  leftTopPlane.castShadow = true;
  scene.add(leftTopPlane);
  
  // Parte inferior do lado esquerdo
  const leftBottomGeometry = new THREE.PlaneGeometry(leftWidth +5, lateralHeight);
  const leftBottomPlane = new THREE.Mesh(leftBottomGeometry, lateralMaterial);
  leftBottomPlane.position.set(
      pos.x + 45 - width / 2, // X negativo (esquerda)
      lateralY,
      pos.z - (buracoProfundidade / 2) - (leftWidth / 2) +2.5 // abaixo do buraco
  );
  leftBottomPlane.rotation.y = Math.PI / 2;
  leftBottomPlane.castShadow = true;
  scene.add(leftBottomPlane);

  // Direita (X positivo)
  const rightGeometry = new THREE.PlaneGeometry(depth, lateralHeight);
  const rightPlane = new THREE.Mesh(rightGeometry, lateralMaterial);
  rightPlane.position.set(pos.x + 45 + width / 2, lateralY, pos.z);
  rightPlane.rotation.y = -Math.PI / 2;
    scene.add(rightPlane);

    // Laterais internas do buraco (paredes do buraco da escada)
  const buracoX = pos.x + 45 - width / 2 + buracoLargura / 2 + 2; // X do centro do buraco
  const buracoZFrente = pos.z + depth / 2 - buracoProfundidade / 2; // Z do centro do buraco
  
  // Lado esquerdo interno do buraco
  const buracoLateralEsqGeometry = new THREE.PlaneGeometry(buracoProfundidade, lateralHeight);
  const buracoLateralEsq = new THREE.Mesh(buracoLateralEsqGeometry, lateralMaterial);
  buracoLateralEsq.position.set(
      buracoX + buracoLargura/8 + 0.5, // X da parede esquerda do buraco
      lateralY,
      buracoZFrente -35
  );
    buracoLateralEsq.rotation.z = -Math.PI;
    buracoLateralEsq.castShadow = true;
  scene.add(buracoLateralEsq);
  
  // Lado direito interno do buraco
  const buracoLateralDirGeometry = new THREE.PlaneGeometry(buracoProfundidade, lateralHeight);
  const buracoLateralDir = new THREE.Mesh(buracoLateralDirGeometry, lateralMaterial);
  buracoLateralDir.position.set(
      buracoX + buracoLargura/8 +0.5 , // X da parede direita do buraco
      lateralY,
      buracoZFrente -buracoLargura - 35
  );
  buracoLateralDir.castShadow = true;
  scene.add(buracoLateralDir)
    
}
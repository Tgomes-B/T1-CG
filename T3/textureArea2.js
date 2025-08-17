import * as THREE from 'three';
import {
    texArea2Top,
    texArea2Metallic,
    texArea2Roughness,
    texArea2Wall, 
    texBottom
} from './Loaders.js';

// Cria o topo e as laterais da área 2, respeitando espaço para elevador/porta
export function criaTexturaArea2(scene, pos = { x: 130, y: 10, z: 0 }) {
    // --- Parâmetros ---
    const width = 120, depth = 120, height = 10;
    const buracoLarguraTopo = 19.9999;
    const buracoLargura = 25; // largura do buraco (porta+elevador)
    const buracoProfundidade = 20; // profundidade do buraco (quanto "entra" na área)

    // --- Topo com buraco ---
    const shape = new THREE.Shape();
    // Desenha o retângulo externo (sentido horário) no plano XZ, centralizado em (0,0)
    shape.moveTo(-width / 2, -depth / 2);
    shape.lineTo(width / 2, -depth / 2);
    shape.lineTo(width / 2, depth / 2);
    shape.lineTo(-width / 2, depth / 2);
    shape.lineTo(-width / 2, -depth / 2);

    // Buraco (sentido anti-horário), centralizado em X, encostado na frente (Z = +depth/2)
    const hole = new THREE.Path();
    hole.moveTo(-buracoLarguraTopo / 2, depth / 2);
    hole.lineTo(buracoLarguraTopo / 2, depth / 2);
    hole.lineTo(buracoLarguraTopo / 2, depth / 2 - buracoProfundidade);
    hole.lineTo(-buracoLarguraTopo / 2, depth / 2 - buracoProfundidade);
    hole.lineTo(-buracoLarguraTopo / 2, depth / 2);
    shape.holes.push(hole);
    const topGeometry = new THREE.ShapeGeometry(shape);

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

    texArea2Top.wrapS = THREE.RepeatWrapping;
    texArea2Top.wrapT = THREE.RepeatWrapping;
    texArea2Top.repeat.set(8,8);

    const topMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Top,
        metalnessMap: texArea2Metallic,
        roughnessMap: texArea2Roughness,
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.7,
        side: THREE.DoubleSide
    });
    const topPlane = new THREE.Mesh(topGeometry, topMaterial);
    topPlane.position.set(pos.x, 10, pos.z);
    topPlane.rotation.x = -Math.PI / 2;
    topPlane.rotation.z = Math.PI / 2;
    topPlane.receiveShadow = true;
    topPlane.castShadow = true;
    scene.add(topPlane);

    // --- Laterais (frente) com buraco central ---
    const lateralHeight = height;
    const lateralY = pos.y + lateralHeight / 2;

    const frontMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Wall,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const leftWidth = (width - buracoLargura) / 2;

    // Lado esquerdo da frente
    const frontLeftGeometry = new THREE.PlaneGeometry(leftWidth + 2.5, lateralHeight);
    const frontLeftPlane = new THREE.Mesh(frontLeftGeometry, frontMaterial);
    frontLeftPlane.position.set(pos.x - (buracoLargura / 2  + leftWidth ), lateralY, pos.z + depth/3 - 5);
    frontLeftPlane.rotation.y = Math.PI / 2;
    frontLeftPlane.castShadow = true; 
    scene.add(frontLeftPlane);

    // Lado direito da frente
    const rightWidth = leftWidth;
    const frontRightGeometry = new THREE.PlaneGeometry(rightWidth + 2.5, lateralHeight);
    const frontRightPlane = new THREE.Mesh(frontRightGeometry, frontMaterial);
    frontRightPlane.position.set(pos.x - (buracoLargura / 2 + leftWidth), lateralY , pos.z - depth / 3 + 5);
    frontRightPlane.rotation.y = Math.PI / 2;
    frontRightPlane.castShadow = true; 
    scene.add(frontRightPlane);

    // Trás
    const backMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Wall,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const backGeometry = new THREE.PlaneGeometry(width, lateralHeight);
    const backPlane = new THREE.Mesh(backGeometry, backMaterial);
    backPlane.position.set(pos.x, lateralY, pos.z - depth / 2);
    backPlane.rotation.y = Math.PI;
    backPlane.castShadow = true; 
    scene.add(backPlane);

    // --- Esquerda (X negativo) ---
    const leftMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Wall,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const leftGeometry = new THREE.PlaneGeometry(depth, lateralHeight);
    const leftPlane = new THREE.Mesh(leftGeometry, leftMaterial);
    leftPlane.position.set(pos.x + (buracoLargura / 2 )- 12.5, lateralY, pos.z + depth/2);
    leftPlane.castShadow = true; 
    scene.add(leftPlane);

    // Direita
    const rightMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Wall,
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const rightGeometry = new THREE.PlaneGeometry(depth, lateralHeight);
    const rightPlane = new THREE.Mesh(rightGeometry, rightMaterial);
    rightPlane.position.set(pos.x + width / 2, lateralY, pos.z);
    rightPlane.rotation.y = -Math.PI / 2;
    rightPlane.castShadow = true; 
    scene.add(rightPlane);

    // --- Paredes internas do buraco da frente ---
    const buracoZ = pos.z + depth / 2 - buracoProfundidade / 2; // centro do buraco em Z
    const buracoY = lateralY;
    const paredeAltura = lateralHeight;
    const paredeProfundidade = buracoProfundidade;
    const paredeMaterial = new THREE.MeshStandardMaterial({
        map: texArea2Wall,
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    // Lado esquerdo interno do buraco
    const paredeEsqGeometry = new THREE.PlaneGeometry(paredeProfundidade, paredeAltura);
    const paredeEsq = new THREE.Mesh(paredeEsqGeometry, paredeMaterial);
    paredeEsq.position.set(
        pos.x - buracoLarguraTopo / 2 -40, // X da parede esquerda do buraco
        buracoY,
        buracoZ  - 60
    );

    paredeEsq.castShadow = true;
    scene.add(paredeEsq);

    // Lado direito interno do buraco
    const paredeDirGeometry = new THREE.PlaneGeometry(paredeProfundidade, paredeAltura);
    const paredeDir = new THREE.Mesh(paredeDirGeometry, paredeMaterial);
    paredeDir.position.set(
        pos.x + buracoLarguraTopo / 2 -60, // X da parede direita do buraco
        buracoY,
        buracoZ -40
    );
    paredeDir.castShadow = true;
    scene.add(paredeDir);

    const fundoGeometry = new THREE.PlaneGeometry(buracoLarguraTopo, paredeAltura);
    const fundo = new THREE.Mesh(fundoGeometry, paredeMaterial);
    fundo.position.set(
        pos.x -40,
        buracoY ,
        pos.z + depth / 2 - paredeProfundidade -40
    );
    fundo.rotation.y = Math.PI/2;
    fundo.castShadow = true;
    scene.add(fundo);

    const PlaneGeo = new THREE.PlaneGeometry(width, depth);
    const PlaneMat = new THREE.MeshLambertMaterial({ map: texBottom, side: THREE.DoubleSide });
    const Plane = new THREE.Mesh(PlaneGeo, PlaneMat);
    Plane.position.set(pos.x, pos.y - 0.11, pos.z); // um pouco abaixo da área
    Plane.rotation.x = -Math.PI / 2;
    scene.add(Plane);

}
import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { HealthBar } from './healthbar.js';
import { loadEnemyOBJ } from './enemy.js'; // Para criar os Skulls

// Função para spawnar os Skulls quando o Boss detectar o jogador
export function spawnSkullsForBoss(boss, playerPos, scene) {
    if (boss.userData.hasSpawnedSkulls) return;
    
    boss.userData.hasSpawnedSkulls = true;
    const numSkulls = 5;
    const radius = 5; // Raio do círculo onde os Skulls serão posicionados
    
    // Toca o som de spawn dos Skulls
    const audio = document.getElementById('PainSpawnSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play();
    }
    
    for (let i = 0; i < numSkulls; i++) {
        // Calcula posições em um círculo ao redor do Boss
        const angle = (i / numSkulls) * Math.PI * 2;
        const skullPos = {
            x: boss.position.x + Math.cos(angle) * radius,
            y: boss.position.y + 3, // Posição um pouco acima do boss
            z: boss.position.z + Math.sin(angle) * radius
        };
        
        loadEnemyOBJ('images/sprites/skull/skull.obj', skullPos, (skull) => {
            // Define a área de patrulha igual à do boss
            if (boss.userData.patrolArea) {
                skull.userData.patrolArea = {
                    min: boss.userData.patrolArea.min.clone(),
                    max: boss.userData.patrolArea.max.clone()
                };
            }
            
            // Configurações específicas para os Skulls do Boss
            skull.userData.enemyType = "skull";
            skull.userData.state = "pursuing";
            skull.userData.detectionRadius = 100; // Maior raio de detecção
            skull.userData.moveType = "dash";
            skull.userData.dashSpeed = 40; // Velocidade de dash
            skull.userData.dashDirection = new THREE.Vector3();
            skull.userData.isDashing = false;
            skull.userData.wasReturning = false;
            skull.userData.originalPosition = skull.position.clone();
            
            // Direciona o Skull para o jogador
            const direction = new THREE.Vector3(
                playerPos.x - skull.position.x,
                0,
                playerPos.z - skull.position.z
            ).normalize();
            
            // Inicializa o dash na direção do jogador
            skull.userData.dashDirection.copy(direction);
            skull.rotation.y = Math.atan2(direction.x, direction.z);
            
            // Configura a colisão
            const boxSize = 2.5;
            const boxHeight = 2.5;
            const boxCenter = skull.position.clone();
            const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
            const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
            skull.userData.collisionBox = new THREE.Box3(min, max);
            
            // Configura a barra de vida
            const healthBar = new HealthBar(30, 1.2); // Menos HP que o normal
            const healthBarObj = healthBar.getObject();
            skull.userData.healthBar = healthBar;
            skull.userData.healthBarOffsetY = 2;
            healthBarObj.position.y = skull.userData.healthBarOffsetY;
            skull.add(healthBarObj);
            
            // Adiciona à cena
            scene.add(skull);
        });
    }
    
    // Reseta o flag após um tempo para permitir novos spawns
    setTimeout(() => {
        boss.userData.hasSpawnedSkulls = false;
    }, 5000); // 5 segundos de intervalo entre spawns
}

export function adicionarBossGLB(scene, caminhoGLB, posicao, onLoaded) {
    const loader = new GLTFLoader();
    
    loader.load(caminhoGLB, gltf => {
        const boss = gltf.scene;
        
        // Obtém a área 4 da cena
        const area4 = scene.getObjectByName('area4');
        if (!area4) {
            console.error('Área 4 não encontrada na cena');
            return;
        }
        
        // Define a posição central da área 4
        const areaCenter = area4.position.clone();
        
        // Usa a posição fornecida ou a posição central da área 4
        const spawnPosition = posicao || areaCenter;
        
        // Ajusta a altura para ser mais baixa que o Cacodemon
        spawnPosition.y = 8; // Altura mais baixa que o Cacodemon (que está em 15)
        
        // Aplica a posição e escala
        boss.position.copy(spawnPosition);
        boss.scale.set(0.38, 0.38, 0.38);
        
        // Define a área de patrulha baseada na área 4 (mesmo padrão dos Cacodemons)
        const areaSize = 190; // Tamanho da área 4
        const patrolBoxMin = new THREE.Vector3(
            areaCenter.x - areaSize/2,
            8,  // Altura mínima (igual à altura do Boss)
            areaCenter.z - areaSize/2
        );
        const patrolBoxMax = new THREE.Vector3(
            areaCenter.x + areaSize/2,
            25,  // Altura máxima
            areaCenter.z + areaSize/2
        );
        
        // Propriedades do Boss (semelhantes ao Cacodemon, mas sem atirar)
        boss.userData = {
            isEnemy: true,
            isCollidable: true,
            enemyType: "boss",
            hp: 300,
            maxHp: 300,
            state: "idle",
            detectionRadius: 80,
            moveType: "float",
            moveDirection: 1,
            baseY: spawnPosition.y,
            name: "boss",
            tipo: "boss",
            hasSpawnedSkulls: false,
            originalPosition: spawnPosition.clone(),
            patrolArea: { min: patrolBoxMin, max: patrolBoxMax },
            detectionRadius: 60,
            cacoMovePhase: 0,
            cacoMoveTimer: 0,
            cacoLateralDir: Math.random() < 0.5 ? -1 : 1,
            cacoMoveType: "patrol",
            cacoJustShot: false,
            inShootingPhase: false,
            hasFiredInThisPhase: false,
            lastMoveWasBackward: false,
            cacoMoveDuration: 0,
            cacoMoveAmplitude: 1.5,
            cacoMoveVertical: 0,
            lastLateralDir: 1,
            canShoot: false // Desativa a habilidade de atirar
        };

        // Configuração dos materiais e sombras
        boss.traverse(child => {
            if (child.isMesh) {
                child.userData.isEnemy = true;
                child.userData.hp = boss.userData.hp;
                child.userData.enemyRoot = boss;
                child.userData.enemyType = "boss";
                child.userData.tipo = "boss";
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.transparent = true;
                }
            }
        });

        // HealthBar
        const healthBar = new HealthBar(boss.userData.maxHp, 1.8);
        const healthBarObj = healthBar.getObject();
        boss.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(boss);
        const heightOffset = bbox.max.y - bbox.min.y + 2;
        healthBarObj.position.y = heightOffset;
        boss.add(healthBarObj);
        boss.userData.healthBar = healthBar;
        boss.userData.healthBarOffsetY = heightOffset;

        // Collision Box
        const boxSize = 8;
        const boxHeight = 10;
        const boxCenter = boss.position.clone();
        const min = boxCenter.clone().add(new THREE.Vector3(-boxSize/2, -boxHeight/2, -boxSize/2));
        const max = boxCenter.clone().add(new THREE.Vector3(boxSize/2, boxHeight/2, boxSize/2));
        boss.userData.collisionBox = new THREE.Box3(min, max);

        // Adiciona o boss à cena
        scene.add(boss);
        
        // Retorna o boss para ser usado em outras partes do código
        return boss;
    });
}
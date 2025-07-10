// HealthBar.js
import * as THREE from 'three';

export class HealthBar {
    constructor(maxHealth, height = 0.3, width = 2) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.height = height;
        this.width = width;
        
        this.group = new THREE.Group();
        this.createBar();

        // HealthBar.js (no construtor)
    this.group.userData.isHealthBar = true;
    }

    createBar() {
        // Fundo preto (contorno)
        const backgroundGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const backgroundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.DoubleSide
        });
        this.background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.group.add(this.background);

        // Barra de vida verde (preenchimento)
        const healthGeometry = new THREE.PlaneGeometry(this.width - 0.1, this.height - 0.1);
        this.healthMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        this.healthBar = new THREE.Mesh(healthGeometry, this.healthMaterial);
        this.healthBar.position.z = 0.01; // Colocar ligeiramente na frente
        this.group.add(this.healthBar);

     // Posicionar acima do inimigo
     this.group.position.y = 65;  // Aumentar altura
     this.group.position.z = 20;   // Trazer para frente
     this.group.rotation.x = Math.PI; // Rotacionar para ficar horizontal
    }

    update(health) {
        this.currentHealth = Math.max(0, health);
        const percent = this.currentHealth / this.maxHealth;
        
        // Atualizar escala da barra
        this.healthBar.scale.x = percent;
        
        // Atualizar cor (verde -> amarelo -> vermelho)
        if (percent > 0.6) {
            this.healthMaterial.color.setHex(0x00ff00); // Verde
        } else if (percent > 0.3) {
            this.healthMaterial.color.setHex(0xffff00); // Amarelo
        } else {
            this.healthMaterial.color.setHex(0xff0000); // Vermelho
        }
    }

    getObject() {
        return this.group;
    }
}
import * as THREE from 'three';

export class HealthBar {
    constructor(maxHealth, width = 2, height = 0.3) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        
        // Grupo principal
        this.group = new THREE.Group();
        this.group.renderOrder = 999; // Garante que será renderizado por último
        this.group.userData.isHealthBar = true;

        // Plano de fundo preto
        const bgGeometry = new THREE.PlaneGeometry(width, height);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        this.background = new THREE.Mesh(bgGeometry, bgMaterial);
        this.group.add(this.background);

        // Barra de vida verde
        const healthGeometry = new THREE.PlaneGeometry(width - 0.1, height - 0.1);
        this.healthMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1
        });
        this.healthBar = new THREE.Mesh(healthGeometry, this.healthMaterial);
        this.healthBar.position.z = 0.01; // À frente do fundo
        this.group.add(this.healthBar);
    }

    update(health) {
        this.currentHealth = Math.max(0, health);
        const percent = this.currentHealth / this.maxHealth;
        this.healthBar.scale.x = percent;
        
        // Atualiza cor conforme a vida
        if (percent > 0.6) this.healthMaterial.color.setHex(0x00ff00);
        else if (percent > 0.3) this.healthMaterial.color.setHex(0xffff00);
        else this.healthMaterial.color.setHex(0xff0000);
    }

    getObject() {
        return this.group;
    }
}
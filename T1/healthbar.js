// healthbar.js
import { CSS2DObject } from '../build/jsm/renderers/CSS2DRenderer.js';

export class HealthBar {
    constructor(maxHealth, size = 1.0) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.size = size;
        
        // Criar elemento DOM para a barra de vida
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: relative;
            background-color: #333;
            border: 1px solid #000;
            border-radius: 3px;
            width: ${60 * size}px;
            height: ${8 * size}px;
            overflow: hidden;
            box-shadow: 0 0 5px rgba(0,0,0,0.7);
            z-index: 1000; /* Garante que fique na frente */
        `;
        
        // Barra de vida interna
        this.bar = document.createElement('div');
        this.bar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 100%;
            background-color: #0f0;
            transition: width 0.3s ease; /* Transição mais suave */
        `;
        this.element.appendChild(this.bar);
        
        // Criar objeto CSS2D
        this.label = new CSS2DObject(this.element);
        this.label.position.y = 30; // Posição relativa ao inimigo
        this.label.visible = true; // Sempre visível quando o jogo está rodando
    }
    
    update(health) {
        this.currentHealth = health;
        const percent = Math.max(0, this.currentHealth / this.maxHealth);
        this.bar.style.width = (percent * 100) + "%";
    
        // Atualizar cor conforme a vida diminui
        if (percent > 0.6) {
            this.bar.style.backgroundColor = '#0f0'; // Verde
        } else if (percent > 0.3) {
            this.bar.style.backgroundColor = '#ff0'; // Amarelo
        } else {
            this.bar.style.backgroundColor = '#f00'; // Vermelho
        }
    
    }
    
    getObject() {
        return this.label;
    }
}
import * as THREE from 'three';
import { SpriteMixer } from '../libs/sprites/SpriteMixer.js';
import { HealthBar } from './healthbar.js';

export function criaSoldier(position, scene) {
    const loader = new THREE.TextureLoader();
    loader.load("../assets/textures/sprites/zombieman.png", (texture) => {
        const spriteMixer = new SpriteMixer(scene);
        const actionSprite = spriteMixer.ActionSprite(texture, 8, 8);

        // Ajusta posição e escala
        actionSprite.position.copy(position);
        actionSprite.position.y =  0.9; //position.y ||
        actionSprite.position.x = position.x - 50;
        // Ajusta escala e posicionamento
        actionSprite.scale.set(8, 8, 8);
        actionSprite.position.y = 1.5;
        actionSprite.renderOrder = 999; // Prioridade máxima
        
        // Configura propriedades do inimigo
        actionSprite.name = "soldier";
        actionSprite.userData.tipo = "soldier";
        actionSprite.userData.isEnemy = true;
        actionSprite.userData.hp = 30;
        actionSprite.userData.maxHp = 30;
        
        // Adiciona barra de vida
        const healthBar = new HealthBar(actionSprite.userData.maxHp, 0.8);
        const healthBarObj = healthBar.getObject();
        healthBarObj.position.y = 1.2; // Posição mais baixa acima do soldado
        healthBarObj.name = 'healthBar';
        healthBarObj.userData.isHealthBar = true;
        actionSprite.add(healthBarObj);
        actionSprite.userData.healthBar = healthBar;

        // Frame inicial
        actionSprite.setFrame(0, 0);

        // Adiciona ações (exemplo)
        const actions = {};
        actions.runDown  = spriteMixer.Action(actionSprite, 100, 0, 0, 3, 0);
        actions.runLD    = spriteMixer.Action(actionSprite, 100, 0, 1, 3, 1); // Left Down
        actions.runLeft  = spriteMixer.Action(actionSprite, 100, 0, 2, 3, 2);
        actions.runLU    = spriteMixer.Action(actionSprite, 100, 0, 3, 3, 3); // Left Up
        actions.runUp    = spriteMixer.Action(actionSprite, 100, 0, 4, 3, 4);
        actions.runRU    = spriteMixer.Action(actionSprite, 100, 0, 5, 3, 5); // Right Up    
        actions.runRight = spriteMixer.Action(actionSprite, 100, 0, 6, 3, 6);
        actions.runRD    = spriteMixer.Action(actionSprite, 100, 0, 7, 3, 7); // Right Down     
    
        actions.Die = spriteMixer.Action(actionSprite, 150, 7, 0, 7, 3); // Die action
    
        actions.ShootingDown  = spriteMixer.Action(actionSprite, 100, 4, 0, 5, 0);
        actions.ShootingLD    = spriteMixer.Action(actionSprite, 100, 4, 1, 5, 1);
        actions.ShootingLeft  = spriteMixer.Action(actionSprite, 100, 4, 2, 5, 2);
        actions.ShootingLU    = spriteMixer.Action(actionSprite, 100, 4, 3, 5, 3);
        actions.ShootingUp    = spriteMixer.Action(actionSprite, 100, 4, 4, 5, 4);
        actions.ShootingRU    = spriteMixer.Action(actionSprite, 100, 4, 5, 5, 5);
        actions.ShootingRight = spriteMixer.Action(actionSprite, 100, 4, 6, 5, 6);
        actions.ShootingRD    = spriteMixer.Action(actionSprite, 100, 4, 7, 5, 7);    

        // Adiciona à cena
        scene.add(actionSprite);

        // Retorna para controle externo se quiser
        return { sprite: actionSprite, actions, spriteMixer };
    });
}
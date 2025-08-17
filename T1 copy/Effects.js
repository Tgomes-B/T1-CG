import * as THREE from 'three';

/**
 * Efeito de fogo procedural para envolver um modelo (Skull) em tempo real.
 * Não usa PNGs. Usa partículas (esferas/planos) com gradiente procedural.
 * O fogo acompanha o centro do modelo (AABB).
 */
export class FireEffect {
    /**
     * @param {THREE.Object3D} target - O objeto 3D (Skull) a ser envolvido pelo fogo
     * @param {THREE.Scene} scene - Cena Three.js onde o fogo será adicionado
     * @param {Object} [options]
     * @param {number} [options.radius=2] - Raio do círculo de partículas em torno do Skull
     * @param {number} [options.height=2] - Altura do fogo
     * @param {number} [options.count=32] - Número de partículas
     */
    constructor(target, scene, options = {}) {
        this.target = target;
        this.scene = scene;
        this.radius = options.radius || 2;
        this.height = options.height || 2;
        this.count = options.count || 32;
        this.particles = [];
        this.group = new THREE.Group();
        this.time = 0;
        this._createParticles();
        scene.add(this.group);
    }

    _createParticles() {
        // Usar menos planos cruzados para criar volume uniforme
        this.planes = [];
        const planeCount = this.count = 10; // 8-12 é suficiente para volume
        const width = this.radius * 6.0;
        const height = this.height * 2.0;
        // Gradiente procedural via canvas
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        // Cria gradiente radial vertical (amarelo-centro, laranja, vermelho, transparente)
        const grad = ctx.createLinearGradient(0, canvas.height*0.4, 0, canvas.height);
        grad.addColorStop(0.0, 'rgba(255,255,180,0.95)'); // centro amarelo
        grad.addColorStop(0.18, 'rgba(255,180,40,0.85)'); // laranja
        grad.addColorStop(0.45, 'rgba(255,60,0,0.7)'); // vermelho
        grad.addColorStop(0.7, 'rgba(120,0,0,0.3)'); // escuro
        grad.addColorStop(1.0, 'rgba(0,0,0,0.0)'); // transparente
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        // Cria textura de gradiente de chama (labareda)
        function createFlameTexture() {
            const flameCanvas = document.createElement('canvas');
            flameCanvas.width = 64;
            flameCanvas.height = 128;
            const ctx = flameCanvas.getContext('2d');
            // Path de chama
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(32, 128);
            ctx.bezierCurveTo(0, 100, 20, 30, 32, 0);
            ctx.bezierCurveTo(44, 30, 64, 100, 32, 128);
            ctx.closePath();
            ctx.clip();
            // Gradiente radial ao longo da chama
            const grad = ctx.createLinearGradient(32, 128, 32, 0);
            grad.addColorStop(0.0, 'rgba(255,60,0,0.98)'); // vermelho intenso centro
            grad.addColorStop(0.15, 'rgba(255,30,0,0.92)'); // vermelho puro
            grad.addColorStop(0.33, 'rgba(255,80,20,0.85)'); // vermelho-laranja
            grad.addColorStop(0.55, 'rgba(180,0,0,0.6)'); // vermelho escuro
            grad.addColorStop(0.8, 'rgba(80,0,0,0.25)'); // quase preto
            grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 128);
            ctx.restore();
            return new THREE.CanvasTexture(flameCanvas);
        }
        // Grupo de fumaça
        this.smokeGroup = new THREE.Group();
        this.group.add(this.smokeGroup);
        this.smokeParticles = [];
        const smokeCount = 260;
        for (let i = 0; i < smokeCount; i++) {
            const smokeGeo = new THREE.SphereGeometry(0.028 + Math.random()*0.02, 10, 10);
            const smokeMat = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.27 + Math.random()*0.18,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(smokeGeo, smokeMat);
            mesh.userData.baseIndex = i;
            this.smokeGroup.add(mesh);
            this.smokeParticles.push(mesh);
        }
        // Criar "labaredas" com formato de chama
        for (let i = 0; i < planeCount; i++) {
            const flameTex = createFlameTexture();
            flameTex.wrapS = flameTex.wrapT = THREE.ClampToEdgeWrapping;
            const mat = new THREE.MeshBasicMaterial({
                map: flameTex,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            // Geometria de chama: curva Bezier para dar formato de labareda
            const shape = new THREE.Shape();
            shape.moveTo(0, -height/2);
            shape.bezierCurveTo(-width*0.35, -height*0.15, -width*0.12, height*0.45, 0, height/2);
            shape.bezierCurveTo(width*0.12, height*0.45, width*0.35, -height*0.15, 0, -height/2);
            const geo = new THREE.ShapeGeometry(shape, 24);
            // Corrige UVs para cobrir toda a labareda
            geo.computeBoundingBox();
            const max = geo.boundingBox.max, min = geo.boundingBox.min;
            const uvAttribute = [];
            for (let i = 0; i < geo.attributes.position.count; i++) {
                const x = geo.attributes.position.getX(i);
                const y = geo.attributes.position.getY(i);
                const u = (x - min.x) / (max.x - min.x);
                const v = (y - min.y) / (max.y - min.y);
                uvAttribute.push(u, v);
            }
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvAttribute, 2));
            const mesh = new THREE.Mesh(geo, mat);
            mesh.material.opacity = 1.0; // facilitar visualização
            mesh.scale.set(1.15, 1.15, 1); // aumentar leve para garantir visualização
            mesh.userData.baseIndex = i;
            mesh.rotation.y = (i / planeCount) * Math.PI;
            // Espalha as labaredas em círculo
            mesh.rotation.z = Math.sin(i*1.3)*0.12;
            this.group.add(mesh);
            this.planes.push(mesh);
        }
    }

    /**
     * Atualiza o efeito. Deve ser chamado a cada frame.
     * @param {number} delta - Tempo desde o último frame
     */
    update(delta = 0.016) {
        this.time += delta;
        // Calcular centro da AABB do alvo
        const box = new THREE.Box3().setFromObject(this.target);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.group.position.copy(center);
        // Sobe ligeiramente as labaredas
        this.group.position.y += (this.height * 2.0) * 0.18;
        // Anima fumaça: sobe, some e reaparece
        const smokeBaseY = (this.height * 2.0) * 0.48;
        for (let i = 0; i < this.smokeParticles.length; i++) {
            const mesh = this.smokeParticles[i];
            // Movimento vertical e horizontal oscilante
            const t = this.time + i*0.7;
            mesh.position.x = Math.sin(t*0.5 + i)*0.5 + Math.sin(t*1.1 + i*0.3)*0.12;
            mesh.position.z = Math.cos(t*0.6 + i*0.8)*0.5 + Math.cos(t*1.3 + i*0.2)*0.13;
            mesh.position.y = smokeBaseY + (t%2.5)*0.95 + Math.sin(t*0.9 + i)*0.13;
            // Opacidade diminui conforme sobe
            mesh.material.opacity = Math.max(0, 0.32 - (mesh.position.y-smokeBaseY)*0.18 + Math.sin(t*0.8)*0.06);
            // Reinicia quando sobe demais
            if (mesh.position.y > smokeBaseY + 1.3) {
                mesh.position.y = smokeBaseY + Math.random()*0.18;
            }
        }
        // Anima os planos: gira, ondula, muda opacidade
        for (let i = 0; i < this.planes.length; i++) {
            const mesh = this.planes[i];
            // Rotação animada
            mesh.rotation.y = (i / this.planes.length) * Math.PI + Math.sin(this.time*0.6 + i)*0.08;
            // "Respiração" do fogo (alarga e encolhe)
            const scale = 1 + Math.sin(this.time*2 + i*1.2)*0.19 + Math.sin(this.time*2.7 + i*0.7)*0.10;
            mesh.scale.set(scale, scale + Math.sin(this.time*2.2 + i)*0.12, 1);
            // Opacidade animada
            mesh.material.opacity = 0.7 + 0.25*Math.abs(Math.sin(this.time*3 + i));
        }
    }

    /** Remove o efeito da cena */
    dispose() {
        this.scene.remove(this.group);
        if (this.planes) {
            this.planes.forEach(p => p.geometry.dispose());
            this.planes.forEach(p => p.material.dispose());
            this.planes = [];
        }
    }
}

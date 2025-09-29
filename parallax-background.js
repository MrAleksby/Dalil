// 3D Параллакс фон для BMK Jump
class ParallaxBackground {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clouds = [];
        this.animationId = null;
        this.cameraY = 0; // Синхронизация с игрой
        this.init();
    }
    
    init() {
        if (typeof THREE === 'undefined') {
            console.warn('Three.js не загружен. 3D фон отключен.');
            return;
        }
        
        // Создаем контейнер
        this.container = document.getElementById('threejs-background');
        if (!this.container) {
            console.warn('Контейнер threejs-background не найден');
            return;
        }
        
        // Создаем сцену
        this.scene = new THREE.Scene();
        
        // Градиентный фон (небо)
        this.scene.background = new THREE.Color(0x87CEEB); // Светло-голубой
        
        // Создаем камеру
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);
        
        // Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.container.offsetWidth || 400, this.container.offsetHeight || 600);
        this.renderer.setClearColor(0x000000, 0); // Прозрачный фон
        
        // Добавляем в контейнер
        this.container.appendChild(this.renderer.domElement);
        
        // Создаем параллакс элементы
        this.createClouds();
        this.createSkyGradient();
        
        // Обработчик изменения размера
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Запускаем анимацию
        this.animate();
        
        console.log('3D Параллакс фон инициализирован!');
    }
    
    createSkyGradient() {
        // Создаем градиентное небо с помощью PlaneGeometry
        const geometry = new THREE.PlaneGeometry(50, 50);
        
        // Создаем материал с градиентом
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Создаем градиент от голубого к белому
        const gradient = context.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#87CEEB'); // Светло-голубой
        gradient.addColorStop(0.5, '#ADD8E6'); // Более светлый голубой
        gradient.addColorStop(1, '#F0F8FF'); // Почти белый
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.3
        });
        
        const skyPlane = new THREE.Mesh(geometry, material);
        skyPlane.position.z = -20; // Далеко сзади
        this.scene.add(skyPlane);
    }
    
    createClouds() {
        // Создаем несколько слоев облаков для параллакса
        this.createCloudLayer(8, -15, 0.2, 0.8); // Дальние облака
        this.createCloudLayer(6, -10, 0.4, 1.2); // Средние облака  
        this.createCloudLayer(4, -5, 0.6, 1.8);  // Ближние облака
    }
    
    createCloudLayer(count, zPosition, speed, scale) {
        const cloudLayer = {
            clouds: [],
            speed: speed,
            zPosition: zPosition
        };
        
        for (let i = 0; i < count; i++) {
            const cloud = this.createSingleCloud(scale);
            
            // Случайное расположение
            cloud.position.x = (Math.random() - 0.5) * 30;
            cloud.position.y = Math.random() * 20 - 10;
            cloud.position.z = zPosition + (Math.random() - 0.5) * 2;
            
            // Добавляем к слою
            cloudLayer.clouds.push(cloud);
            this.scene.add(cloud);
        }
        
        this.clouds.push(cloudLayer);
    }
    
    createSingleCloud() {
        const cloudGroup = new THREE.Group();
        
        // Создаем облако из нескольких сфер
        const cloudParts = 5 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < cloudParts; i++) {
            const geometry = new THREE.SphereGeometry(
                0.5 + Math.random() * 0.8,  // Размер
                8, 6  // Упрощенная геометрия для производительности
            );
            
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6 + Math.random() * 0.3
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            
            // Случайное расположение частей облака
            sphere.position.x = (Math.random() - 0.5) * 3;
            sphere.position.y = (Math.random() - 0.5) * 1;
            sphere.position.z = (Math.random() - 0.5) * 1;
            
            cloudGroup.add(sphere);
        }
        
        return cloudGroup;
    }
    
    // Синхронизация с игрой
    updateCameraPosition(gameY) {
        if (!this.camera) return;
        
        // Плавное следование за камерой игры
        const targetY = gameY * 0.01; // Масштабируем
        this.cameraY += (targetY - this.cameraY) * 0.05; // Плавное движение
        
        this.camera.position.y = this.cameraY;
    }
    
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Анимация облаков (параллакс эффект)
        this.clouds.forEach(layer => {
            layer.clouds.forEach(cloud => {
                // Медленное движение облаков
                cloud.position.x += layer.speed * 0.01;
                
                // Переносим облако, если оно ушло за край
                if (cloud.position.x > 20) {
                    cloud.position.x = -20;
                    cloud.position.y = Math.random() * 20 - 10;
                }
                
                // Легкое покачивание
                cloud.rotation.z += 0.002;
                cloud.position.y += Math.sin(Date.now() * 0.001 + cloud.position.x) * 0.005;
            });
        });
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        
        const width = this.container.offsetWidth || 400;
        const height = this.container.offsetHeight || 600;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    // Очистка ресурсов
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Очищаем сцену
        if (this.scene) {
            this.scene.clear();
        }
    }
}

// Экспорт для использования в основной игре
window.ParallaxBackground = ParallaxBackground;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Адаптивный размер canvas
        this.setupCanvas();
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => this.setupCanvas());
        
        // ID анимации для отмены
        this.animationId = null;
        
        // Устанавливаем константы для физики (они не будут меняться)
        this.INITIAL_JUMP_FORCE = -15;
        this.INITIAL_GRAVITY = 0.4;
        this.INITIAL_MOVE_SPEED = 0.5;
        this.INITIAL_MAX_VELOCITY = 7;
        
        // Добавляем параметры для анимации счета
        this.scoreDisplay = {
            current: 0,
            target: 0,
            scale: 1
        };
        
        // Привязываем методы
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Добавляем обработчики событий
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Создаем градиент для фона
        this.backgroundGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        this.backgroundGradient.addColorStop(0, '#00BFFF');  // Синее небо
        this.backgroundGradient.addColorStop(0.7, '#87CEEB'); // Более светлое небо
        this.backgroundGradient.addColorStop(0.7, '#90EE90'); // Начало травы
        this.backgroundGradient.addColorStop(1, '#228B22');   // Темно-зеленая трава
        
        // Градиент для платформ
        this.platformGradient = this.ctx.createLinearGradient(0, 0, 0, 15);
        this.platformGradient.addColorStop(0, '#FFFFFF');    // Белый
        this.platformGradient.addColorStop(1, '#E0E0E0');    // Светло-серый
        
        // Добавляем параметры для противника
        this.enemy = {
            active: false,
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            platform: null,
            nextSpawnScore: 1000,
            lastSpawnScore: 0  // Добавляем отслеживание последнего появления
        };
        
        // Добавляем параметры для мобильного управления
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.accelerometer = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // Настраиваем управление
        this.setupControls();
        
        this.startNewGame();
    }
    
    setupCanvas() {
        // Базовое соотношение сторон
        const baseWidth = 400;
        const baseHeight = 600;
        const baseRatio = baseWidth / baseHeight;
        
        // Получаем доступное пространство
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const windowRatio = windowWidth / windowHeight;
        
        // Вычисляем оптимальный размер
        let width, height;
        if (windowRatio > baseRatio) {
            height = Math.min(windowHeight, baseHeight);
            width = height * baseRatio;
        } else {
            width = Math.min(windowWidth, baseWidth);
            height = width / baseRatio;
        }
        
        // Устанавливаем размеры canvas
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Обновляем градиенты
        this.createGradients();
    }
    
    createGradients() {
        // Пересоздаем градиенты с новыми размерами
        this.backgroundGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        this.backgroundGradient.addColorStop(0, '#00BFFF');
        this.backgroundGradient.addColorStop(0.7, '#87CEEB');
        this.backgroundGradient.addColorStop(0.7, '#90EE90');
        this.backgroundGradient.addColorStop(1, '#228B22');
        
        this.platformGradient = this.ctx.createLinearGradient(0, 0, 0, 15);
        this.platformGradient.addColorStop(0, '#FFFFFF');
        this.platformGradient.addColorStop(1, '#E0E0E0');
    }
    
    setupControls() {
        // Клавиатура
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        if (this.isMobile) {
            // Акселерометр
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', (e) => {
                    this.handleOrientation(e);
                });
            }
            
            // Кнопки управления
            const leftButton = document.getElementById('leftButton');
            const rightButton = document.getElementById('rightButton');
            
            // Обработчики для сенсорного управления
            leftButton.addEventListener('touchstart', () => this.keys.left = true);
            leftButton.addEventListener('touchend', () => this.keys.left = false);
            rightButton.addEventListener('touchstart', () => this.keys.right = true);
            rightButton.addEventListener('touchend', () => this.keys.right = false);
            
            // Предотвращаем стандартные действия браузера
            leftButton.addEventListener('touchstart', (e) => e.preventDefault());
            rightButton.addEventListener('touchstart', (e) => e.preventDefault());
        }
    }
    
    handleOrientation(event) {
        if (event.gamma === null) return;
        
        // Наклон телефона (gamma) для движения влево-вправо
        const tiltThreshold = 10; // Порог наклона
        if (event.gamma < -tiltThreshold) {
            this.keys.left = true;
            this.keys.right = false;
        } else if (event.gamma > tiltThreshold) {
            this.keys.left = false;
            this.keys.right = true;
        } else {
            this.keys.left = false;
            this.keys.right = false;
        }
    }
    
    startNewGame() {
        // Отменяем предыдущую анимацию если она есть
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Персонаж
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 40,
            height: 40,
            velocityY: -15,
            velocityX: 0,
            rotation: 0  // Для наклона персонажа
        };
        
        // Игровые параметры
        this.platforms = [];
        this.score = 0;
        this.camera = {
            y: 0
        };
        this.gameOver = false;
        
        // Физика - фиксированные значения
        this.gravity = 0.4;
        this.jumpForce = -15;
        this.moveSpeed = 0.5;
        this.maxVelocityX = 7;
        
        // Управление
        this.keys = {
            left: false,
            right: false
        };
        
        // Добавляем параметры для логотипа
        this.logo = {
            text: 'DALIL',
            x: 0,
            y: 0,
            alpha: 0.2  // Прозрачность логотипа
        };
        
        // Создаем платформы
        this.createPlatforms();
        
        // Сбрасываем параметры противника
        this.enemy.active = false;
        this.enemy.nextSpawnScore = 1000;
        this.enemy.lastSpawnScore = 0;
        
        // Запускаем новый игровой цикл
        this.gameLoop();
    }
    
    createPlatforms() {
        this.platforms = [];
        for(let i = 0; i < 15; i++) {
            this.platforms.push({
                x: Math.random() * (this.canvas.width - 60),
                y: this.canvas.height - (i * 60),
                width: 60,
                height: 15
            });
        }
    }
    
    handleKeyDown(e) {
        if(e.code === 'ArrowLeft') this.keys.left = true;
        if(e.code === 'ArrowRight') this.keys.right = true;
    }
    
    handleKeyUp(e) {
        if(e.code === 'ArrowLeft') this.keys.left = false;
        if(e.code === 'ArrowRight') this.keys.right = false;
    }
    
    update() {
        if(this.gameOver) return;

        // Обновляем физику персонажа
        this.player.velocityY += this.gravity;
        
        // Более плавное движение влево-вправо с ускорением
        if(this.keys.left) {
            this.player.velocityX -= this.moveSpeed;
            this.player.rotation = -0.2;  // Наклон влево
        } else if(this.keys.right) {
            this.player.velocityX += this.moveSpeed;
            this.player.rotation = 0.2;   // Наклон вправо
        } else {
            this.player.velocityX *= 0.95;  // Трение
            this.player.rotation = 0;     // Возврат к прямому положению
        }
        
        // Ограничиваем максимальную скорость
        this.player.velocityX = Math.max(Math.min(this.player.velocityX, this.maxVelocityX), -this.maxVelocityX);
        
        // Обновляем позицию
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;
        
        // Телепортация через края экрана
        if(this.player.x + this.player.width < 0) {
            this.player.x = this.canvas.width;
        }
        if(this.player.x > this.canvas.width) {
            this.player.x = -this.player.width;
        }
        
        // Проверяем столкновения с платформами
        this.platforms.forEach(platform => {
            if(this.checkCollision(this.player, platform)) {
                if(this.player.velocityY > 0 && 
                   this.player.y + this.player.height < platform.y + platform.height + this.player.velocityY) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = this.jumpForce;
                }
            }
        });
        
        // Обновляем камеру и счет
        if(this.player.y < this.canvas.height / 2) {
            let diff = this.canvas.height / 2 - this.player.y;
            this.camera.y += diff;
            this.player.y += diff;
            this.platforms.forEach(platform => {
                platform.y += diff;
            });
            this.score += Math.floor(diff);
            
            // Анимация счета
            this.scoreDisplay.target = Math.floor(this.score);
            this.scoreDisplay.scale = 1.2;
        }
        
        // Плавное обновление счета
        if(this.scoreDisplay.current < this.scoreDisplay.target) {
            this.scoreDisplay.current += Math.ceil((this.scoreDisplay.target - this.scoreDisplay.current) * 0.1);
        }
        
        // Возвращаем масштаб к нормальному
        this.scoreDisplay.scale = this.scoreDisplay.scale * 0.95 + 1 * 0.05;
        
        // Генерация новых платформ
        this.platforms = this.platforms.filter(platform => platform.y < this.canvas.height);
        while(this.platforms.length < 15) {
            let lastPlatform = this.platforms[this.platforms.length - 1];
            this.platforms.push({
                x: Math.random() * (this.canvas.width - 60),
                y: lastPlatform.y - (Math.random() * 40 + 40),  // Более равномерное распределение
                width: 60,
                height: 15
            });
        }
        
        // Проверяем необходимость создания противника
        // Проверяем, пересекли ли мы новую тысячу очков
        const currentThousand = Math.floor(this.score / 1000) * 1000;
        if(currentThousand > this.enemy.lastSpawnScore) {
            this.enemy.lastSpawnScore = currentThousand;
            this.spawnEnemy();
        }

        // Если противник активен, обновляем его позицию вместе с платформой
        if(this.enemy.active) {
            this.enemy.y = this.enemy.platform.y;
            
            // Удаляем противника, если его платформа ушла за пределы экрана
            if(this.enemy.y > this.canvas.height) {
                this.enemy.active = false;
            }
            
            // Проверяем столкновение с противником
            if(this.checkCollision(this.player, this.enemy)) {
                this.gameOver = true;
                setTimeout(() => this.startNewGame(), 1000);
                return;
            }
        }
        
        // Проверка на проигрыш
        if(this.player.y > this.canvas.height) {
            this.gameOver = true;
            setTimeout(() => this.startNewGame(), 1000);
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    drawKenito(x, y, rotation) {
        this.ctx.save();
        this.ctx.translate(x + this.player.width/2, y + this.player.height/2);
        this.ctx.rotate(rotation);

        // Размеры частей тела
        const headRadius = this.player.width/2;
        const legWidth = headRadius/2;
        const legHeight = headRadius;
        const bootHeight = headRadius/2;
        const hornLength = headRadius/2;

        // Рисуем тело (голову)
        this.ctx.beginPath();
        this.ctx.fillStyle = '#FF69B4'; // Розовый цвет
        this.ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем рожки
        this.ctx.beginPath();
        this.ctx.fillStyle = '#FF69B4';
        // Левый рожок
        this.ctx.moveTo(-headRadius/2, -headRadius/2);
        this.ctx.lineTo(-headRadius-hornLength, -headRadius);
        this.ctx.lineTo(-headRadius-hornLength, -headRadius+hornLength);
        this.ctx.fill();
        // Правый рожок
        this.ctx.beginPath();
        this.ctx.moveTo(headRadius/2, -headRadius/2);
        this.ctx.lineTo(headRadius+hornLength, -headRadius);
        this.ctx.lineTo(headRadius+hornLength, -headRadius+hornLength);
        this.ctx.fill();

        // Рисуем глаза
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/3, -headRadius/4, headRadius/4, 0, Math.PI * 2);
        this.ctx.arc(headRadius/3, -headRadius/4, headRadius/4, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем улыбку
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.arc(0, 0, headRadius/3, 0, Math.PI);
        this.ctx.stroke();

        // Рисуем ноги
        this.ctx.fillStyle = 'black';
        // Левая нога
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius, legWidth, legHeight);
        // Правая нога
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius, legWidth, legHeight);

        // Рисуем ботинки
        this.ctx.fillStyle = '#FF69B4';
        // Левый ботинок
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius+legHeight, legWidth, bootHeight);
        // Правый ботинок
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius+legHeight, legWidth, bootHeight);

        this.ctx.restore();
    }

    drawEvilKenito(x, y) {
        this.ctx.save();
        this.ctx.translate(x + this.enemy.width/2, y + this.enemy.height/2);

        // Размеры частей тела
        const headRadius = this.enemy.width/2;
        const legWidth = headRadius/2;
        const legHeight = headRadius;
        const bootHeight = headRadius/2;
        const hornLength = headRadius/2;

        // Рисуем тело (голову) - красного цвета
        this.ctx.beginPath();
        this.ctx.fillStyle = '#FF0000';
        this.ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем рожки - темно-красные
        this.ctx.beginPath();
        this.ctx.fillStyle = '#8B0000';
        // Левый рожок
        this.ctx.moveTo(-headRadius/2, -headRadius/2);
        this.ctx.lineTo(-headRadius-hornLength, -headRadius);
        this.ctx.lineTo(-headRadius-hornLength, -headRadius+hornLength);
        this.ctx.fill();
        // Правый рожок
        this.ctx.beginPath();
        this.ctx.moveTo(headRadius/2, -headRadius/2);
        this.ctx.lineTo(headRadius+hornLength, -headRadius);
        this.ctx.lineTo(headRadius+hornLength, -headRadius+hornLength);
        this.ctx.fill();

        // Рисуем глаза - желтые
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/3, -headRadius/4, headRadius/4, 0, Math.PI * 2);
        this.ctx.arc(headRadius/3, -headRadius/4, headRadius/4, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем злую улыбку
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.arc(0, headRadius/4, headRadius/3, 0, Math.PI, true);  // Перевернутая улыбка
        this.ctx.stroke();

        // Рисуем ноги - черные
        this.ctx.fillStyle = 'black';
        // Левая нога
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius, legWidth, legHeight);
        // Правая нога
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius, legWidth, legHeight);

        // Рисуем ботинки - темно-красные
        this.ctx.fillStyle = '#8B0000';
        // Левый ботинок
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius+legHeight, legWidth, bootHeight);
        // Правый ботинок
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius+legHeight, legWidth, bootHeight);

        this.ctx.restore();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем фон
        this.ctx.fillStyle = this.backgroundGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Добавляем облака
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        // Несколько статичных облаков
        this.drawCloud(50, 50, 40);
        this.drawCloud(200, 100, 50);
        this.drawCloud(350, 70, 45);
        
        // Рисуем платформы
        this.platforms.forEach(platform => {
            // Тень для платформы
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetY = 2;
            
            // Основная платформа
            this.ctx.fillStyle = this.platformGradient;
            this.ctx.beginPath();
            this.ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 5);
            this.ctx.fill();
        });
        
        // Сбрасываем тени перед рисованием Кенито
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Рисуем Кенито
        this.drawKenito(this.player.x, this.player.y, this.player.rotation);
        
        // Рисуем противника, если он активен
        if(this.enemy.active) {
            this.drawEvilKenito(this.enemy.x, this.enemy.y);
        }
        
        // Рисуем логотип с эффектом свечения
        this.ctx.save();
        this.ctx.globalAlpha = this.logo.alpha;
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.logo.text, this.canvas.width / 2, 70);
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
        
        // Рисуем счет с красивым оформлением
        this.ctx.save();
        
        // Фон для счета
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.roundRect(5, 5, 150, 40, 10);
        this.ctx.fill();
        
        // Применяем масштабирование для анимации
        this.ctx.translate(80, 30);
        this.ctx.scale(this.scoreDisplay.scale, this.scoreDisplay.scale);
        this.ctx.translate(-80, -30);
        
        // Рисуем текст счета
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`СЧЕТ: ${this.scoreDisplay.current}`, 15, 32);
        
        this.ctx.restore();
        
        // Сообщение о проигрыше
        if(this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('DALIL', this.canvas.width/2, this.canvas.height/2 - 60);
            this.ctx.font = '30px Arial';
            this.ctx.fillText('Игра окончена!', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Финальный счет: ${Math.floor(this.score)}`, this.canvas.width/2, this.canvas.height/2 + 40);
        }
    }
    
    drawCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
        this.ctx.arc(x + size, y, size * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.gameLoop);
    }

    spawnEnemy() {
        // Выбираем случайную платформу из верхней половины экрана
        const upperPlatforms = this.platforms.filter(p => p.y < this.canvas.height / 2);
        if(upperPlatforms.length > 0) {
            const platform = upperPlatforms[Math.floor(Math.random() * upperPlatforms.length)];
            this.enemy.active = true;
            this.enemy.platform = platform;
            this.enemy.x = platform.x + platform.width/2 - this.enemy.width/2;
            this.enemy.y = platform.y;
        }
    }
}

const game = new Game(); 
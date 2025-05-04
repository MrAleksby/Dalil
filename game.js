class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        
        // Определяем, является ли устройство мобильным
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Настраиваем размер канваса
        this.setupCanvas();
        
        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.createGradients();
        });
        
        // Исправляем высоту для мобильных браузеров
        this.fixMobileHeight();
        
        // ID анимации для отмены
        this.animationId = null;
        
        // Возвращаем стандартные параметры физики для всех устройств
        this.INITIAL_JUMP_FORCE = this.isMobile ? -12 : -15;
        this.INITIAL_GRAVITY = this.isMobile ? 0.35 : 0.4;
        this.INITIAL_MOVE_SPEED = this.isMobile ? 0.7 : 0.5;
        this.INITIAL_MAX_VELOCITY = this.isMobile ? 9 : 7;
        
        // Добавляем параметры для анимации счета
        this.scoreDisplay = {
            current: 0,
            target: 0,
            scale: 1
        };
        
        // Добавляем параметры для плавности движения на мобильных
        this.touchSensitivity = 0.8;
        this.movementSmoothing = this.isMobile ? 0.85 : 0.95;
        
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
            nextSpawnScore: 800,  // Начинаем с 800 очков
            lastSpawnScore: 0,
            warningAlpha: 0  // Для мигания
        };
        
        // Добавляем параметры для мобильного управления
        this.accelerometer = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // Настраиваем управление
        this.setupControls();
        
        // Добавляем параметры для скримера
        this.jumpscare = {
            active: false,
            prePhase: false,
            timer: 0,
            duration: 120,
            preTimer: 0,
            preDuration: 180,
            scale: 1,
            opacity: 0,
            triggered: false,
            lastTriggerScore: 0,
            nextTriggerScore: 5000,  // Добавляем следующую цель
            sound: new Audio('napryajennyiy-zvuk.mp3')
        };
        
        // Предзагружаем звук и устанавливаем максимальную громкость
        this.jumpscare.sound.load();
        this.jumpscare.sound.volume = 1.0;  // Максимальная громкость
        
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.backgroundMusic.volume = 1.0; // Устанавливаем громкость на 100%
        this.musicButton = document.getElementById('musicToggle');
        this.isMusicPlaying = true;
        this.initBackgroundMusic();
        
        this.startNewGame();
    }
    
    fixMobileHeight() {
        // Исправляем проблему с высотой на мобильных устройствах
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        window.addEventListener('resize', () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
    }
    
    setupCanvas() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
        
        // Базовые размеры для масштабирования
        const baseWidth = 400;
        const baseHeight = 600;
        
        // Вычисляем масштаб, сохраняя пропорции
        const scaleX = windowWidth / baseWidth;
        const scaleY = windowHeight / baseHeight;
        
        // На мобильных используем минимальный масштаб для лучшей видимости
        this.scale = this.isMobile ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
        
        // Масштабируем игровые объекты
        if (this.player) {
            const playerBaseSize = this.isMobile ? 35 : 40;
            this.player.width = playerBaseSize * this.scale;
            this.player.height = playerBaseSize * this.scale;
        }
        
        // Масштабируем платформы
        if (this.platforms) {
            const platformBaseWidth = this.isMobile ? 50 : 60;
            this.platforms.forEach(platform => {
                platform.width = platformBaseWidth * this.scale;
                platform.height = 15 * this.scale;
            });
        }
        
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
        if (!this.isMobile) {
            // Управление клавиатурой для десктопа
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        } else {
            // Улучшенное управление касанием для мобильных
            let touchStartX = 0;
            let touchStartTime = 0;
            
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartTime = Date.now();
                
                const rect = this.canvas.getBoundingClientRect();
                if (touchStartX < rect.width / 2) {
                    this.keys.left = true;
                    this.keys.right = false;
                } else {
                    this.keys.left = false;
                    this.keys.right = true;
                }
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const currentX = touch.clientX;
                const deltaX = currentX - touchStartX;
                
                // Плавное изменение направления
                if (Math.abs(deltaX) > 10) {
                    this.keys.left = deltaX < 0;
                    this.keys.right = deltaX > 0;
                    
                    // Адаптивная скорость в зависимости от силы свайпа
                    const swipeStrength = Math.min(Math.abs(deltaX) / 100, 1);
                    this.moveSpeed = this.INITIAL_MOVE_SPEED * (1 + swipeStrength);
                }
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                
                // Сброс скорости движения
                this.moveSpeed = this.INITIAL_MOVE_SPEED;
                
                // Плавная остановка
                if (touchDuration < 300) { // Короткое касание
                    setTimeout(() => {
                        this.keys.left = false;
                        this.keys.right = false;
                    }, 100);
                } else {
                    this.keys.left = false;
                    this.keys.right = false;
                }
            });

            // Улучшенное управление наклоном
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', (e) => {
                    if (e.gamma === null) return;
                    
                    const tiltThreshold = 8; // Уменьшенный порог наклона
                    const tiltStrength = Math.abs(e.gamma) / 45; // Сила наклона (до 45 градусов)
                    
                    if (e.gamma < -tiltThreshold) {
                        this.keys.left = true;
                        this.keys.right = false;
                        this.moveSpeed = this.INITIAL_MOVE_SPEED * (1 + tiltStrength);
                    } else if (e.gamma > tiltThreshold) {
                        this.keys.left = false;
                        this.keys.right = true;
                        this.moveSpeed = this.INITIAL_MOVE_SPEED * (1 + tiltStrength);
                    } else {
                        this.moveSpeed = this.INITIAL_MOVE_SPEED;
                    }
                });
            }
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
        
        // Физика - используем значения в зависимости от устройства
        this.gravity = this.INITIAL_GRAVITY;
        this.jumpForce = this.INITIAL_JUMP_FORCE;
        this.moveSpeed = this.INITIAL_MOVE_SPEED;
        this.maxVelocityX = this.INITIAL_MAX_VELOCITY;
        
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
        this.enemy.nextSpawnScore = 800;  // Начинаем с 800 очков
        this.enemy.lastSpawnScore = 0;
        this.enemy.warningAlpha = 0;
        
        // Сбрасываем параметры скримера
        this.jumpscare.active = false;
        this.jumpscare.prePhase = false;
        this.jumpscare.timer = 0;
        this.jumpscare.preTimer = 0;
        this.jumpscare.scale = 1;
        this.jumpscare.opacity = 0;
        this.jumpscare.triggered = false;
        this.jumpscare.lastTriggerScore = 0;
        this.jumpscare.nextTriggerScore = 5000;
        
        // Останавливаем звук скримера если он играет
        this.jumpscare.sound.pause();
        this.jumpscare.sound.currentTime = 0;
        
        // Проверяем состояние музыки при старте новой игры
        if (this.isMusicPlaying && this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(error => {
                console.log("Playback prevented:", error);
            });
        }
        
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

        // Обновляем физику с учетом устройства
        this.player.velocityY += this.gravity;
        
        // Плавное управление для мобильных
        const moveMultiplier = this.isMobile ? 1.2 : 1;
        const frictionMultiplier = this.isMobile ? 0.92 : 0.95;
        
        if(this.keys.left) {
            this.player.velocityX = this.player.velocityX * this.movementSmoothing - 
                                  this.moveSpeed * moveMultiplier * (1 - this.movementSmoothing);
            this.player.rotation = -0.2;
        } else if(this.keys.right) {
            this.player.velocityX = this.player.velocityX * this.movementSmoothing + 
                                  this.moveSpeed * moveMultiplier * (1 - this.movementSmoothing);
            this.player.rotation = 0.2;
        } else {
            this.player.velocityX *= frictionMultiplier;
            this.player.rotation = 0;
        }
        
        // Ограничиваем скорость
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
        // Появляемся за 200 очков до следующей тысячи
        const nextThousand = Math.ceil(this.score / 1000) * 1000;
        const spawnThreshold = nextThousand - 200;
        
        if(!this.enemy.active && this.score >= spawnThreshold && this.score < nextThousand && spawnThreshold > this.enemy.lastSpawnScore) {
            this.enemy.lastSpawnScore = spawnThreshold;
            this.spawnEnemy();
        }

        // Если противник активен, обновляем его позицию и эффект мигания
        if(this.enemy.active) {
            this.enemy.y = this.enemy.platform.y;
            
            // Мигающий эффект предупреждения
            this.enemy.warningAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.2;
            
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
        
        // Проверяем условие для начала предварительной фазы скримера
        const preScrimerScore = this.jumpscare.nextTriggerScore - 200;
        
        // Проверяем нужно ли начать предварительную фазу
        if(!this.jumpscare.prePhase && 
           !this.jumpscare.active && 
           this.score >= preScrimerScore && 
           this.score < this.jumpscare.nextTriggerScore) {
            console.log('Starting pre-phase at score:', this.score); // Для отладки
            this.jumpscare.prePhase = true;
            this.jumpscare.triggered = false;
            // Запускаем звук
            this.jumpscare.sound.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Обновляем предварительную фазу
        if(this.jumpscare.prePhase) {
            this.jumpscare.preTimer++;
            
            // Активируем скример если достигли нужного времени или счета
            if(this.jumpscare.preTimer >= this.jumpscare.preDuration || 
               this.score >= this.jumpscare.nextTriggerScore) {
                console.log('Activating jumpscare at score:', this.score); // Для отладки
                this.jumpscare.prePhase = false;
                this.jumpscare.active = true;
                this.jumpscare.triggered = true;
                this.jumpscare.lastTriggerScore = this.jumpscare.nextTriggerScore;
                this.jumpscare.nextTriggerScore += 5000; // Устанавливаем следующую цель
            }
        }
        
        // Обновляем анимацию скримера
        if(this.jumpscare.active) {
            this.jumpscare.timer++;
            
            if(this.jumpscare.timer < 30) {
                // Медленное появление
                this.jumpscare.opacity = this.jumpscare.timer / 30;
                this.jumpscare.scale = 1 + (this.jumpscare.timer / 15);
            } else if(this.jumpscare.timer < this.jumpscare.duration - 30) {
                // Держим дольше
                this.jumpscare.opacity = 1;
                this.jumpscare.scale = 3 + Math.sin(this.jumpscare.timer * 0.1) * 0.2;
            } else if(this.jumpscare.timer < this.jumpscare.duration) {
                // Медленное исчезновение
                this.jumpscare.opacity = (this.jumpscare.duration - this.jumpscare.timer) / 30;
            } else {
                // Завершение скримера
                console.log('Finishing jumpscare, next target:', this.jumpscare.nextTriggerScore); // Для отладки
                this.jumpscare.active = false;
                this.jumpscare.timer = 0;
                this.jumpscare.preTimer = 0;
                // Останавливаем звук
                this.jumpscare.sound.pause();
                this.jumpscare.sound.currentTime = 0;
            }
        }

        // Обновляем счет на экране с анимацией
        const targetScore = Math.floor(this.score);
        const currentScore = parseInt(this.scoreElement.textContent);
        if (currentScore !== targetScore) {
            const diff = targetScore - currentScore;
            const step = Math.max(1, Math.abs(Math.floor(diff / 10)));
            this.scoreElement.textContent = currentScore + Math.sign(diff) * step;
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
        const headRadius = this.player.width/2 * this.scale;
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
        
        // Применяем эффект мигания
        this.ctx.globalAlpha = this.enemy.warningAlpha;
        
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

    drawEvilKenitoJumpscare() {
        this.ctx.save();
        
        // Устанавливаем прозрачность
        this.ctx.globalAlpha = this.jumpscare.opacity;
        
        // Центрируем и масштабируем
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.jumpscare.scale, this.jumpscare.scale);
        
        // Размеры в 2 раза больше обычного
        const headRadius = this.player.width;
        const legWidth = headRadius/2;
        const legHeight = headRadius;
        const hornLength = headRadius/2;
        
        // Рисуем злого Кенито
        // Тело (голова) - ярко-красного цвета
        this.ctx.beginPath();
        this.ctx.fillStyle = '#FF0000';
        this.ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Рожки - темно-красные и острые
        this.ctx.beginPath();
        this.ctx.fillStyle = '#8B0000';
        // Левый рожок
        this.ctx.moveTo(-headRadius/2, -headRadius/2);
        this.ctx.lineTo(-headRadius-hornLength, -headRadius);
        this.ctx.lineTo(-headRadius-hornLength/2, -headRadius+hornLength/2);
        this.ctx.fill();
        // Правый рожок
        this.ctx.beginPath();
        this.ctx.moveTo(headRadius/2, -headRadius/2);
        this.ctx.lineTo(headRadius+hornLength, -headRadius);
        this.ctx.lineTo(headRadius+hornLength/2, -headRadius+hornLength/2);
        this.ctx.fill();
        
        // Глаза - яркие желтые с красным ободком
        this.ctx.fillStyle = '#FFD700';
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/3, -headRadius/4, headRadius/3, 0, Math.PI * 2);
        this.ctx.arc(headRadius/3, -headRadius/4, headRadius/3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Злая улыбка - острые зубы
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(-headRadius/2, headRadius/4);
        for(let i = 0; i < 5; i++) {
            const x = -headRadius/2 + (i * headRadius/2);
            this.ctx.lineTo(x + headRadius/8, headRadius/2);
            this.ctx.lineTo(x + headRadius/4, headRadius/4);
        }
        this.ctx.stroke();
        
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
        
        // Рисуем противника с эффектом предупреждения
        if(this.enemy.active) {
            // Рисуем круг предупреждения
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.enemy.x + this.enemy.width/2, 
                        this.enemy.y + this.enemy.height/2, 
                        this.enemy.width * 0.8,
                        0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.enemy.warningAlpha * 0.3})`;
            this.ctx.fill();
            this.ctx.restore();
            
            // Рисуем злого Кенито
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
        
        // Рисуем эффект предварительной фазы
        if(this.jumpscare.prePhase) {
            // Затемняем экран пульсирующим красным
            const alpha = 0.1 + Math.sin(this.jumpscare.preTimer * 0.1) * 0.05;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Рисуем скример
        if(this.jumpscare.active) {
            // Более сильное затемнение фона
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Добавляем красную виньетку
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width/2, this.canvas.height/2, 0,
                this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(255, 0, 0, ${this.jumpscare.opacity * 0.5})`);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Рисуем злого Кенито
            this.drawEvilKenitoJumpscare();
        }
        
        // Для отладки показываем следующую цель скримера
        if(this.jumpscare.prePhase || this.jumpscare.active) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Next Jumpscare: ${this.jumpscare.nextTriggerScore}`, 10, 50);
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

    initBackgroundMusic() {
        // Начинаем воспроизведение музыки
        const playMusic = () => {
            this.backgroundMusic.play().catch(error => {
                console.log("Autoplay prevented:", error);
            });
        };

        // Обработчик клика по кнопке музыки
        this.musicButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
            if (this.isMusicPlaying) {
                this.backgroundMusic.pause();
                this.musicButton.textContent = '🔈';
            } else {
                this.backgroundMusic.play();
                this.musicButton.textContent = '🔊';
            }
            this.isMusicPlaying = !this.isMusicPlaying;
        });

        // Пытаемся воспроизвести музыку при первом клике пользователя
        document.addEventListener('click', () => {
            if (this.isMusicPlaying) {
                playMusic();
            }
        }, { once: true });

        // Убеждаемся, что музыка продолжает играть после завершения
        this.backgroundMusic.addEventListener('ended', () => {
            if (this.isMusicPlaying) {
                this.backgroundMusic.currentTime = 0;
                playMusic();
            }
        });
    }

    restart() {
        // ... existing code ...
        // Перезапускаем музыку при рестарте
        if (this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(error => {
                console.log("Playback prevented:", error);
            });
        }
        // ... existing code ...
    }
}

const game = new Game(); 
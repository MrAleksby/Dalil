class Game {
    // Константы игры
    static CONSTANTS = {
        INITIAL_JUMP_FORCE: -15,
        INITIAL_GRAVITY: 0.4,
        INITIAL_MOVE_SPEED: 0.5,
        INITIAL_MAX_VELOCITY: 7,
        ENEMY_SPAWN_SCORE: 800,
        ENEMY_SPAWN_THRESHOLD: 400,
        JUMPSCARE_TRIGGER_SCORE: 5000,
        JUMPSCARE_PRE_DURATION: 180,
        JUMPSCARE_DURATION: 120,
        PLATFORM_COUNT: 15,
        PLATFORM_WIDTH: 60,
        PLATFORM_HEIGHT: 15,
        PLAYER_SIZE: 40
    };

    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Адаптивный размер canvas
        this.setupCanvas();
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => this.setupCanvas());
        
        // ID анимации для отмены
        this.animationId = null;
        
        // Устанавливаем константы для физики в зависимости от устройства
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Используем константы для физики
        this.INITIAL_JUMP_FORCE = Game.CONSTANTS.INITIAL_JUMP_FORCE;
        this.INITIAL_GRAVITY = Game.CONSTANTS.INITIAL_GRAVITY;
        this.INITIAL_MOVE_SPEED = Game.CONSTANTS.INITIAL_MOVE_SPEED;
        this.INITIAL_MAX_VELOCITY = Game.CONSTANTS.INITIAL_MAX_VELOCITY;
        
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
        
        // Обработчики событий будут добавлены в setupControls()
        
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
            nextSpawnScore: Game.CONSTANTS.ENEMY_SPAWN_SCORE,
            lastSpawnScore: 0,
            warningAlpha: 0  // Для мигания
        };
        
        // Параметры для мобильного управления (пока не используются)
        // this.accelerometer = { x: 0, y: 0, z: 0 };
        
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
            nextTriggerScore: Game.CONSTANTS.JUMPSCARE_TRIGGER_SCORE,
            sound: new Audio('napryajennyiy-zvuk.mp3'),
            originalMusicVolume: 0.5  // Сохраняем оригинальную громкость музыки
        };
        
        // Предзагружаем звук и устанавливаем максимальную громкость
        this.jumpscare.sound.load();
        this.jumpscare.sound.volume = 1.0;  // Максимальная громкость
        
        // Инициализация аудио
        this.initializeAudio();
        
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
        // Клавиатура для десктопа
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        if (this.isMobile) {
            // Добавляем обработчики для тач-управления
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Предотвращаем стандартное поведение
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                
                // Если тап в левой половине экрана
                if (touchX < rect.width / 2) {
                    this.keys.left = true;
                    this.keys.right = false;
                } 
                // Если тап в правой половине экрана
                else {
                    this.keys.right = true;
                    this.keys.left = false;
                }
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                // Останавливаем движение при отпускании
                this.keys.left = false;
                this.keys.right = false;
            });

            this.canvas.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                // Останавливаем движение при отмене касания
                this.keys.left = false;
                this.keys.right = false;
            });
        }
    }
    
    handleOrientation(event) {
        if (event.gamma === null) return;
        
        // Более мягкое управление наклоном для мобильных устройств
        const tiltThreshold = 10; // Возвращаем исходный порог наклона
        
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

        // Принудительно останавливаем звук скримера и восстанавливаем музыку
        if (this.jumpscare && this.jumpscare.sound) {
            this.jumpscare.sound.pause();
            this.jumpscare.sound.currentTime = 0;
        }
        
        // Восстанавливаем громкость фоновой музыки
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = 0.5;
        }

        // Персонаж
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: Game.CONSTANTS.PLAYER_SIZE,
            height: Game.CONSTANTS.PLAYER_SIZE,
            velocityY: Game.CONSTANTS.INITIAL_JUMP_FORCE,
            velocityX: 0,
            rotation: 0
        };
        
        // Игровые параметры
        this.platforms = [];
        this.score = 0;
        this.camera = {
            y: 0
        };
        this.gameOver = false;
        
        // Физика
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
        
        // Сбрасываем параметры скримера
        this.resetJumpscare();
        
        // Восстанавливаем музыку если она была включена
        if (this.hasUserInteracted) {
            this.backgroundMusic.currentTime = 0;
            if (!this.isMusicPlaying) {
                this.playBackgroundMusic();
            } else {
                // Если музыка уже играет, просто убеждаемся, что громкость правильная
                this.backgroundMusic.play().catch(e => console.log('Music resume failed:', e));
            }
        }
        
        // Создаем платформы
        this.createPlatforms();
        
        // Сбрасываем параметры противника
        this.enemy.active = false;
        this.enemy.nextSpawnScore = Game.CONSTANTS.ENEMY_SPAWN_SCORE;
        this.enemy.lastSpawnScore = 0;
        this.enemy.warningAlpha = 0;
        
        // Запускаем новый игровой цикл
        this.gameLoop();
    }
    
    createPlatforms() {
        this.platforms = [];
        for(let i = 0; i < Game.CONSTANTS.PLATFORM_COUNT; i++) {
            this.platforms.push({
                x: Math.random() * (this.canvas.width - Game.CONSTANTS.PLATFORM_WIDTH),
                y: this.canvas.height - (i * 60),
                width: Game.CONSTANTS.PLATFORM_WIDTH,
                height: Game.CONSTANTS.PLATFORM_HEIGHT
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
        if(this.gameOver) {
            // Если игра окончена, останавливаем скример немедленно
            if(this.jumpscare.active || this.jumpscare.prePhase) {
                this.jumpscare.active = false;
                this.jumpscare.prePhase = false;
                this.jumpscare.sound.pause();
                this.jumpscare.sound.currentTime = 0;
                // Восстанавливаем громкость фоновой музыки
                if(this.backgroundMusic) {
                    this.backgroundMusic.volume = 0.5;
                }
            }
            return;
        }

        // Обновляем физику персонажа с более плавным ускорением
        this.player.velocityY += this.gravity;
        
        // Возвращаем стандартное управление для всех устройств
        if(this.keys.left) {
            this.player.velocityX -= this.moveSpeed;
            this.player.rotation = -0.2;
        } else if(this.keys.right) {
            this.player.velocityX += this.moveSpeed;
            this.player.rotation = 0.2;
        } else {
            this.player.velocityX *= 0.95;  // Стандартное трение
            this.player.rotation = 0;
        }
        
        // Ограничиваем максимальную скорость
        this.player.velocityX = Math.max(Math.min(this.player.velocityX, this.maxVelocityX), -this.maxVelocityX);
        
        // Обновляем позицию с оптимизированной физикой
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
        while(this.platforms.length < Game.CONSTANTS.PLATFORM_COUNT) {
            let lastPlatform = this.platforms[this.platforms.length - 1];
            this.platforms.push({
                x: Math.random() * (this.canvas.width - Game.CONSTANTS.PLATFORM_WIDTH),
                y: lastPlatform.y - (Math.random() * 40 + 40),  // Более равномерное распределение
                width: Game.CONSTANTS.PLATFORM_WIDTH,
                height: Game.CONSTANTS.PLATFORM_HEIGHT
            });
        }
        
        // Проверяем необходимость создания противника
        const nextThousand = Math.ceil(this.score / 1000) * 1000;
        const spawnThreshold = nextThousand - Game.CONSTANTS.ENEMY_SPAWN_THRESHOLD;
        
        if(!this.enemy.active && this.score >= spawnThreshold && this.score < nextThousand && spawnThreshold > this.enemy.lastSpawnScore) {
            this.enemy.lastSpawnScore = spawnThreshold;
            this.spawnEnemy();
        }

        // Если противник активен, обновляем его позицию и эффект мигания
        if(this.enemy.active) {
            this.enemy.y = this.enemy.platform.y;
            
            // Более плавное и заметное мигание
            this.enemy.warningAlpha = 0.5 + Math.sin(Date.now() / 300) * 0.3;
            
            // Удаляем противника, если его платформа ушла за пределы экрана
            if(this.enemy.y > this.canvas.height) {
                this.enemy.active = false;
            }
            
            // Проверяем столкновение с противником с небольшим буфером
            if(this.checkCollision(this.player, {
                x: this.enemy.x + 5,
                y: this.enemy.y + 5,
                width: this.enemy.width - 10,
                height: this.enemy.height - 10
            })) {
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
        const currentScrimerTarget = this.jumpscare.nextTriggerScore;
        const preScrimerScore = currentScrimerTarget - 200;  // За 200 очков до следующей отметки

        // Проверяем, что текущий счет достиг нужной отметки
        if(!this.jumpscare.triggered && 
           !this.jumpscare.prePhase && 
           this.score >= preScrimerScore) {
            console.log('Подготовка скримера для отметки:', currentScrimerTarget);
            this.jumpscare.prePhase = true;
            // Сохраняем текущую громкость музыки
            this.jumpscare.originalMusicVolume = this.backgroundMusic.volume;
            // Постепенно уменьшаем громкость фоновой музыки
            const fadeOutInterval = setInterval(() => {
                if(this.backgroundMusic.volume > 0.1) {
                    this.backgroundMusic.volume -= 0.1;
                } else {
                    clearInterval(fadeOutInterval);
                }
            }, 100);
            // Запускаем звук скримера
            this.jumpscare.sound.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Обновляем предварительную фазу
        if(this.jumpscare.prePhase && !this.jumpscare.active) {
            this.jumpscare.preTimer++;
            
            // Активируем скример если достигли нужного времени или счета
            if(this.jumpscare.preTimer >= this.jumpscare.preDuration || this.score >= currentScrimerTarget) {
                this.jumpscare.prePhase = false;
                this.jumpscare.active = true;
                this.jumpscare.triggered = true;
                console.log('Активация скримера на отметке:', currentScrimerTarget);
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
                this.jumpscare.active = false;
                this.jumpscare.triggered = false;
                this.jumpscare.timer = 0;
                this.jumpscare.preTimer = 0;
                // Устанавливаем следующую отметку для скримера
                this.jumpscare.nextTriggerScore += 5000;
                console.log('Следующий скример будет на:', this.jumpscare.nextTriggerScore);
                // Останавливаем звук скримера
                this.jumpscare.sound.pause();
                this.jumpscare.sound.currentTime = 0;
                // Восстанавливаем громкость фоновой музыки
                const fadeInInterval = setInterval(() => {
                    if(this.backgroundMusic.volume < this.jumpscare.originalMusicVolume) {
                        this.backgroundMusic.volume += 0.1;
                    } else {
                        clearInterval(fadeInInterval);
                    }
                }, 100);
            }
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
        // Выбираем платформу из верхней трети экрана
        const upperPlatforms = this.platforms.filter(p => p.y < this.canvas.height / 3);
        if(upperPlatforms.length > 0) {
            // Выбираем самую верхнюю платформу из доступных
            const platform = upperPlatforms.reduce((highest, current) => 
                current.y < highest.y ? current : highest
            , upperPlatforms[0]);
            
            this.enemy.active = true;
            this.enemy.platform = platform;
            this.enemy.x = platform.x + platform.width/2 - this.enemy.width/2;
            this.enemy.y = platform.y;
            
            // Добавляем визуальное предупреждение
            this.enemy.warningAlpha = 0.8;  // Делаем предупреждение более заметным
        }
    }

    initializeAudio() {
        // Инициализация фоновой музыки
        this.backgroundMusic = new Audio('Standoff 2 .mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;
        
        // Флаги для управления музыкой
        this.isMusicPlaying = false;
        this.hasUserInteracted = false;
        
        // Кнопка управления музыкой
        this.musicButton = document.getElementById('musicToggle');
        this.musicButton.addEventListener('click', () => {
            this.hasUserInteracted = true;  // Устанавливаем флаг при клике на кнопку
            this.toggleMusic();
        });

        // Обработчики для запуска музыки после взаимодействия
        const startMusic = () => {
            if (!this.hasUserInteracted) {
                this.hasUserInteracted = true;
                this.playBackgroundMusic();
            }
        };

        // Добавляем несколько типов событий для большей надежности
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('touchstart', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
        
        // Обработчик ошибок для аудио
        this.backgroundMusic.addEventListener('error', (e) => {
            console.error('Ошибка загрузки аудио:', e);
            console.log('Путь к файлу:', this.backgroundMusic.src);
        });
    }

    playBackgroundMusic() {
        if (this.hasUserInteracted && !this.isMusicPlaying) {
            console.log('Попытка воспроизведения музыки...');
            const playPromise = this.backgroundMusic.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.isMusicPlaying = true;
                        this.musicButton.querySelector('.music-icon').textContent = '🔊';
                        console.log('Музыка успешно запущена');
                    })
                    .catch(e => {
                        console.error('Ошибка воспроизведения:', e);
                        // Пробуем воспроизвести через небольшую задержку
                        setTimeout(() => {
                            if (!this.isMusicPlaying) {
                                this.playBackgroundMusic();
                            }
                        }, 1000);
                    });
            }
        }
    }

    toggleMusic() {
        if (this.isMusicPlaying) {
            this.backgroundMusic.pause();
            this.isMusicPlaying = false;
            this.musicButton.querySelector('.music-icon').textContent = '🔈';
        } else if (this.hasUserInteracted) {
            this.playBackgroundMusic();
        }
    }

    /**
     * Сбрасывает параметры скримера
     */
    resetJumpscare() {
        this.jumpscare = {
            active: false,
            prePhase: false,
            timer: 0,
            duration: Game.CONSTANTS.JUMPSCARE_DURATION,
            preTimer: 0,
            preDuration: Game.CONSTANTS.JUMPSCARE_PRE_DURATION,
            scale: 1,
            opacity: 0,
            triggered: false,
            nextTriggerScore: Game.CONSTANTS.JUMPSCARE_TRIGGER_SCORE,
            sound: this.jumpscare ? this.jumpscare.sound : new Audio('napryajennyiy-zvuk.mp3')
        };
    }
}

const game = new Game(); 
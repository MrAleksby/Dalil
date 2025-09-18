class Game {
    // Константы игры
    static CONSTANTS = {
        INITIAL_JUMP_FORCE: -15,
        INITIAL_GRAVITY: 0.4,
        INITIAL_MOVE_SPEED: 0.8,
        INITIAL_MAX_VELOCITY: 7.5,
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
        
        // НЕ запускаем игру автоматически - только при нажатии кнопки
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
            this.player.velocityX *= 0.92;  // Улучшенное трение для более плавного движения
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
                setTimeout(() => this.endGame(), 1000);
                return;
            }
        }
        
        // Проверка на проигрыш
        if(this.player.y > this.canvas.height) {
            this.gameOver = true;
            setTimeout(() => this.endGame(), 1000);
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
        const bodyWidth = headRadius * 1.3;
        const bodyHeight = headRadius * 1.8;
        const legWidth = headRadius/2.2;
        const legHeight = headRadius * 1.3;
        const bootHeight = headRadius/3;

        // Рисуем голову (БОЛЬШАЯ, как в Roblox)
        this.ctx.fillStyle = '#F4C2A1'; // Светлый цвет кожи
        this.ctx.fillRect(-headRadius * 1.2, -headRadius * 1.2, headRadius * 2.4, headRadius * 2.4);

        // Рисуем волосы (оранжевые, БОЛЬШИЕ)
        this.ctx.fillStyle = '#FF8C00'; // Ярко-оранжевый цвет
        this.ctx.fillRect(-headRadius * 1.1, -headRadius * 1.4, headRadius * 2.2, headRadius * 0.8);
        
        // Боковые части волос (БОЛЬШИЕ)
        this.ctx.fillRect(-headRadius * 1.3, -headRadius * 1.0, headRadius * 0.4, headRadius * 1.0);
        this.ctx.fillRect(headRadius * 0.9, -headRadius * 1.0, headRadius * 0.4, headRadius * 1.0);
        
        // Челка с прядями
        this.ctx.fillRect(-headRadius * 0.8, -headRadius * 1.3, headRadius * 0.4, headRadius * 0.4);
        this.ctx.fillRect(-headRadius * 0.4, -headRadius * 1.3, headRadius * 0.4, headRadius * 0.4);
        this.ctx.fillRect(0, -headRadius * 1.3, headRadius * 0.4, headRadius * 0.4);
        this.ctx.fillRect(headRadius * 0.4, -headRadius * 1.3, headRadius * 0.4, headRadius * 0.4);
        
        // Тени в волосах
        this.ctx.fillStyle = '#E67E00';
        this.ctx.fillRect(-headRadius * 1.1, -headRadius * 1.4, headRadius * 2.2, headRadius * 0.15);

        // Рисуем глаза (ОГРОМНЫЕ, как в Roblox)
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/2, -headRadius/3, headRadius/3, 0, Math.PI * 2);
        this.ctx.arc(headRadius/2, -headRadius/3, headRadius/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Зрачки (БОЛЬШИЕ)
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/2, -headRadius/3, headRadius/5, 0, Math.PI * 2);
        this.ctx.arc(headRadius/2, -headRadius/3, headRadius/5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Блики в глазах (БОЛЬШИЕ)
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-headRadius/2 - headRadius/15, -headRadius/3 - headRadius/15, headRadius/12, 0, Math.PI * 2);
        this.ctx.arc(headRadius/2 - headRadius/15, -headRadius/3 - headRadius/15, headRadius/12, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем брови (БОЛЬШИЕ)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(-headRadius/2, -headRadius/2, headRadius/3, headRadius/12);
        this.ctx.fillRect(headRadius/6, -headRadius/2, headRadius/3, headRadius/12);

        // Рисуем нос (БОЛЬШОЙ)
        this.ctx.fillStyle = '#F4C2A1';
        this.ctx.fillRect(-headRadius/15, -headRadius/6, headRadius/7, headRadius/10);

        // Рисуем рот (БОЛЬШАЯ улыбка)
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 4;
        this.ctx.arc(0, headRadius/6, headRadius/2, 0, Math.PI);
        this.ctx.stroke();
        
        // Рисуем зубы
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-headRadius/6, headRadius/8, headRadius/8, headRadius/15);
        this.ctx.fillRect(headRadius/20, headRadius/8, headRadius/8, headRadius/15);

        // Рисуем куртку (бирюзовая/зеленая)
        this.ctx.fillStyle = '#20B2AA'; // Бирюзовый цвет
        this.ctx.fillRect(-bodyWidth/2, -headRadius/2, bodyWidth, bodyHeight);
        
        // Рисуем воротник куртки (белый)
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-bodyWidth/2, -headRadius/2, bodyWidth, headRadius/3);
        
        // Рисуем белые полосы на плечах
        this.ctx.fillRect(-bodyWidth/2, -headRadius/3, bodyWidth, headRadius/8);
        this.ctx.fillRect(-bodyWidth/2, headRadius/6, bodyWidth, headRadius/8);

        // Рисуем белую футболку под курткой
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-bodyWidth/2 + headRadius/8, -headRadius/6, bodyWidth - headRadius/4, bodyHeight/2.5);

        // Рисуем номер 456 на футболке (ОГРОМНЫЙ и яркий!)
        this.ctx.fillStyle = 'red'; // КРАСНЫЙ цвет для максимального контраста!
        this.ctx.font = `bold ${headRadius/0.8}px Arial`; // ЕЩЕ БОЛЬШЕ!
        this.ctx.textAlign = 'center';
        this.ctx.fillText('456', 0, headRadius/6);
        
        // Добавляем черную обводку для четкости
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText('456', 0, headRadius/6);
        
        // Добавляем белую тень для еще большей четкости
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${headRadius/0.8}px Arial`;
        this.ctx.fillText('456', 2, headRadius/6 + 2);
        
        // Возвращаем красный цвет
        this.ctx.fillStyle = 'red';
        this.ctx.fillText('456', 0, headRadius/6);

        // Рисуем руки (согнутые в локтях, как в примере)
        this.ctx.fillStyle = '#F4C2A1';
        // Левая рука (согнутая)
        this.ctx.fillRect(-bodyWidth/2 - headRadius/6, -headRadius/8, headRadius/6, headRadius * 0.9);
        this.ctx.fillRect(-bodyWidth/2 - headRadius/3, headRadius/4, headRadius/4, headRadius/3);
        // Правая рука (согнутая)
        this.ctx.fillRect(bodyWidth/2, -headRadius/8, headRadius/6, headRadius * 0.9);
        this.ctx.fillRect(bodyWidth/2 + headRadius/8, headRadius/4, headRadius/4, headRadius/3);

        // Рисуем штаны (бирюзовые)
        this.ctx.fillStyle = '#20B2AA';
        // Левая нога
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);
        // Правая нога
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);

        // Рисуем белые кроссовки
        this.ctx.fillStyle = 'white';
        // Левый кроссовок
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);
        // Правый кроссовок
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);
        
        // Подошва кроссовок (белая)
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2+legHeight+bootHeight, legWidth, headRadius/10);
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2+legHeight+bootHeight, legWidth, headRadius/10);

        this.ctx.restore();
    }

    drawEvilKenito(x, y) {
        this.ctx.save();
        
        // Применяем эффект мигания
        this.ctx.globalAlpha = this.enemy.warningAlpha;
        
        this.ctx.translate(x + this.enemy.width/2, y + this.enemy.height/2);

        // Размеры Front Man (точные пропорции)
        const headRadius = this.enemy.width/2;
        const bodyWidth = headRadius * 1.4;
        const bodyHeight = headRadius * 2.0;
        const legWidth = headRadius/2.5;
        const legHeight = headRadius * 1.4;
        const bootHeight = headRadius/4;

        // Рисуем голову (круглая, как в примере)
        this.ctx.fillStyle = '#000000'; // Черный капюшон
        this.ctx.beginPath();
        this.ctx.arc(0, -headRadius/2, headRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем белый круг на маске
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, -headRadius/2, headRadius/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Черная обводка белого круга
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Рисуем красный комбинезон
        this.ctx.fillStyle = '#FF0000'; // Ярко-красный
        this.ctx.fillRect(-bodyWidth/2, -headRadius/2, bodyWidth, bodyHeight);
        
        // Рисуем черную вертикальную линию (молния)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-headRadius/20, -headRadius/2, headRadius/10, bodyHeight);

        // Рисуем черные карманы на груди
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-headRadius/3, -headRadius/4, headRadius/4, headRadius/6);
        this.ctx.fillRect(headRadius/6, -headRadius/4, headRadius/4, headRadius/6);

        // Рисуем черный пояс
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-bodyWidth/2, headRadius/3, bodyWidth, headRadius/8);

        // Рисуем руки (красные с черными манжетами)
        this.ctx.fillStyle = '#FF0000';
        // Левая рука
        this.ctx.fillRect(-bodyWidth/2 - headRadius/5, -headRadius/8, headRadius/5, headRadius * 1.2);
        // Правая рука
        this.ctx.fillRect(bodyWidth/2, -headRadius/8, headRadius/5, headRadius * 1.2);
        
        // Черные манжеты на руках
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-bodyWidth/2 - headRadius/5, headRadius/2, headRadius/5, headRadius/6);
        this.ctx.fillRect(bodyWidth/2, headRadius/2, headRadius/5, headRadius/6);

        // Рисуем ноги (красные)
        this.ctx.fillStyle = '#FF0000';
        // Левая нога
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);
        // Правая нога
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);

        // Рисуем черные ботинки
        this.ctx.fillStyle = '#000000';
        // Левый ботинок
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);
        // Правый ботинок
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);

        this.ctx.restore();
    }

    drawEvilKenitoJumpscare() {
        this.ctx.save();
        
        // Устанавливаем прозрачность
        this.ctx.globalAlpha = this.jumpscare.opacity;
        
        // Центрируем и масштабируем
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.jumpscare.scale, this.jumpscare.scale);
        
        // Размеры Front Man (в 2 раза больше обычного)
        const headRadius = this.player.width;
        const bodyWidth = headRadius * 1.4;
        const bodyHeight = headRadius * 2.0;
        const legWidth = headRadius/2.5;
        const legHeight = headRadius * 1.4;
        const bootHeight = headRadius/4;

        // Рисуем голову (круглая, как в примере)
        this.ctx.fillStyle = '#000000'; // Черный капюшон
        this.ctx.beginPath();
        this.ctx.arc(0, -headRadius/2, headRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем белый круг на маске (БОЛЬШОЙ)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, -headRadius/2, headRadius/2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Черная обводка белого круга
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 6;
        this.ctx.stroke();

        // Рисуем красный комбинезон
        this.ctx.fillStyle = '#FF0000'; // Ярко-красный
        this.ctx.fillRect(-bodyWidth/2, -headRadius/2, bodyWidth, bodyHeight);
        
        // Рисуем черную вертикальную линию (молния)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-headRadius/20, -headRadius/2, headRadius/10, bodyHeight);

        // Рисуем черные карманы на груди
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-headRadius/3, -headRadius/4, headRadius/4, headRadius/6);
        this.ctx.fillRect(headRadius/6, -headRadius/4, headRadius/4, headRadius/6);

        // Рисуем черный пояс
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-bodyWidth/2, headRadius/3, bodyWidth, headRadius/8);

        // Рисуем руки (красные с черными манжетами)
        this.ctx.fillStyle = '#FF0000';
        // Левая рука
        this.ctx.fillRect(-bodyWidth/2 - headRadius/5, -headRadius/8, headRadius/5, headRadius * 1.2);
        // Правая рука
        this.ctx.fillRect(bodyWidth/2, -headRadius/8, headRadius/5, headRadius * 1.2);
        
        // Черные манжеты на руках
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-bodyWidth/2 - headRadius/5, headRadius/2, headRadius/5, headRadius/6);
        this.ctx.fillRect(bodyWidth/2, headRadius/2, headRadius/5, headRadius/6);

        // Рисуем ноги (красные)
        this.ctx.fillStyle = '#FF0000';
        // Левая нога
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);
        // Правая нога
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2, legWidth, legHeight);

        // Рисуем черные ботинки
        this.ctx.fillStyle = '#000000';
        // Левый ботинок
        this.ctx.fillRect(-headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);
        // Правый ботинок
        this.ctx.fillRect(headRadius/2-legWidth/2, headRadius/2+legHeight, legWidth, bootHeight);
        
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
            this.ctx.fillText('Игра окончена!', this.canvas.width/2, this.canvas.height/2 - 20);
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

    /**
     * Завершение игры и сохранение результата
     */
    async endGame() {
        const finalScore = Math.floor(this.score);
        console.log('Игра окончена! Финальный счет:', finalScore);
        
        // Сохраняем результат если пользователь авторизован
        const currentUser = window.auth.currentUser;
        if (currentUser) {
            try {
                await this.saveGameResult(finalScore);
                console.log('Результат сохранен в Firestore');
            } catch (error) {
                console.error('Ошибка сохранения результата:', error);
            }
        }
        
        // Показываем экран окончания игры
        if (window.navigation) {
            console.log('Используем navigation.showGameOver');
            window.navigation.showGameOver(finalScore);
        } else {
            console.log('Используем альтернативный способ показа экрана');
            // Альтернативный способ показа экрана окончания игры
            this.showGameOverScreen(finalScore);
        }
    }

    /**
     * Сохранение результата игры
     */
    async saveGameResult(score) {
        try {
            // Получаем текущего пользователя из Firebase
            const currentUser = window.auth.currentUser;
            if (!currentUser) {
                return;
            }
            
            const username = currentUser.email.split('@')[0]; // Извлекаем имя из email
            console.log('Сохраняем результат в Firestore для пользователя:', username, 'счет:', score);
            
            // Сохраняем в Firestore
            const leaderboardRef = window.db.collection('leaderboard').doc(currentUser.uid);
            const leaderboardDoc = await leaderboardRef.get();
            
            if (leaderboardDoc.exists) {
                // Обновляем существующую запись только если новый счет лучше
                const existingScore = leaderboardDoc.data().score;
                if (score > existingScore) {
                    await leaderboardRef.set({
                        username: username,
                        score: score,
                        date: new Date().toISOString(),
                        uid: currentUser.uid
                    });
                    console.log('Обновлена лучшая запись пользователя в Firestore:', username, 'новый счет:', score);
            } else {
                    console.log('Счет не улучшен, запись не обновляется');
                    return;
                }
            } else {
                // Добавляем новую запись
                await leaderboardRef.set({
                    username: username,
                    score: score,
                    date: new Date().toISOString(),
                    uid: currentUser.uid
                });
                console.log('Добавлена новая запись в рейтинг Firestore:', username, 'счет:', score);
            }
            
        } catch (error) {
            console.error('Ошибка сохранения результата в Firestore:', error);
        }
    }

    /**
     * Получение имени текущего пользователя
     */
    async getCurrentUsername() {
        if (!window.auth || !window.auth.currentUser) return 'Гость';
        
        try {
            const userDoc = await window.db.collection('users').doc(window.auth.currentUser.uid).get();
            if (userDoc.exists) {
                return userDoc.data().username;
            }
        } catch (error) {
            console.error('Ошибка получения имени пользователя:', error);
        }
        return 'Гость';
    }

    /**
     * Обновление статистики игрока
     */
    async updatePlayerStats(score) {
        if (!window.auth || !window.auth.currentUser) return;
        
        try {
            const userId = window.auth.currentUser.uid;
            const userRef = window.db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const stats = userData.stats || {
                    bestScore: 0,
                    totalScore: 0,
                    averageScore: 0,
                    currentRank: 0,
                    gamesPlayedToday: 0,
                    lastGameDate: null
                };
                
                // Обновляем статистику
                stats.totalScore += score;
                stats.averageScore = Math.round(stats.totalScore / (stats.gamesPlayedToday || 1));
                
                if (score > stats.bestScore) {
                    stats.bestScore = score;
                }
                
                // Проверяем, играл ли сегодня
                const today = new Date().toDateString();
                const lastGameDate = stats.lastGameDate ? 
                    new Date(stats.lastGameDate).toDateString() : null;
                
                if (lastGameDate !== today) {
                    stats.gamesPlayedToday = 1;
                } else {
                    stats.gamesPlayedToday += 1;
                }
                
                stats.lastGameDate = new Date();
                
                // Сохраняем обновленную статистику
                await userRef.update({ stats: stats });
                
                // Обновляем место в рейтинге
                await this.updatePlayerRank(userId);
            }
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
        }
    }

    /**
     * Обновление места в рейтинге
     */
    async updatePlayerRank(userId) {
        try {
            const userRef = window.db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const bestScore = userData.stats.bestScore;
                
                // Получаем рейтинг и находим место игрока
                const leaderboardSnapshot = await window.db.collection('leaderboard')
                    .orderBy('score', 'desc')
                    .get();
                
                let rank = 1;
                for (const doc of leaderboardSnapshot.docs) {
                    if (doc.data().userId === userId) {
                        break;
                    }
                    rank++;
                }
                
                // Обновляем место в статистике
                await userRef.update({
                    'stats.currentRank': rank
                });
            }
        } catch (error) {
            console.error('Ошибка обновления места в рейтинге:', error);
        }
    }


    /**
     * Показ экрана окончания игры
     */
    showGameOverScreen(finalScore) {
        console.log('Показываем экран окончания игры со счетом:', finalScore);
        
        // Скрываем игровой экран
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('hidden');
            console.log('Игровой экран скрыт');
        }

        // Показываем экран окончания игры
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
            console.log('Экран окончания игры показан');
            
            // Обновляем финальный счет
            const finalScoreElement = document.getElementById('finalScore');
            if (finalScoreElement) {
                finalScoreElement.textContent = finalScore.toLocaleString();
                console.log('Финальный счет обновлен:', finalScore);
            }

            // Проверяем, новый ли это рекорд
            const currentUser = window.auth.currentUser;
            if (currentUser) {
                this.checkNewRecord(finalScore);
            }
        } else {
            console.error('Элемент game-over-screen не найден!');
        }
    }

    /**
     * Проверка нового рекорда
     */
    async checkNewRecord(score) {
        try {
            const currentUser = window.auth.currentUser;
            if (!currentUser) return;
            
            // Загружаем рейтинг и проверяем лучший результат пользователя из Firestore
            const leaderboardDoc = await window.db.collection('leaderboard').doc(currentUser.uid).get();
            
            if (leaderboardDoc.exists) {
                // Проверяем, является ли текущий счет новым рекордом
                const existingScore = leaderboardDoc.data().score;
                if (score > existingScore) {
                    const newRecordElement = document.getElementById('newRecord');
                    if (newRecordElement) {
                        newRecordElement.classList.remove('hidden');
                        console.log('Новый рекорд!', score);
                    }
                }
            } else {
                // Если это первый результат пользователя, это автоматически рекорд
                const newRecordElement = document.getElementById('newRecord');
                if (newRecordElement) {
                    newRecordElement.classList.remove('hidden');
                    console.log('Первый результат - новый рекорд!', score);
                }
            }
        } catch (error) {
            console.error('Ошибка проверки рекорда:', error);
        }
    }
}

// Система навигации между экранами
class NavigationManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Кнопки главного меню
        document.getElementById('startGameBtn').addEventListener('click', () => this.showGame());
        document.getElementById('leaderboardBtn').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('profileBtn').addEventListener('click', () => this.showProfile());
        document.getElementById('loginBtn').addEventListener('click', () => this.showLogin());
        document.getElementById('registerBtn').addEventListener('click', () => this.showRegister());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Формы авторизации
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Валидация в реальном времени
        document.getElementById('registerUsername').addEventListener('input', (e) => {
            this.validateUsername(e.target);
            // Проверяем доступность имени с задержкой
            clearTimeout(this.usernameCheckTimeout);
            this.usernameCheckTimeout = setTimeout(() => {
                this.checkUsernameAvailability(e.target.value);
            }, 500);
        });
        document.getElementById('registerPassword').addEventListener('input', (e) => this.validatePassword(e.target));
        document.getElementById('confirmPassword').addEventListener('input', (e) => this.validateConfirmPassword(e.target));
        
        // Заполняем выпадающий список пользователями
        this.populateInvitedByDropdown();
    }

    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.add('hidden'));
    }

    // Заполнение выпадающего списка пользователями
    async populateInvitedByDropdown() {
        try {
            const dropdown = document.getElementById('invitedBy');
            if (!dropdown) return;

            // Очищаем список
            dropdown.innerHTML = '<option value="">Кто тебя пригласил? (необязательно)</option>';

            if (window.db) {
                const usersSnapshot = await window.db.collection('users').get();
                const allUsers = [];
                
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    if (userData.username) {
                        allUsers.push({
                            id: doc.id,
                            username: userData.username
                        });
                    }
                });

                // Сортируем по алфавиту
                allUsers.sort((a, b) => a.username.localeCompare(b.username));

                console.log('Загружено пользователей:', allUsers.length);
                console.log('Пользователи (по алфавиту):', allUsers.map(u => u.username));

                // Добавляем пользователей в выпадающий список
                allUsers.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.username;
                    option.textContent = user.username;
                    dropdown.appendChild(option);
                });

                console.log('Выпадающий список обновлен с', allUsers.length, 'пользователями');
            }
        } catch (error) {
            console.error('Ошибка загрузки списка пользователей:', error);
        }
    }

    showScreen(screenId) {
        this.hideAllScreens();
        document.getElementById(screenId).classList.remove('hidden');
        this.currentScreen = screenId;
    }

    showMenu() {
        this.showScreen('main-menu');
    }

    showLogin() {
        this.showScreen('login-screen');
    }

    showRegister() {
        this.showScreen('register-screen');
    }

    showProfile() {
        // Проверяем, авторизован ли пользователь в Firebase
        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            this.showLogin();
            return;
        }
        this.showScreen('profile-screen');
        this.loadPlayerProfile();
    }

    showLeaderboard() {
        this.showScreen('leaderboard-screen');
        this.loadLeaderboard();
    }

    showGame() {
        // Проверяем авторизацию перед запуском игры
        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            this.showError('Для игры необходимо войти в систему');
            this.showLogin();
            return;
        }
        
        this.showScreen('game-screen');
        if (window.game) {
            window.game.startNewGame();
        }
    }

    showGameOver(score) {
        console.log('NavigationManager.showGameOver вызван со счетом:', score);
        this.showScreen('game-over-screen');
        
        const finalScoreElement = document.getElementById('finalScore');
        if (finalScoreElement) {
            finalScoreElement.textContent = score.toLocaleString();
            console.log('Финальный счет обновлен в NavigationManager:', score);
        } else {
            console.error('Элемент finalScore не найден!');
        }
        
        // Проверяем, новый ли это рекорд
        const currentUser = window.auth.currentUser;
        if (currentUser) {
            this.checkNewRecord(score);
        }
    }

    // Валидация имени пользователя (Telegram username)
    validateUsername(input) {
        const username = input.value;
        const errorElement = document.getElementById('registerUsernameError');
        // Валидация Telegram username: username (3-32 символа, только латиница, цифры, подчеркивания)
        const regex = /^[a-zA-Z0-9_]{3,32}$/;
        
        if (username.length === 0) {
            errorElement.textContent = '';
            errorElement.classList.remove('success');
            input.classList.remove('invalid');
            return false;
        }
        
        if (!regex.test(username)) {
            errorElement.textContent = 'Username должен содержать только латинские буквы, цифры, _. Длина 3-32 символа.';
            errorElement.classList.remove('success');
            input.classList.add('invalid');
            return false;
        } else {
            errorElement.textContent = '✓ Username корректно';
            errorElement.classList.add('success');
            input.classList.remove('invalid');
            return true;
        }
    }

    // Проверка уникальности имени пользователя в реальном времени
    async checkUsernameAvailability(username) {
        const errorElement = document.getElementById('registerUsernameError');
        const input = document.getElementById('registerUsername');
        
        if (!username || username.length < 3) {
            return;
        }
        
        try {
            const isUnique = await this.checkUsernameUnique(username);
            if (isUnique) {
                errorElement.textContent = '✓ Имя доступно';
                errorElement.classList.add('success');
                input.classList.remove('invalid');
            } else {
                errorElement.textContent = '❌ Имя уже занято';
                errorElement.classList.remove('success');
                input.classList.add('invalid');
            }
        } catch (error) {
            console.error('Ошибка проверки доступности имени:', error);
            errorElement.textContent = '⚠️ Ошибка проверки имени';
            errorElement.classList.remove('success');
            input.classList.add('invalid');
        }
    }

    // Валидация пароля
    validatePassword(input) {
        const password = input.value;
        const errorElement = document.getElementById('registerPasswordError');
        
        if (password.length === 0) {
            errorElement.textContent = '';
            input.classList.remove('invalid');
            return false;
        }
        
        if (password.length < 6) {
            errorElement.textContent = 'Пароль должен содержать минимум 6 символов.';
            input.classList.add('invalid');
            return false;
        } else {
            errorElement.textContent = '✓ Пароль подходит';
            errorElement.classList.add('success');
            input.classList.remove('invalid');
            return true;
        }
    }

    // Валидация подтверждения пароля
    validateConfirmPassword(input) {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = input.value;
        const errorElement = document.getElementById('confirmPasswordError');
        
        if (confirmPassword.length === 0) {
            errorElement.textContent = '';
            input.classList.remove('invalid');
            return false;
        }
        
        if (password !== confirmPassword) {
            errorElement.textContent = 'Пароли не совпадают.';
            input.classList.add('invalid');
            return false;
        } else {
            errorElement.textContent = '✓ Пароли совпадают';
            errorElement.classList.add('success');
            input.classList.remove('invalid');
            return true;
        }
    }

    // Обработка входа
    async handleLogin(e) {
        e.preventDefault();
        
        // Защита от множественных нажатий
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        if (loginBtn.disabled) {
            return; // Уже идет процесс входа
        }
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        // Отключаем кнопку и показываем индикатор загрузки
        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';
        loginBtn.style.opacity = '0.6';
        
        try {
            await this.loginUser(username, password);
            this.showMenu();
        } catch (error) {
            this.showError('Ошибка входа: ' + error.message);
        } finally {
            // Восстанавливаем кнопку
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
            loginBtn.style.opacity = '1';
        }
    }

    // Обработка регистрации
    async handleRegister(e) {
        e.preventDefault();
        
        // Защита от множественных нажатий
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        if (registerBtn.disabled) {
            return; // Уже идет процесс регистрации
        }
        
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const invitedBy = document.getElementById('invitedBy').value;
        
        // Валидация
        if (!this.validateUsername(document.getElementById('registerUsername'))) {
            this.showError('Проверьте имя пользователя');
            return;
        }
        
        if (!this.validatePassword(document.getElementById('registerPassword'))) {
            this.showError('Проверьте пароль');
            return;
        }
        
        if (!this.validateConfirmPassword(document.getElementById('confirmPassword'))) {
            this.showError('Пароли не совпадают');
            return;
        }
        
        // Отключаем кнопку и показываем индикатор загрузки
        registerBtn.disabled = true;
        registerBtn.textContent = 'Регистрация...';
        registerBtn.style.opacity = '0.6';
        
        try {
            await this.registerUser(username, password, invitedBy);
            this.showMenu();
        } catch (error) {
            this.showError('Ошибка регистрации: ' + error.message);
        } finally {
            // Восстанавливаем кнопку
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
            registerBtn.style.opacity = '1';
        }
    }

    // Проверка уникальности имени пользователя
    async checkUsernameUnique(username) {
        try {
            if (!window.db) {
                throw new Error('Firestore не инициализирован');
            }
            
            const existingUsers = await window.db.collection('users').where('username', '==', username).get();
            return existingUsers.empty;
        } catch (error) {
            console.error('Ошибка проверки уникальности username:', error);
            return false; // В случае ошибки считаем, что имя занято
        }
    }

    // Регистрация пользователя
    async registerUser(username, password, invitedBy = null) {
        try {
            
            // Проверяем, что Firebase инициализирован
            if (!window.auth) {
                throw new Error('Firebase Auth не инициализирован');
            }
            
            // Проверяем уникальность имени пользователя
            const isUsernameUnique = await this.checkUsernameUnique(username);
            if (!isUsernameUnique) {
                throw new Error('Пользователь с таким именем уже существует');
            }
            
            // Используем Firebase Auth
            const email = `${username}@bmk.local`;
            
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            
            // Сохраняем данные пользователя в Firestore
               try {
                   // Создаем документ пользователя в коллекции users
                   await window.db.collection('users').doc(userCredential.user.uid).set({
                       username: username,
                       email: email,
                       createdAt: new Date().toISOString(),
                       lastLogin: new Date().toISOString(),
                       invitedBy: invitedBy || null,
                       invitedFriends: [],
                       invitedCount: 0
                   });
                   console.log('Данные пользователя сохранены в Firestore');
                   
                   // Если пользователь был приглашен, обновляем счетчик у пригласившего
                   if (invitedBy) {
                       try {
                           const usersSnapshot = await window.db.collection('users').where('username', '==', invitedBy).get();
                           if (!usersSnapshot.empty) {
                               const referrerDoc = usersSnapshot.docs[0];
                               const referrerData = referrerDoc.data();
                               const newInvitedFriends = [...(referrerData.invitedFriends || []), userCredential.user.uid];
                               
                               await window.db.collection('users').doc(referrerDoc.id).update({
                                   invitedFriends: newInvitedFriends,
                                   invitedCount: newInvitedFriends.length
                               });
                               console.log('Счетчик приглашенных обновлен для:', invitedBy);
                           }
                       } catch (error) {
                           console.error('Ошибка обновления счетчика приглашенных:', error);
                       }
                   }
                   
                   // Создаем начальную запись в leaderboard
                   await window.db.collection('leaderboard').doc(userCredential.user.uid).set({
                       username: username,
                       score: 0,
                       createdAt: new Date().toISOString()
                   });
                   console.log('Начальная запись в leaderboard создана');
               } catch (error) {
                   console.error('Ошибка сохранения данных пользователя:', error);
               }
            
            // Обновляем UI после успешной регистрации
            if (typeof updateUIForLoggedInUser === 'function') {
                updateUIForLoggedInUser({ username: username, uid: userCredential.user.uid });
                console.log('UI обновлен для нового пользователя:', username);
            }
            
            return { username: username, uid: userCredential.user.uid };
        } catch (error) {
            console.error('Ошибка регистрации в Firebase:', error);
            console.error('Код ошибки:', error.code);
            console.error('Сообщение ошибки:', error.message);
            
            // Обрабатываем разные типы ошибок
            if (error.message.includes('уже существует')) {
                throw new Error('Пользователь с таким именем уже существует');
            } else if (error.code === 'auth/email-already-in-use') {
                throw new Error('Пользователь с таким именем уже существует');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Пароль слишком слабый');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Некорректное имя пользователя');
            } else {
                throw error;
            }
        }
    }

    // Вход пользователя
    async loginUser(username, password) {
        try {
            
            // Проверяем, что Firebase инициализирован
            if (!window.auth) {
                throw new Error('Firebase Auth не инициализирован');
            }
            
            // Используем Firebase Auth
            const email = `${username}@bmk.local`;
            
            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            
            // Обновляем lastLogin в Firestore
            try {
                await window.db.collection('users').doc(userCredential.user.uid).set({
                    lastLogin: new Date().toISOString()
                }, { merge: true });
                console.log('LastLogin обновлен в Firestore');
        } catch (error) {
                console.error('Ошибка обновления lastLogin:', error);
            }
            
            // Обновляем UI после успешного входа
            if (typeof updateUIForLoggedInUser === 'function') {
                updateUIForLoggedInUser({ username: username, uid: userCredential.user.uid });
                console.log('UI обновлен для пользователя:', username);
            }
            
            return { username: username, uid: userCredential.user.uid };
        } catch (error) {
            console.error('Ошибка входа в Firebase:', error);
            console.error('Код ошибки:', error.code);
            console.error('Сообщение ошибки:', error.message);
            throw error;
        }
    }

    // Выход пользователя
    async logout() {
        try {
            // Используем Firebase Auth
            await window.auth.signOut();
            this.showMenu();
        } catch (error) {
            this.showError('Ошибка при выходе из системы');
        }
    }

    // Загрузка профиля игрока
    async loadPlayerProfile() {
        const currentUser = window.auth.currentUser;
        if (!currentUser) return;
        
        try {
            const username = currentUser.email.split('@')[0]; // Извлекаем имя из email
            
            // Получаем данные пользователя из Firestore
            const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            // Получаем рейтинг для статистики
            const leaderboardDoc = await window.db.collection('leaderboard').doc(currentUser.uid).get();
            const userEntry = leaderboardDoc.exists ? leaderboardDoc.data() : null;
                
                // Обновляем информацию о игроке
            const playerNameElement = document.getElementById('playerName');
            if (playerNameElement) {
                playerNameElement.textContent = username;
            }
            
            const playerJoinDateElement = document.getElementById('playerJoinDate');
            if (playerJoinDateElement && userData.createdAt) {
                playerJoinDateElement.textContent = `Игрок с ${new Date(userData.createdAt).toLocaleDateString()}`;
            } else if (playerJoinDateElement) {
                playerJoinDateElement.textContent = `Игрок с ${new Date(currentUser.metadata.creationTime).toLocaleDateString()}`;
            }
                
                // Обновляем статистику
            const bestScore = userEntry ? userEntry.score : 0;
            
            // Получаем ранг из рейтинга
            const leaderboardSnapshot = await window.db.collection('leaderboard').orderBy('score', 'desc').get();
            let rank = '-';
            let rankIndex = 1;
            leaderboardSnapshot.forEach(doc => {
                if (doc.id === currentUser.uid) {
                    rank = `#${rankIndex}`;
                }
                rankIndex++;
            });
            
            
            const bestScoreElement = document.querySelector('[data-stat="bestScore"]');
            if (bestScoreElement) bestScoreElement.textContent = bestScore.toLocaleString();
            
            const currentRankElement = document.querySelector('[data-stat="currentRank"]');
            if (currentRankElement) currentRankElement.textContent = rank;
            
            const invitedFriendsElement = document.querySelector('[data-stat="invitedFriends"]');
            if (invitedFriendsElement) {
                const invitedCount = userData.invitedCount || 0;
                invitedFriendsElement.textContent = invitedCount;
                
                // Обновляем цвет в зависимости от количества приглашенных
                const requirementElement = document.querySelector('.requirement-text');
                if (requirementElement) {
                    if (invitedCount >= 3) {
                        requirementElement.textContent = '✅ Участвуешь в розыгрыше!';
                        requirementElement.style.color = '#4CAF50';
                    } else {
                        requirementElement.innerHTML = `Нужно: ${3 - invitedCount} друзей до 14 лет + подписка на <a href="https://t.me/LTYH2/462" target="_blank" class="telegram-link">@LTYH2</a> еще`;
                        requirementElement.style.color = '#FFD700';
                    }
                }
            }
            
            // Загружаем список приглашенных друзей
            await this.loadInvitedFriendsList(userData.invitedFriends || []);
            
        } catch (error) {
            console.error('Ошибка загрузки профиля из Firestore:', error);
        }
    }

    // Загрузка списка приглашенных друзей
    async loadInvitedFriendsList(invitedFriendsIds) {
        try {
            const friendsListElement = document.getElementById('invitedFriendsList');
            if (!friendsListElement) return;

            if (!invitedFriendsIds || invitedFriendsIds.length === 0) {
                friendsListElement.innerHTML = '<p class="no-friends">Пока никого не пригласили</p>';
                return;
            }

            // Получаем данные всех приглашенных пользователей
            const friendsData = [];
            for (const friendId of invitedFriendsIds) {
                try {
                    if (!friendId || friendId.trim() === '') continue;
                    
                    const friendDoc = await window.db.collection('users').doc(friendId).get();
                    if (friendDoc.exists) {
                        const friendData = friendDoc.data();
                        friendsData.push({
                            username: friendData.username,
                            createdAt: friendData.createdAt
                        });
                    }
                } catch (error) {
                    console.error('Ошибка загрузки данных друга:', friendId, error);
                }
            }

            // Отображаем список друзей
            if (friendsData.length === 0) {
                friendsListElement.innerHTML = '<p class="no-friends">Пока никого не пригласили</p>';
            } else {
                friendsListElement.innerHTML = friendsData.map(friend => `
                    <div class="friend-item">
                        <span class="friend-username">${friend.username}</span>
                        <span class="friend-date">${new Date(friend.createdAt).toLocaleDateString()}</span>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error('Ошибка загрузки списка приглашенных друзей:', error);
            const friendsListElement = document.getElementById('invitedFriendsList');
            if (friendsListElement) {
                friendsListElement.innerHTML = '<p class="no-friends">Ошибка загрузки списка</p>';
            }
        }
    }

    // Загрузка рейтинга
    async loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';
        
        try {
            // Загружаем рейтинг из Firestore
            const leaderboardSnapshot = await window.db.collection('leaderboard').orderBy('score', 'desc').get();
            
            if (leaderboardSnapshot.empty) {
                leaderboardList.innerHTML = '<div class="loading">Рейтинг пуст</div>';
                return;
            }
            
            let html = '';
            let rank = 1;
            const currentUser = window.auth.currentUser;
            
            leaderboardSnapshot.forEach(doc => {
                const entry = doc.data();
                const isCurrentPlayer = currentUser && entry.uid === currentUser.uid;
                
                html += `
                    <div class="leaderboard-item ${isCurrentPlayer ? 'current-player' : ''}">
                        <div class="leaderboard-rank">#${rank}</div>
                        <div class="leaderboard-name">${entry.username}</div>
                        <div class="leaderboard-score">${entry.score.toLocaleString()}</div>
                    </div>
                `;
                rank++;
            });
            
            leaderboardList.innerHTML = html;
            console.log('Рейтинг загружен из Firestore:', leaderboardSnapshot.size, 'записей');
        } catch (error) {
            console.error('Ошибка загрузки рейтинга из Firestore:', error);
            leaderboardList.innerHTML = '<div class="loading">Ошибка загрузки рейтинга</div>';
        }
    }

    // Проверка нового рекорда
    async checkNewRecord(score) {
        if (!window.auth || !window.auth.currentUser) return;
        
        try {
            const userDoc = await window.db.collection('users').doc(window.auth.currentUser.uid).get();
            if (userDoc.exists) {
                const stats = userDoc.data().stats || {};
                if (score > (stats.bestScore || 0)) {
                    document.getElementById('newRecord').classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Ошибка проверки рекорда:', error);
        }
    }

    // Показ ошибок
    showError(message) {
        alert(message); // В будущем можно заменить на красивые уведомления
    }
}

// Глобальные функции для навигации
window.showMenu = () => navigation.showMenu();
window.showLogin = () => navigation.showLogin();
window.showRegister = () => navigation.showRegister();
window.showProfile = () => navigation.showProfile();
window.showLeaderboard = () => navigation.showLeaderboard();
window.refreshLeaderboard = () => navigation.loadLeaderboard();
window.startNewGame = () => navigation.showGame();

// Инициализация навигации
const navigation = new NavigationManager();

// Инициализация игры
const game = new Game(); 

// Делаем игру доступной глобально
window.game = game;
window.navigation = navigation; 
// Интеграция Three.js с существующей игрой BMK Jump
class Game3D extends Game {
    constructor() {
        super();
        this.threeJSGame = null;
        this.is3DMode = false;
    }
    
    // Переопределяем метод инициализации для добавления 3D
    init3D() {
        if (typeof THREE !== 'undefined') {
            this.threeJSGame = new ThreeJSGame();
            this.is3DMode = true;
            console.log('3D режим активирован!');
        } else {
            console.warn('Three.js не загружен. Используется 2D режим.');
        }
    }
    
    // Переопределяем метод обновления для 3D
    update() {
        // Вызываем родительский метод обновления
        super.update();
        
        // Если 3D режим активен, обновляем 3D сцену
        if (this.is3DMode && this.threeJSGame && this.player) {
            this.threeJSGame.updatePlayerPosition(this.player.x, this.player.y);
        }
    }
    
    // Переопределяем метод рисования
    draw() {
        if (this.is3DMode && this.threeJSGame) {
            // В 3D режиме Three.js сам рендерит сцену
            // Можно добавить UI элементы поверх 3D сцены
            this.drawUI();
        } else {
            // Используем стандартный 2D рендеринг
            super.draw();
        }
    }
    
    // Рисуем UI элементы поверх 3D сцены
    drawUI() {
        // Счет
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.roundRect(5, 5, 150, 40, 10);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`СЧЕТ: ${this.scoreDisplay.current}`, 15, 32);
        this.ctx.restore();
        
        // Сообщение о проигрыше
        if (this.gameOver) {
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
    }
    
    // Переключатель между 2D и 3D режимами
    toggle3DMode() {
        if (this.is3DMode) {
            // Переключаемся на 2D
            this.is3DMode = false;
            if (this.threeJSGame) {
                this.threeJSGame.dispose();
                this.threeJSGame = null;
            }
            console.log('Переключено на 2D режим');
        } else {
            // Переключаемся на 3D
            this.init3D();
            console.log('Переключено на 3D режим');
        }
    }
}

// Функция для инициализации 3D режима
function init3DGame() {
    // Проверяем, загружен ли Three.js
    if (typeof THREE === 'undefined') {
        console.error('Three.js не загружен! Добавьте скрипт Three.js в HTML.');
        return;
    }
    
    // Заменяем стандартную игру на 3D версию
    if (window.game) {
        window.game.dispose();
    }
    
    window.game = new Game3D();
    window.game.init3D();
    
    console.log('3D игра инициализирована!');
}

// Добавляем кнопку переключения режимов
function add3DToggleButton() {
    const button = document.createElement('button');
    button.textContent = '🎮 3D/2D';
    button.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        padding: 10px 15px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;
    
    button.addEventListener('click', () => {
        if (window.game && window.game.toggle3DMode) {
            window.game.toggle3DMode();
        }
    });
    
    document.body.appendChild(button);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем кнопку переключения
    add3DToggleButton();
    
    // Автоматически инициализируем 3D если Three.js доступен
    if (typeof THREE !== 'undefined') {
        console.log('Three.js обнаружен. 3D режим доступен!');
    }
});

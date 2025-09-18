// Firebase конфигурация
// ВАЖНО: Замените эти значения на ваши реальные из Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDj5FpJ0nPPZp54A4cEp6UZs7FpYrR9tbY",
    authDomain: "bmk-jump.firebaseapp.com",
    projectId: "bmk-jump",
    storageBucket: "bmk-jump.firebasestorage.app",
    messagingSenderId: "460698281484",
    appId: "1:460698281484:web:d059dd22266ad1bff87029",
    measurementId: "G-977C50CZKZ"
};

// Проверяем, доступен ли Firebase SDK
let auth, db;

if (typeof firebase !== 'undefined') {
    // Инициализация Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Инициализация сервисов
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase SDK успешно инициализирован');
} else {
    // Используем mock Firebase (будет инициализирован в mock-firebase.js)
    console.log('Firebase SDK не найден, используется mock Firebase');
    auth = null;
    db = null;
}

// Глобальные переменные для использования в game.js
// Если Firebase SDK недоступен, используем mock Firebase
if (typeof firebase !== 'undefined') {
    window.auth = auth;
    window.db = db;
} else {
    // Mock Firebase уже инициализирован в mock-firebase.js
    console.log('Используем mock Firebase для auth и db');
}

// Обработка состояния авторизации
if (auth && auth.onAuthStateChanged) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Пользователь вошел в систему
            updateUIForLoggedInUser(user);
        } else {
            // Пользователь вышел из системы
            updateUIForLoggedOutUser();
        }
    });
} else {
    // Для mock Firebase используем простую проверку
    setTimeout(() => {
        if (window.auth && window.auth.currentUser) {
            updateUIForLoggedInUser(window.auth.currentUser);
        } else {
            updateUIForLoggedOutUser();
        }
    }, 200);
}

// Обновление UI для авторизованного пользователя
function updateUIForLoggedInUser(user) {
    // Скрываем кнопки входа и регистрации
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('registerBtn').classList.add('hidden');
    
    // Показываем кнопку выхода
    document.getElementById('logoutBtn').classList.remove('hidden');
    
    // Активируем кнопки игры и профиля
    const startGameBtn = document.getElementById('startGameBtn');
    const profileBtn = document.getElementById('profileBtn');
    
    startGameBtn.classList.remove('disabled');
    startGameBtn.disabled = false;
    startGameBtn.textContent = 'Начать игру';
    
    profileBtn.classList.remove('disabled');
    profileBtn.disabled = false;
    
    // Показываем кнопки профиля и рейтинга
    document.getElementById('profileBtn').classList.remove('hidden');
    document.getElementById('leaderboardBtn').classList.remove('hidden');
    
    // Скрываем сообщение о необходимости авторизации
    document.getElementById('authRequiredMessage').classList.add('hidden');
    
    // Обновляем статус подключения
    updateConnectionStatus(true);
}

// Обновление UI для неавторизованного пользователя
function updateUIForLoggedOutUser() {
    // Показываем кнопки входа и регистрации
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('registerBtn').classList.remove('hidden');
    
    // Скрываем кнопку выхода
    document.getElementById('logoutBtn').classList.add('hidden');
    
    // Блокируем кнопки игры и профиля
    const startGameBtn = document.getElementById('startGameBtn');
    const profileBtn = document.getElementById('profileBtn');
    
    startGameBtn.classList.add('disabled');
    startGameBtn.disabled = true;
    startGameBtn.textContent = 'Войдите для игры';
    
    profileBtn.classList.add('disabled');
    profileBtn.disabled = true;
    
    // Скрываем кнопки профиля и рейтинга
    document.getElementById('profileBtn').classList.add('hidden');
    document.getElementById('leaderboardBtn').classList.add('hidden');
    
    // Показываем сообщение о необходимости авторизации
    document.getElementById('authRequiredMessage').classList.remove('hidden');
    
    // Обновляем статус подключения
    updateConnectionStatus(false);
}

// Обновление статуса подключения
function updateConnectionStatus(isConnected) {
    const indicator = document.getElementById('connectionIndicator');
    const text = document.getElementById('connectionText');
    
    if (isConnected) {
        indicator.className = 'status-indicator connected';
        text.textContent = 'Подключено';
    } else {
        indicator.className = 'status-indicator disconnected';
        text.textContent = 'Не подключено';
    }
}

// Функция выхода
async function logout() {
    try {
        if (auth && auth.signOut) {
            await auth.signOut();
        } else if (window.auth && window.auth.signOut) {
            await window.auth.signOut();
        }
        showMenu();
    } catch (error) {
        console.error('Ошибка выхода:', error);
        alert('Ошибка при выходе из системы');
    }
}

// Глобальная функция для выхода
window.logout = logout;

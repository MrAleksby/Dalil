// Временная версия Firebase для тестирования с localStorage
class MockFirebase {
    constructor() {
        this.currentUser = null;
        this.users = this.loadFromStorage('bmk_users', {});
        this.leaderboard = this.loadFromStorage('bmk_leaderboard', []);
        console.log('Mock Firebase: загружены пользователи:', this.users);
        console.log('Mock Firebase: количество пользователей:', Object.keys(this.users).length);
        console.log('Mock Firebase: имена пользователей:', Object.keys(this.users));
        this.setupMockAuth();
    }

    setupMockAuth() {
        // Проверяем, есть ли сохраненный пользователь
        const savedUser = localStorage.getItem('bmk_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Mock Authentication
    async createUserWithEmailAndPassword(email, password) {
        console.log('Mock Firebase: createUserWithEmailAndPassword вызван с email:', email);
        
        const username = email.replace('@bmk.local', '');
        
        if (this.users[username]) {
            console.log('Mock Firebase: пользователь уже существует:', username);
            throw new Error('Пользователь с таким именем уже существует');
        }

        const user = {
            uid: 'mock_' + username + '_' + Date.now(),
            email: email,
            username: username
        };

        this.users[username] = {
            uid: user.uid,
            username: username,
            email: email,
            password: password, // В реальном Firebase пароли не хранятся
            createdAt: new Date(),
            lastLogin: new Date(),
            stats: {
                totalGames: 0,
                bestScore: 0,
                totalScore: 0,
                averageScore: 0,
                currentRank: 0,
                gamesPlayedToday: 0,
                lastGameDate: null
            }
        };

        // Принудительное сохранение
        this.saveToStorage('bmk_users', this.users);
        this.currentUser = user;
        this.saveToStorage('bmk_current_user', user);
        
        // Дополнительная проверка сохранения
        const savedUsers = JSON.parse(localStorage.getItem('bmk_users') || '{}');
        console.log('Mock Firebase: пользователь создан успешно:', user);
        console.log('Mock Firebase: сохранены пользователи:', this.users);
        console.log('Mock Firebase: проверка localStorage:', savedUsers);
        console.log('Mock Firebase: пользователь в localStorage:', savedUsers[username]);
        
        // Проверяем, что пользователь действительно сохранился
        if (!savedUsers[username]) {
            console.error('Mock Firebase: ОШИБКА! Пользователь не сохранился в localStorage!');
            // Принудительно сохраняем еще раз
            localStorage.setItem('bmk_users', JSON.stringify(this.users));
            console.log('Mock Firebase: принудительно пересохранили пользователей');
        }
        
        return { user: user };
    }

    async signInWithEmailAndPassword(email, password) {
        console.log('Mock Firebase: signInWithEmailAndPassword вызван с email:', email);
        console.log('Mock Firebase: доступные пользователи:', Object.keys(this.users));
        
        const username = email.replace('@bmk.local', '');
        const userData = this.users[username];

        if (!userData) {
            console.log('Mock Firebase: пользователь не найден:', username);
            console.log('Mock Firebase: попробуйте зарегистрироваться сначала');
            throw new Error('Пользователь не найден. Зарегистрируйтесь сначала.');
        }

        console.log('Mock Firebase: найден пользователь:', userData);
        console.log('Mock Firebase: ожидаемый пароль:', userData.password);
        console.log('Mock Firebase: введенный пароль:', password);

        // Проверяем, что пароль существует
        if (userData.password === undefined || userData.password === null) {
            console.log('Mock Firebase: пароль не найден для пользователя:', username);
            console.log('Mock Firebase: удаляем поврежденную запись пользователя');
            delete this.users[username];
            this.saveToStorage('bmk_users', this.users);
            throw new Error('Ошибка данных пользователя. Зарегистрируйтесь заново.');
        }

        if (userData.password !== password) {
            console.log('Mock Firebase: неверный пароль для пользователя:', username);
            throw new Error('Неверный пароль');
        }

        const user = {
            uid: userData.uid,
            email: email,
            username: username
        };

        // Обновляем время последнего входа
        userData.lastLogin = new Date();
        this.saveToStorage('bmk_users', this.users);

        this.currentUser = user;
        this.saveToStorage('bmk_current_user', user);
        
        console.log('Mock Firebase: вход выполнен успешно:', user);
        return { user: user };
    }

    async signOut() {
        this.currentUser = null;
        localStorage.removeItem('bmk_current_user');
    }

    // Mock Firestore
    collection(collectionName) {
        return new MockCollection(collectionName, this);
    }
}

class MockCollection {
    constructor(name, firebase) {
        this.name = name;
        this.firebase = firebase;
    }

    doc(id) {
        return new MockDocument(id, this.name, this.firebase);
    }

    add(data) {
        const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const doc = new MockDocument(id, this.name, this.firebase);
        return doc.set(data);
    }

    orderBy(field, direction) {
        return new MockQuery(this.name, this.firebase, { orderBy: { field, direction } });
    }

    limit(count) {
        return new MockQuery(this.name, this.firebase, { limit: count });
    }

    get() {
        return new Promise((resolve) => {
            let data = [];
            
            if (this.name === 'users') {
                data = Object.values(this.firebase.users);
            } else if (this.name === 'leaderboard') {
                data = this.firebase.leaderboard;
            }

            const docs = data.map(item => ({
                id: item.uid || item.id,
                data: () => item,
                exists: true
            }));

            resolve({
                docs: docs,
                empty: docs.length === 0
            });
        });
    }
}

class MockDocument {
    constructor(id, collectionName, firebase) {
        this.id = id;
        this.collectionName = collectionName;
        this.firebase = firebase;
    }

    set(data) {
        return new Promise((resolve) => {
            if (this.collectionName === 'users') {
                this.firebase.users[data.username] = { ...data, uid: this.id };
                this.firebase.saveToStorage('bmk_users', this.firebase.users);
            }
            resolve();
        });
    }

    update(data) {
        return new Promise((resolve) => {
            if (this.collectionName === 'users') {
                const username = Object.keys(this.firebase.users).find(
                    key => this.firebase.users[key].uid === this.id
                );
                if (username) {
                    this.firebase.users[username] = { ...this.firebase.users[username], ...data };
                    this.firebase.saveToStorage('bmk_users', this.firebase.users);
                }
            }
            resolve();
        });
    }

    get() {
        return new Promise((resolve) => {
            let data = null;
            
            if (this.collectionName === 'users') {
                const username = Object.keys(this.firebase.users).find(
                    key => this.firebase.users[key].uid === this.id
                );
                if (username) {
                    data = this.firebase.users[username];
                }
            }

            resolve({
                exists: !!data,
                data: () => data
            });
        });
    }
}

class MockQuery {
    constructor(collectionName, firebase, options = {}) {
        this.collectionName = collectionName;
        this.firebase = firebase;
        this.options = options;
    }

    orderBy(field, direction) {
        this.options.orderBy = { field, direction };
        return this;
    }

    limit(count) {
        this.options.limit = count;
        return this;
    }

    get() {
        return new Promise((resolve) => {
            let data = [];
            
            if (this.collectionName === 'leaderboard') {
                data = [...this.firebase.leaderboard];
                
                // Сортировка
                if (this.options.orderBy) {
                    const { field, direction } = this.options.orderBy;
                    data.sort((a, b) => {
                        const aVal = a[field];
                        const bVal = b[field];
                        if (direction === 'desc') {
                            return bVal > aVal ? 1 : -1;
                        } else {
                            return aVal > bVal ? 1 : -1;
                        }
                    });
                }
                
                // Лимит
                if (this.options.limit) {
                    data = data.slice(0, this.options.limit);
                }
            }

            const docs = data.map(item => ({
                id: item.id || 'mock_' + Date.now(),
                data: () => item,
                exists: true
            }));

            resolve({
                docs: docs,
                empty: docs.length === 0
            });
        });
    }
}

// Создаем mock Firebase
const mockFirebase = new MockFirebase();

// Заменяем глобальные переменные
window.auth = {
    currentUser: mockFirebase.currentUser,
    createUserWithEmailAndPassword: (email, password) => mockFirebase.createUserWithEmailAndPassword(email, password),
    signInWithEmailAndPassword: (email, password) => mockFirebase.signInWithEmailAndPassword(email, password),
    signOut: () => mockFirebase.signOut(),
    onAuthStateChanged: (callback) => {
        // Имитируем изменение состояния
        callback(mockFirebase.currentUser);
        return () => {}; // unsubscribe function
    }
};

window.db = {
    collection: (name) => mockFirebase.collection(name)
};

// Обновляем currentUser при изменениях
const originalSignIn = window.auth.signInWithEmailAndPassword;
const originalSignOut = window.auth.signOut;
const originalCreateUser = window.auth.createUserWithEmailAndPassword;

window.auth.signInWithEmailAndPassword = async (email, password) => {
    const result = await originalSignIn(email, password);
    window.auth.currentUser = result.user;
    
    // Обновляем UI для авторизованного пользователя
    if (typeof updateUIForLoggedInUser === 'function') {
        updateUIForLoggedInUser(result.user);
    }
    
    return result;
};

window.auth.signOut = async () => {
    await originalSignOut();
    window.auth.currentUser = null;
    
    // Обновляем UI для неавторизованного пользователя
    if (typeof updateUIForLoggedOutUser === 'function') {
        updateUIForLoggedOutUser();
    }
};

window.auth.createUserWithEmailAndPassword = async (email, password) => {
    const result = await originalCreateUser(email, password);
    window.auth.currentUser = result.user;
    
    // Обновляем UI для авторизованного пользователя
    if (typeof updateUIForLoggedInUser === 'function') {
        updateUIForLoggedInUser(result.user);
    }
    
    return result;
};

// Делаем mockFirebase доступным глобально
window.mockFirebase = mockFirebase;

// Функция для очистки всех данных (для отладки)
window.clearMockFirebaseData = () => {
    localStorage.removeItem('bmk_users');
    localStorage.removeItem('bmk_leaderboard');
    localStorage.removeItem('bmk_current_user');
    console.log('Mock Firebase: все данные очищены');
    alert('Данные очищены. Перезагрузите страницу.');
};

// Функция для создания тестового пользователя
window.createTestUser = async () => {
    try {
        const result = await window.auth.createUserWithEmailAndPassword(
            'test@bmk.local',
            '123456'
        );
        console.log('Тестовый пользователь создан:', result);
        alert('Тестовый пользователь создан:\nИмя: test\nПароль: 123456');
        return result;
    } catch (error) {
        console.error('Ошибка создания тестового пользователя:', error);
        alert('Ошибка: ' + error.message);
    }
};

// Функция для очистки дублирующихся записей в рейтинге
window.cleanDuplicateLeaderboard = () => {
    if (!window.mockFirebase) {
        alert('Mock Firebase не инициализирован');
        return;
    }
    
    const leaderboard = window.mockFirebase.leaderboard;
    const uniqueUsers = new Map();
    
    // Оставляем только лучший результат для каждого пользователя
    leaderboard.forEach(entry => {
        const userId = entry.userId;
        if (!uniqueUsers.has(userId) || entry.score > uniqueUsers.get(userId).score) {
            uniqueUsers.set(userId, entry);
        }
    });
    
    // Обновляем рейтинг
    window.mockFirebase.leaderboard = Array.from(uniqueUsers.values());
    window.mockFirebase.saveToStorage('bmk_leaderboard', window.mockFirebase.leaderboard);
    
    console.log('Дублирующиеся записи очищены. Осталось записей:', window.mockFirebase.leaderboard.length);
    alert(`Дублирующиеся записи очищены!\nОсталось записей: ${window.mockFirebase.leaderboard.length}`);
};

// Создаем простую и надежную систему
console.log('🚀 Инициализируем простую систему аутентификации...');

// Простая функция для создания пользователя
window.simpleCreateUser = (username, password) => {
    const userData = {
        username: username,
        password: password,
        createdAt: new Date().toISOString()
    };
    
    // Проверяем, что пользователь не существует
    const existingUser = localStorage.getItem('simple_user_' + username);
    if (existingUser) {
        console.log('⚠️ Пользователь уже существует:', username);
        throw new Error('Пользователь с таким именем уже существует');
    }
    
    // Сохраняем пользователя
    localStorage.setItem('simple_user_' + username, JSON.stringify(userData));
    localStorage.setItem('simple_current_user', username);
    
    // Проверяем, что данные сохранились
    const savedUser = localStorage.getItem('simple_user_' + username);
    console.log('✅ Пользователь создан:', username);
    console.log('🔍 Проверка сохранения:', savedUser ? 'Данные сохранены' : 'ОШИБКА: данные не сохранились');
    console.log('🔍 Все пользователи в localStorage:', Object.keys(localStorage).filter(key => key.startsWith('simple_user_')));
    
    return { success: true, username: username };
};

// Простая функция для входа
window.simpleLogin = (username, password) => {
    console.log('🔍 Попытка входа для пользователя:', username);
    console.log('🔍 Все пользователи в localStorage:', Object.keys(localStorage).filter(key => key.startsWith('simple_user_')));
    
    const userData = localStorage.getItem('simple_user_' + username);
    console.log('🔍 Данные пользователя:', userData ? 'Найдены' : 'НЕ НАЙДЕНЫ');
    
    if (!userData) {
        console.log('❌ Пользователь не найден в localStorage');
        throw new Error('Пользователь не найден');
    }
    
    const user = JSON.parse(userData);
    console.log('🔍 Пароль в базе:', user.password);
    console.log('🔍 Введенный пароль:', password);
    
    if (user.password !== password) {
        console.log('❌ Неверный пароль');
        throw new Error('Неверный пароль');
    }
    
    localStorage.setItem('simple_current_user', username);
    console.log('✅ Вход выполнен:', username);
    return { success: true, username: username };
};

// Простая функция для выхода
window.simpleLogout = () => {
    // Удаляем только текущего пользователя, но НЕ удаляем данные пользователя
    localStorage.removeItem('simple_current_user');
    console.log('✅ Выход выполнен (данные пользователя сохранены)');
};

// Простая функция для проверки текущего пользователя
window.simpleGetCurrentUser = () => {
    const username = localStorage.getItem('simple_current_user');
    return username ? { username: username } : null;
};

console.log('✅ Простая система аутентификации готова!');

// Функция для быстрого создания тестового пользователя
window.createTestUserSimple = () => {
    try {
        const result = window.simpleCreateUser('aleks', '123456');
        console.log('🎯 Тестовый пользователь создан:', result);
        alert('Тестовый пользователь создан!\nИмя: aleks\nПароль: 123456');
        return result;
    } catch (error) {
        console.log('⚠️ Пользователь уже существует или ошибка:', error.message);
        alert('Пользователь уже существует или ошибка: ' + error.message);
    }
};

// Проверяем, есть ли уже вошедший пользователь при загрузке
setTimeout(() => {
    const currentUser = window.simpleGetCurrentUser();
    if (currentUser && typeof updateUIForLoggedInUser === 'function') {
        console.log('Найден вошедший пользователь при загрузке:', currentUser.username);
        updateUIForLoggedInUser(currentUser);
    }
}, 500);

console.log('🔥 Mock Firebase инициализирован для тестирования!');
console.log('💡 Для очистки данных выполните: clearMockFirebaseData()');
console.log('💡 Для создания тестового пользователя выполните: createTestUser()');
console.log('💡 Для очистки дублирующихся записей в рейтинге выполните: cleanDuplicateLeaderboard()');

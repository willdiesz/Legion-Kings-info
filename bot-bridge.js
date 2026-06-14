const mineflayer = require('mineflayer');
const WebSocket = require('ws');

// ================= НАСТРОЙКИ =================
const MINECRAFT_SERVER = 'legion-kings.ru'; // IP сервера
const BOT_USERNAME = 'willdie';     // Ник вашего бота (нужна лицензия или пиратский сервер)

const PORT = 8080; // Порт для вашего сайта
// =============================================

// 1. Запуск WebSocket-сервера для сайта на GitHub
const wss = new WebSocket.Server({ port: PORT });
let clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[Бот-Мост] Сайт подключился к боту');
    
    // Передаем список игроков (Mineflayer видит его автоматически через таб)
    if (bot && bot.players) {
        ws.send(JSON.stringify({
            type: 'players',
            players: Object.keys(bot.players)
        }));
    }

    ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
    const payload = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
}

// 2. Создание и запуск Майнкрафт-бота
let bot;

function createBot() {
    bot = mineflayer.createBot({
        host: MINECRAFT_SERVER,
        username: BOT_USERNAME,
        // auth: 'microsoft' // Раскомментируйте, если на сервере включен вход только по лицензиям
    });

    bot.on('login', () => {
        console.log(`[Бот] Успешно зашел на сервер под ником ${bot.username}`);
        
        // Если на сервере нужно вводить /login [Пароль] при входе:
        // setTimeout(() => bot.chat('/login willdiepasslk7'), 2000);
    });

    // Перехват сообщений чата
    bot.on('chat', (username, message) => {
        // Проверяем, системное ли это сообщение, или отправлено сервером в вашем формате
        // В Mineflayer 'chat' триггерится на стандартные сообщения. 
        // Но так как у вас кастомный формат "Л | Игрок » Текст", лучше использовать событие 'messagestr'
    });

    bot.on('messagestr', (message, position) => {
        // Игнорируем системные сообщения из статус-бара (над инвентарем)
        if (position === 'status') return; 

        // Ищем строку формата: Л | Игрок » Текст
        // Регулярное выражение адаптировано под чистый текст из игры
        const match = message.match(/Г\s+\|\s+([a-zA-Z0-9_а-яА-Я]+)\s+»\s+(.*)/);

        if (match) {
            const nickname = match[1];
            const text = match[2];
            console.log(`[Поймано] ${nickname}: ${text}`);

            // Отправляем на GitHub Pages
            broadcast({
                type: 'message',
                user: `🌐 [Глобальный] ${nickname}`,
                text: text,
                time: new Date().toLocaleTimeString()
            });
        }
    });

    // Обновление списка игроков для сайта (раз в 10 секунд)
    setInterval(() => {
        if (bot && bot.players) {
            broadcast({
                type: 'players',
                players: Object.keys(bot.players)
            });
        }
    }, 10000);

    bot.on('kick', (reason) => {
        console.log(`[Бот] Кикнули с сервера: ${reason}. Переподключение через 10 сек...`);
        setTimeout(createBot, 10000);
    });

    bot.on('error', (err) => console.log('[Бот] Ошибка:', err));
}

createBot();

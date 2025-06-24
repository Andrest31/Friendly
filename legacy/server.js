const express = require('express');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const axios = require('axios');

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
          return cb(new Error('Неверный формат файла.'));
      }
      cb(null, true);
  }
});

// redis
const redis = require('redis');
const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
});

client.connect().catch(console.error);

const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('Новое подключение, socket id:', socket.id);
    
    // Регистрируем пользователя по telegram_id
    socket.on('register', (data) => {
      const { telegram_id } = data;
      if (telegram_id) {
        connectedUsers.set(telegram_id, socket);
        console.log(`Пользователь ${telegram_id} зарегистрирован с socket ${socket.id}`);
      }
    });
  
    socket.on('disconnect', () => {
      for (const [telegram_id, s] of connectedUsers.entries()) {
        if (s.id === socket.id) {
          connectedUsers.delete(telegram_id);
          console.log(`Пользователь ${telegram_id} отключился`);
          break;
        }
      }
    });
});

// .env
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  console.error("Ошибка: BOT_TOKEN не найден в .env файле");
  process.exit(1);
}

// db
const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const { body, param, validationResult } = require('express-validator');

// Middleware для проверки параметров
const validateTelegramId = param('telegram_id')
  .isLength({ min: 5, max: 64 })
  .withMessage('Неверный формат telegram_id');

// Middleware для проверки тела запроса
const validateProfile = [
  body('name').trim().notEmpty().withMessage('Имя не может быть пустым.'),
  body('faculty_id').isInt({ gt: 0 }).withMessage('Факультет не выбран.'),
];

// Обработка ошибок
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// limit
const rateLimit = require('express-rate-limit');

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов за 15 минут
  message: 'Слишком много запросов, попробуйте позже.',
});

// Примените для всех маршрутов
app.use(limiter);

// APIs
app.get('/api/check-user/:telegram_id', async (req, res) => {
  const telegram_id = req.params.telegram_id;
  try {
      const [rows] = await db.query('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
      if (rows.length > 0) {
          res.json({ isFirstVisit: false });
      } else {
          res.json({ isFirstVisit: true });
      }
  } catch (error) {
      console.error('Ошибка базы данных:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/save-profile', validateProfile, handleValidationErrors, async (req, res) => {
    const { telegram_id, name, avatar, faculty_id, about, username } = req.body;
  
    if (!faculty_id || faculty_id === '0') {
        return res.status(400).json({ error: 'Факультет не выбран.' });
    }
  
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Имя не может быть пустым.' });
    }
  
    try {
      const [existingUser] = await db.query(
        `SELECT username FROM users WHERE telegram_id = ?`, 
        [telegram_id]
      );
  
      if (existingUser.length > 0 && existingUser[0].username !== username) {
        await db.query(
          `UPDATE users 
           SET username = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE telegram_id = ?`,
          [username, telegram_id]
        );
      }
  
      await db.query(
        `INSERT INTO users (telegram_id, name, avatar, faculty_id, about, username, is_first_time)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE 
            name = ?, 
            avatar = ?, 
            faculty_id = ?, 
            about = ?, 
            username = ?, 
            updated_at = CURRENT_TIMESTAMP`,
        [telegram_id, name, avatar, faculty_id, about, username, name, avatar, faculty_id, about, username]
      );
  
      const [rows] = await db.query(
        `SELECT 
           u.name, 
           u.avatar, 
           u.faculty_id, 
           f.name AS faculty_name, 
           u.about, 
           u.username
         FROM users u
         LEFT JOIN faculties f ON u.faculty_id = f.id
         WHERE u.telegram_id = ?`, 
        [telegram_id]
      );
  
      if (rows.length > 0) {
          const updatedUser = rows[0];
          res.json({
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            faculty_id: updatedUser.faculty_id,
            faculty_name: updatedUser.faculty_name, 
            about: updatedUser.about,
            username: updatedUser.username
          });
      } else {
          res.status(404).json({ error: 'Пользователь не найден.' });
      }
    } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  app.post('/api/delete-profile', async (req, res) => {
    const { telegram_id } = req.body;
  
    if (!telegram_id) {
        return res.status(400).json({ error: 'Telegram ID не указан.' });
    }
  
    try {
        const [rows] = await db.query('SELECT avatar FROM users WHERE telegram_id = ?', [telegram_id]);
        const user = rows[0];
  
        if (user && user.avatar) {
            const avatarPath = path.join(__dirname, user.avatar.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(avatarPath)) {
                try {
                    fs.unlinkSync(avatarPath);
                } catch (unlinkError) {
                    console.error('Ошибка удаления файла аватара:', unlinkError);
                }
            }
        }
  
        const [result] = await db.query('DELETE FROM users WHERE telegram_id = ?', [telegram_id]);
  
        if (result.affectedRows > 0) {
            // Удаляем ключ просмотров
            const viewedKey = `viewed:${telegram_id}`;
            try {
                const redisResult = await client.del(viewedKey);
                if (redisResult > 0) {
                    console.log(`Данные с ключом ${viewedKey} успешно удалены из Redis.`);
                } else {
                    console.log(`Данные с ключом ${viewedKey} отсутствовали в Redis.`);
                }
            } catch (redisError) {
                console.error('Ошибка удаления данных из Redis:', redisError);
            }
            
            // Удаляем уведомления
            const notificationsKey = `notifications:${telegram_id}`;
            try {
                const redisResult = await client.del(notificationsKey);
                if (redisResult > 0) {
                    console.log(`Уведомления с ключом ${notificationsKey} успешно удалены из Redis.`);
                } else {
                    console.log(`Уведомления с ключом ${notificationsKey} отсутствовали в Redis.`);
                }
            } catch (redisError) {
                console.error('Ошибка удаления уведомлений из Redis:', redisError);
            }
  
            res.json({ success: true, message: 'Профиль и связанные данные удалены.' });
        } else {
            res.status(404).json({ error: 'Пользователь не найден.' });
        }
    } catch (error) {
        console.error('Ошибка удаления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
  });

app.get('/api/get-user-profile/:telegram_id', async (req, res) => {
  const telegram_id = req.params.telegram_id;

  try {
      const [rows] = await db.query(`
          SELECT u.*, f.name AS faculty_name
          FROM users u
          LEFT JOIN faculties f ON u.faculty_id = f.id
          WHERE u.telegram_id = ?
      `, [telegram_id]);

      if (rows.length > 0) {
          const user = rows[0];
          res.json({
              name: user.name,
              avatar: user.avatar,
              faculty_id: user.faculty_id,
              faculty_name: user.faculty_name,
              about: user.about,
          });
      } else {
          res.json({});
      }
  } catch (error) {
      console.error('Ошибка базы данных:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/faculties', async (req, res) => {
  try {
      const [rows] = await db.query('SELECT id, name FROM faculties');
      res.json(rows);
  } catch (error) {
      console.error('Ошибка получения списка факультетов:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/get-random-user', async (req, res) => {
  const { telegram_id } = req.body;

  if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID не указан.' });
  }

  try {
      const viewed = await client.sMembers(`viewed:${telegram_id}`);

      const placeholders = viewed.length > 0 ? viewed.map(() => '?').join(',') : null;
      const query = `
          SELECT u.*, f.name AS faculty_name
          FROM users u
          LEFT JOIN faculties f ON u.faculty_id = f.id
          WHERE u.telegram_id != ?
          ${placeholders ? `AND u.telegram_id NOT IN (${placeholders})` : ''}
          ORDER BY RAND()
          LIMIT 1
      `;
      const params = [telegram_id, ...viewed];
      const queryParams = viewed.length > 0 ? params : [telegram_id];

      const [rows] = await db.query(query, queryParams);

      if (rows.length > 0) {
          const user = rows[0];
          res.json(user);
      } else {
          res.json(null);
      }
  } catch (error) {
      console.error('Ошибка базы данных:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// app.post('/api/reset-views', async (req, res) => {
//   const { telegram_id } = req.body;

//   if (!telegram_id) {
//       return res.status(400).json({ error: 'Telegram ID не указан.' });
//   }

//   try {
//       await client.del(`viewed:${telegram_id}`);
//       res.json({ message: 'Просмотры успешно сброшены.' });
//   } catch (error) {
//       console.error('Ошибка сброса просмотров:', error);
//       res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    const { telegram_id } = req.body;
    const avatarFile = req.file;

    if (!telegram_id || !avatarFile) {
        return res.status(400).json({ message: 'Отсутствует telegram_id или файл.' });
    }

    try {
        const [result] = await db.query('SELECT avatar FROM users WHERE telegram_id = ?', [telegram_id]);
        const user = result[0];

        if (user && user.avatar) {
            const oldAvatarPath = path.join(__dirname, user.avatar.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
                console.log('Старый аватар удален:', oldAvatarPath);
            }
        }

        const avatarUrl = `/uploads/${avatarFile.filename}`;
        await db.query('UPDATE users SET avatar = ? WHERE telegram_id = ?', [avatarUrl, telegram_id]);

        res.json({ avatarUrl });
    } catch (error) {
        console.error('Ошибка обновления аватара:', error);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function sendTelegramNotificationWithButton(telegram_id, message) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: telegram_id,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: "Открыть мини‑приложение", 
                web_app: { url: process.env.MINI_APP_URL } 
              }
            ]
          ]
        }
      });
      console.log(`Telegram уведомление с кнопкой отправлено пользователю ${telegram_id}`);
    } catch (error) {
      console.error('Ошибка отправки уведомления в Telegram:', error.message);
      if (error.response && error.response.data) {
        console.error('Ответ API:', error.response.data);
      }
    }
  }

app.post('/api/like-user', async (req, res) => {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
        return res.status(400).json({ error: 'Не указаны оба пользователя.' });
    }

    try {
        const [users] = await db.query(
            'SELECT id, telegram_id FROM users WHERE telegram_id IN (?, ?)',
            [fromUserId, toUserId]
        );

        if (users.length < 2) {
            return res.status(404).json({ error: 'Один или оба пользователя не найдены.' });
        }

        const fromUser = users.find(user => user.telegram_id === fromUserId);
        const toUser = users.find(user => user.telegram_id === toUserId);

        if (!fromUser || !toUser) {
            return res.status(404).json({ error: 'Пользователи не найдены.' });
        }

        await db.query(
            'INSERT INTO likes (from_user_id, to_user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
            [fromUser.id, toUser.id]
        );

        const [rows] = await db.query(
            'SELECT * FROM likes WHERE from_user_id = ? AND to_user_id = ?',
            [toUser.id, fromUser.id]
        );

        if (rows.length > 0) {
            await db.query(
              'INSERT INTO matches (user1_id, user2_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
              [fromUser.id, toUser.id]
            );
            
            await incrementNotification(fromUser.telegram_id, 'match');
            await incrementNotification(toUser.telegram_id, 'match');
            
            const matchLink = process.env.MINI_APP_URL;
            const onlineMessage = "Новый мэтч! 🎉"; 
            const offlineMessage = "Новый мэтч! 🎉 Нажмите кнопку ниже, чтобы перейти к мэтчам."; // Для пользователей, которых нет в сети

            if (connectedUsers.has(fromUser.telegram_id)) {
            connectedUsers.get(fromUser.telegram_id).emit('new_match', { message: onlineMessage });
            } else {
                await sendTelegramNotificationWithButton(fromUser.telegram_id, offlineMessage, matchLink);
            }

            if (connectedUsers.has(toUser.telegram_id)) {
            connectedUsers.get(toUser.telegram_id).emit('new_match', { message: onlineMessage });
            } else {
                await sendTelegramNotificationWithButton(toUser.telegram_id, offlineMessage, matchLink);
            }
            
            return res.json({ isMatch: true });
        } else {
            return res.json({ isMatch: false });
        }
        
    } catch (error) {
        console.error('Ошибка при обработке лайка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.get('/api/get-matches/:telegram_id', async (req, res) => {
    const telegram_id = req.params.telegram_id;

    try {
        const [user] = await db.query(`
            SELECT id FROM users WHERE telegram_id = ?
        `, [telegram_id]);

        if (user.length === 0) {
            console.log('Пользователь не найден');
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user_id = user[0].id;

        const [matches] = await db.query(`
            SELECT 
                m.id, 
                CASE
                    WHEN m.user1_id = ? THEN m.user2_id
                    ELSE m.user1_id
                END AS matched_user_id,
                u.name AS matched_name,
                u.avatar AS matched_avatar,
                u.username AS matched_username
            FROM matches m
            JOIN users u ON (u.id = m.user1_id OR u.id = m.user2_id)
            WHERE (m.user1_id = ? OR m.user2_id = ?)
              AND u.id != ?  -- исключаем самого пользователя из результатов
        `, [user_id, user_id, user_id, user_id]);

        if (matches.length === 0) {
            return res.json([]);
        }

        const matchData = matches.map(match => ({
            name: match.matched_name,
            avatar: match.matched_avatar,
            username: match.matched_username,
        }));

        res.json(matchData);

    } catch (error) {
        console.error('Ошибка получения мэтчей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/mark-viewed', async (req, res) => {
    const { telegram_id, viewed_user_id } = req.body;

    if (!telegram_id || !viewed_user_id) {
        return res.status(400).json({ error: 'Telegram ID или ID пользователя не указаны.' });
    }

    try {
        await client.sAdd(`viewed:${telegram_id}`, String(viewed_user_id));
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Ошибка базы данных:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/get-notifications/:telegram_id', async (req, res) => {
    const telegram_id = req.params.telegram_id;
    try {
      const data = await client.get(`notifications:${telegram_id}`);
      if (data) {
        res.json(JSON.parse(data));
      } else {
        res.json({ match: 0, home: 0 });
      }
    } catch (error) {
      console.error('Ошибка получения уведомлений:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.post('/api/reset-notifications', async (req, res) => {
    const { telegram_id, type } = req.body;
    if (!telegram_id || !type) {
      return res.status(400).json({ error: 'telegram_id и type обязательны' });
    }
    try {
      const key = `notifications:${telegram_id}`;
      let data = await client.get(key);
      let obj = {};
      if (data) {
        obj = JSON.parse(data);
      }
      obj[type] = 0;
      await client.set(key, JSON.stringify(obj));
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка сброса уведомлений:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
});

async function incrementNotification(telegram_id, type) {
    const key = `notifications:${telegram_id}`;
    let data = await client.get(key);
    let obj = {};
    if (data) {
      try {
        obj = JSON.parse(data);
      } catch (e) {
        obj = {};
      }
    }
    obj[type] = (obj[type] || 0) + 1;
    await client.set(key, JSON.stringify(obj));
  }

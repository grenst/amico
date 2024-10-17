require("./keepAlive"); // Keep-Alive сервер

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHANNEL_ID = process.env.CHAT_ID;

const questions = [
  "твой псевдоним",
  "твой возраст (от 10-ти лет)",
  "сколько вопросов хотите?",
  "сможешь скинуть ответы за 3 дня?",
  "твой юз",
  "твой тгк",
];

const users = {};

// Начало работы бота
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: 0, answers: [] };

  // Кастомная клавиатура с кнопками
  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: "Вернуться на шаг назад" }],
        [{ text: "Вернуться в начало анкеты" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false, // Клавиатура будет оставаться до тех пор, пока не будет скрыта
    },
  };

  bot.sendMessage(
    chatId,
    "Добро пожаловать! Сейчас мы соберём вашу заявку для Ами. Ответьте на несколько вопросов.",
    keyboard,
  );

  bot.sendMessage(chatId, questions[0], keyboard); // Показываем первый вопрос вместе с кнопками
});

// Обработка кнопок и ответов на вопросы
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) return;

  const user = users[chatId];

  // Обработка нажатий на кнопки
  if (msg.text === "Вернуться на шаг назад") {
    if (user.step > 0) {
      user.step -= 1; // Шаг назад
      user.answers.pop(); // Удаляем последний ответ
      bot.sendMessage(chatId, `Давайте вернёмся. ${questions[user.step]}`);
    } else {
      bot.sendMessage(chatId, "Вы находитесь на первом шаге анкеты.");
    }
    return;
  }

  if (msg.text === "Вернуться в начало анкеты") {
    user.step = 0; // Возвращаемся в начало
    user.answers = []; // Очищаем ответы
    bot.sendMessage(chatId, "Начнём заново. " + questions[0]);
    return;
  }

  // Если пользователь отвечает на вопросы анкеты
  if (user.step < questions.length) {
    user.answers.push(msg.text);
    user.step += 1;

    if (user.step < questions.length) {
      bot.sendMessage(chatId, questions[user.step]);
    } else {
      bot.sendMessage(
        chatId,
        "Спасибо! Ваша заявка принята. Ami скоро её рассмотрит ^_^",
      );

      // Формирование сообщения с заявкой
      const userMessage = `
      Новая заявка:
      1. псевдоним: ${user.answers[0]}
      2. возраст: ${user.answers[1]}
      3. Сколько вопросов: ${user.answers[2]}
      4. ответы за 3 дня: ${user.answers[3]}
      5. юз: ${user.answers[4]}
      6. тгк: ${user.answers[5]}
      `;

      // Отправка заявки в канал
      bot
        .sendMessage(CHANNEL_ID, userMessage)
        .then(() => console.log("Заявка отправлена в канал ami"))
        .catch((error) => console.log("Ошибка отправки заявки:", error));

      delete users[chatId]; // Очистка данных после отправки заявки
    }
  }
});

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHANNEL_ID = process.env.CHAT_ID;

const questions = [
  "Ваш псевдоним",
  "Ваш возраст (от 11-ти лет)",
  "Сколько вопросов хотите?",
  "Сможете скинуть ответы за 3 дня?",
  "Ваш юз",
  "Вваш тгк!",
];

const users = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: 0, answers: [] };
  bot.sendMessage(
    chatId,
    "Добро пожаловать! Сейчас мы соберём вашу заявку для Ами. Ответьте на несколько вопросов.",
  );
  bot.sendMessage(chatId, questions[0]);
});

// bot
//   .sendMessage(CHANNEL_ID, userMessage)
//   .then(() => console.log("Заявка отправлена в канал"))
//   .catch((error) => {
//     console.error("Ошибка отправки заявки в канал:", error);
//     bot.sendMessage(chatId, "Произошла ошибка при отправке заявки в канал.");
//   });

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) return;

  const user = users[chatId];

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

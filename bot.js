require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const questions = [
  "Ваш псевдоним",
  "Ваш возраст (от 11-ти лет)",
  "Сколько вопросов хотите?",
  "Сможете скинуть ответы за 3 дня?",
  "Ваш юз",
  "Вваш тгк"
];

const users = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: 0, answers: [] };
  bot.sendMessage(chatId, "Добро пожаловать! Сейчас мы соберём вашу заявку для Ами. Ответьте на несколько вопросов.");
  bot.sendMessage(chatId, questions[0]);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) return;

  const user = users[chatId];
  
  if (user.step < questions.length) {
    user.answers.push(msg.text);
    user.step += 1;

    if (user.step < questions.length) {
      bot.sendMessage(chatId, questions[user.step]);
    } else {
      bot.sendMessage(chatId, "Спасибо! Ваша заявка принята.");
      console.log(`Новая заявка от пользователя ${chatId}:`, user.answers);
      delete users[chatId]; // Очистка данных после сбора анкеты
    }
  }
});

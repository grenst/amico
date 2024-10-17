require("./keepAlive"); // Keep-Alive сервер

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const CHANNEL_ID = process.env.CHAT_ID;

let questionsFormal = [
  "Ваш псевдоним",
  "Сколько вопросов Вы хотите?",
  "Сможете ли Вы скинуть ответы за 3 дня?",
  "Ваш юз",
  "Ваш тгк",
];

let questionsInformal = [
  "твой псевдоним",
  "сколько вопросов хочешь?",
  "сможешь скинуть ответы за 3 дня?",
  "твой юз",
  "твой тгк",
];

const users = {};

// Начало работы бота
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: 0, answers: [], isFormal: true, greeting: "" };

  // Клавиатура для выбора обращения
  const greetingKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "на Вы", callback_data: "formal" }],
        [{ text: "можно на ты", callback_data: "informal" }],
      ],
    },
  };

  bot.sendMessage(chatId, "Как к Вам обращаться?", greetingKeyboard);
});

// Обработка нажатий на inline-клавиатуру (Выбор обращения)
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const user = users[chatId];

  // Обработка выбранного обращения
  if (callbackQuery.data === "formal") {
    user.isFormal = true;
    user.greeting = "Вы"; // Сохраняем обращение
    bot.sendMessage(chatId, "Вы выбрали обращение на 'Вы'.");
  } else if (callbackQuery.data === "informal") {
    user.isFormal = false;
    user.greeting = "ты"; // Сохраняем обращение
    bot.sendMessage(chatId, "Вы выбрали обращение на 'ты'.");
  }

  // Переход к первому вопросу анкеты в зависимости от обращения
  user.step = 1; // Сдвиг шага на первый вопрос
  const questions = user.isFormal ? questionsFormal : questionsInformal;
  bot.sendMessage(chatId, questions[0]);
});

// Обработка нажатий на inline-клавиатуру для возраста
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const user = users[chatId];

  // Если пользователь выбирает возраст
  if (user && user.step === 2) {
    const selectedAge = callbackQuery.data;

    // Если выбран вариант "другой"
    if (selectedAge === "другой") {
      user.selectedOtherAge = true; // Устанавливаем флаг selectedOtherAge
    }

    user.answers.push(selectedAge); // Сохраняем возраст

    // Переход к следующему вопросу после возраста
    user.step += 1; // Корректный переход к следующему шагу
    const questions = user.isFormal ? questionsFormal : questionsInformal;
    bot.sendMessage(chatId, `твой возраст: ${selectedAge}`);
    bot.sendMessage(chatId, questions[user.step - 1]); // Переход к вопросу "сколько вопросов хотите?"
  }
});

// Обработка ответов на вопросы
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) return;

  const user = users[chatId];
  const questions = user.isFormal ? questionsFormal : questionsInformal;

  // Обработка отмены последнего ответа
  if (msg.text === "отменить последний ответ") {
    if (user.step > 1) {
      user.step -= 1;
      user.answers.pop();
      bot.sendMessage(chatId, `Давайте вернёмся. ${questions[user.step - 1]}`);
    } else {
      bot.sendMessage(chatId, "Вы находитесь на первом шаге анкеты.");
    }
    return;
  }

  // Обработка начала заново
  if (msg.text === "начать с начала") {
    user.step = 1;
    user.answers = [];
    bot.sendMessage(chatId, "Начнём заново. " + questions[0]);
    return;
  }

  // Если это шаг с псевдонимом
  if (user.step === 1) {
    user.answers.push(msg.text); // Сохраняем псевдоним
    user.step += 1;

    // Отправляем inline-клавиатуру с выбором возраста
    const ageKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "10", callback_data: "10" }],
          [{ text: "11", callback_data: "11" }],
          [{ text: "12", callback_data: "12" }],
          [{ text: "13", callback_data: "13" }],
          [{ text: "14", callback_data: "14" }],
          [{ text: "15", callback_data: "15" }],
          [{ text: "16", callback_data: "16" }],
          [{ text: "другой", callback_data: "другой" }],
        ],
      },
    };

    bot.sendMessage(chatId, "выбери свой возраст:", ageKeyboard);
    return;
  }

  // Проверка количества вопросов (3-й вопрос)
  if (user.step === 3) {
    const numberOfQuestions = parseInt(msg.text);
    if (isNaN(numberOfQuestions) || numberOfQuestions > 7) {
      bot.sendMessage(chatId, "можно лишь до семи вопросов. Введите снова:");
      return;
    }

    user.answers.push(msg.text); // Сохраняем количество вопросов
    user.step += 1;
    bot.sendMessage(chatId, questions[user.step - 1]); // Переход к следующему вопросу
    return;
  }

  // Проверка юзера (5-й вопрос)
  if (user.step === 5) {
    let username = msg.text;

    // Убираем https://t.me/ если это ссылка
    if (username.startsWith("https://t.me/")) {
      username = username.replace("https://t.me/", "@");
    } else if (username.startsWith("http://t.me/")) {
      username = username.replace("http://t.me/", "@");
    } else if (!username.startsWith("@")) {
      // Добавляем @, если его нет
      username = "@" + username;
    }

    user.answers.push(username); // Сохраняем юзера в нужном формате
    user.step += 1;
    bot.sendMessage(chatId, questions[user.step - 1]); // Переход к следующему вопросу
    return;
  }

  // Сохранение ответов для всех остальных вопросов
  user.answers.push(msg.text);
  user.step += 1;

  // Если это последний вопрос
  if (user.step > questions.length) {
    bot.sendMessage(
      chatId,
      "Спасибо! Ваша заявка принята. Ami скоро её рассмотрит ^_^"
    );

    // Формирование сообщения с заявкой
    const userMessage = `
    Новая заявка:
    0. Обращение: ${user.greeting}
    1. псевдоним: ${user.answers[0]}
    2. возраст: ${user.answers[1]}
    3. сколько вопросов: ${user.answers[2]}
    4. ответы за 3 дня: ${user.answers[3]}
    5. юз: ${user.answers[4]}
    6. тгк: ${user.answers[5]}
    `;

    bot
      .sendMessage(CHANNEL_ID, userMessage)
      .then(() => console.log("Заявка отправлена на рассмотрение ami"))
      .catch((error) => console.log("Ошибка отправки заявки:", error));

    delete users[chatId]; // Очистка данных после отправки заявки
  } else {
    // Переход к следующему вопросу
    bot.sendMessage(chatId, questions[user.step - 1]);
  }
});

import os
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Updater, CommandHandler, MessageHandler, CallbackQueryHandler, CallbackContext
from telegram.ext.filters import TextFilter
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Получаем токен и ID канала из .env
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")

# Вопросы анкеты
questions = [
    "твой псевдоним",
    "сколько вопросов хотите?",
    "сможешь скинуть ответы за 3 дня?",
    "твой юз",
    "твой тгк"
]

# Словарь для хранения данных пользователей
users = {}

def start(update: Update, context: CallbackContext) -> None:
    chat_id = update.message.chat_id
    users[chat_id] = {"step": 0, "answers": [], "selectedOtherAge": False}

    # Приветственное сообщение и первый вопрос
    update.message.reply_text("Добро пожаловать! Сейчас мы соберём вашу заявку.")
    update.message.reply_text(questions[0])

def handle_message(update: Update, context: CallbackContext) -> None:
    chat_id = update.message.chat_id

    if chat_id not in users:
        return

    user = users[chat_id]
    
    # Обработка первого вопроса (псевдоним)
    if user["step"] == 0:
        user["answers"].append(update.message.text)
        user["step"] += 1
        
        # Отправляем клавиатуру для выбора возраста
        keyboard = [
            [InlineKeyboardButton("18", callback_data='18')],
            [InlineKeyboardButton("19", callback_data='19')],
            [InlineKeyboardButton("20", callback_data='20')],
            [InlineKeyboardButton("21", callback_data='21')],
            [InlineKeyboardButton("другой", callback_data='другой')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        update.message.reply_text("Пожалуйста, выбери свой возраст:", reply_markup=reply_markup)
    
    # Обработка других вопросов после выбора возраста
    elif user["step"] < len(questions):
        user["answers"].append(update.message.text)
        user["step"] += 1

        if user["step"] < len(questions):
            update.message.reply_text(questions[user["step"]])
        else:
            send_application(chat_id, user, context)

def button_handler(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    chat_id = query.message.chat_id
    user = users.get(chat_id)

    if not user:
        return

    # Обработка выбора возраста
    selected_age = query.data
    if selected_age == "другой":
        user["selectedOtherAge"] = True

    user["answers"].append(selected_age)
    user["step"] += 1

    query.answer()
    query.edit_message_text(f"Вы выбрали возраст: {selected_age}")

    # Переход к следующему вопросу
    if user["step"] < len(questions):
        context.bot.send_message(chat_id, questions[user["step"]])
    else:
        send_application(chat_id, user, context)

def send_application(chat_id, user, context):
    # Определяем заголовок
    header = "Новая заявка (age ❗):" if user["selectedOtherAge"] else "Новая заявка:"
    
    # Формируем сообщение
    user_message = f"""
    {header}
    1. псевдоним: {user['answers'][0]}
    2. возраст: {user['answers'][1]}
    3. Сколько вопросов: {user['answers'][2]}
    4. ответы за 3 дня: {user['answers'][3]}
    5. юз: {user['answers'][4]}
    6. тгк: {user['answers'][5]}
    """
    
    # Отправляем сообщение в канал
    context.bot.send_message(chat_id=CHAT_ID, text=user_message)
    context.bot.send_message(chat_id=chat_id, text="Спасибо! Ваша заявка принята.")

    # Удаляем данные пользователя
    del users[chat_id]

def main():
    # Создание апдейтера и диспетчера
    updater = Updater(TELEGRAM_TOKEN)
    dispatcher = updater.dispatcher

    # Обработчики команд и сообщений
    dispatcher.add_handler(CommandHandler("start", start))
    dispatcher.add_handler(MessageHandler(TextFilter(), handle_message))
    dispatcher.add_handler(CallbackQueryHandler(button_handler))

    # Запуск бота
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()

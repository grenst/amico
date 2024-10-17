import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from dotenv import load_dotenv
from flask import Flask, request
import logging
import asyncio

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Загрузка переменных окружения
load_dotenv()

# Получаем токен и ID канала из .env
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")  # URL для webhook

# Flask-приложение для получения вебхуков
app = Flask(__name__)

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

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.message.chat_id
    users[chat_id] = {"step": 0, "answers": [], "selectedOtherAge": False}

    # Приветственное сообщение и первый вопрос
    await update.message.reply_text("Добро пожаловать! Сейчас мы соберём вашу заявку.")
    await update.message.reply_text(questions[0])

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
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
        await update.message.reply_text("Пожалуйста, выбери свой возраст:", reply_markup=reply_markup)
    
    # Обработка других вопросов после выбора возраста
    elif user["step"] < len(questions):
        user["answers"].append(update.message.text)
        user["step"] += 1

        if user["step"] < len(questions):
            await update.message.reply_text(questions[user["step"]])
        else:
            await send_application(chat_id, user, context)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
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

    await query.answer()
    await query.edit_message_text(f"Вы выбрали возраст: {selected_age}")

    # Переход к следующему вопросу
    if user["step"] < len(questions):
        await context.bot.send_message(chat_id, questions[user["step"]])
    else:
        await send_application(chat_id, user, context)

async def send_application(chat_id, user, context):
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
    await context.bot.send_message(chat_id=CHAT_ID, text=user_message)
    await context.bot.send_message(chat_id=chat_id, text="Спасибо! Ваша заявка принята.")

    # Удаляем данные пользователя
    del users[chat_id]

# Установка webhook
@app.route(f'/{TELEGRAM_TOKEN}', methods=['POST'])
async def webhook_handler():
    update = Update.de_json(request.get_json(), application.bot)  # Используем application.bot
    await application.process_update(update)
    return 'ok'

async def setup_webhook():
    # Устанавливаем webhook
    await application.bot.set_webhook(url=f"{WEBHOOK_URL}/{TELEGRAM_TOKEN}")

async def main():
    # Создание приложения
    global application
    application = Application.builder().token(TELEGRAM_TOKEN).build()

    # Обработчики команд и сообщений
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(CallbackQueryHandler(button_handler))

    # Устанавливаем webhook
    await setup_webhook()

    # Запуск Flask приложения
    app.run(host="0.0.0.0", port=5000)

if __name__ == '__main__':
    # Запускаем основной асинхронный цикл
    asyncio.run(main())

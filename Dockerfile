# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы проекта
COPY . .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Задаём переменные окружения
ENV TELEGRAM_TOKEN=$TELEGRAM_TOKEN
ENV CHAT_ID=$CHAT_ID

# Запускаем приложение
CMD ["python", "bot.py"]

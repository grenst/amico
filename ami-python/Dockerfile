# Используем базовый образ Python
FROM python:3.12-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости
COPY requirements.txt requirements.txt

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем все файлы проекта
COPY . .

# Экспортируем порт для Flask
EXPOSE 5000

# Запускаем приложение с использованием gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:5000", "bot:app"]
import os
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, Update
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

# Загружаем токен и URL мини-приложения из файла .env
load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
MINI_APP_URL = os.getenv("MINI_APP_URL")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обрабатывает команду /start"""
    user = update.effective_user

    # Создаем кнопку Web App
    web_app_button = InlineKeyboardButton(
        text="Открыть мини-приложение",
        web_app=WebAppInfo(url=MINI_APP_URL)
    )
    keyboard = [[web_app_button]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=f"Привет, {user.first_name}! Нажми на кнопку ниже, чтобы открыть мини-приложение:",
        reply_markup=reply_markup
    )

def main():
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.run_polling()

if __name__ == "__main__":
    main()

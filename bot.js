/**
 * AstroBot - Main Entry Point
 * Telegram bot for Vedic astrology consultation + lead generation
 */

const TelegramBot = require("node-telegram-bot-api");
const SessionManager = require("./sessionManager");
const ConversationAgent = require("./conversationAgent");
const config = require("./config");

const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
};

const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });
const sessionManager = new SessionManager();
const conversationAgent = new ConversationAgent(bot, sessionManager);

logger.info("🚀 AstroBot starting...");

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Reset any existing session
    sessionManager.resetSession(userId);
    await conversationAgent.handleStart(chatId, userId, msg.from);
  } catch (err) {
    logger.error("Error in /start:", err);
    bot.sendMessage(
      chatId,
      "Kuch technical issue aa gaya. Please /start karke dobara try karein. 🙏"
    );
  }
});

// Handle /reset command
bot.onText(/\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  sessionManager.resetSession(userId);
  bot.sendMessage(
    chatId,
    "✨ Session reset ho gaya! /start karein naye consultation ke liye."
  );
});

// Handle /status command (for testing)
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = sessionManager.getSession(userId);
  if (session) {
    bot.sendMessage(
      chatId,
      `📊 Current Step: ${session.step}\nName: ${session.data.name || "N/A"}`
    );
  } else {
    bot.sendMessage(chatId, "No active session. Type /start to begin.");
  }
});

// Handle all text messages
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    await conversationAgent.handleMessage(chatId, userId, msg.text);
  } catch (err) {
    logger.error("Error handling message:", err);
    bot.sendMessage(
      chatId,
      "Ek minute... kuch issue aa gaya. Please dobara try karein ya /start karein. 🙏"
    );
  }
});

// Handle callback queries (inline buttons)
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    bot.answerCallbackQuery(query.id);
    await conversationAgent.handleCallbackQuery(chatId, userId, data);
  } catch (err) {
    logger.error("Error handling callback:", err);
    bot.sendMessage(chatId, "Kuch issue aa gaya. Please /start karein. 🙏");
  }
});

// Error handling
bot.on("polling_error", (err) => {
  logger.error("Polling error:", err.message);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
});

logger.info(
  "✅ AstroBot is live! Waiting for messages... Send /start to begin."
);

/**
 * Configuration - all env vars + constants
 * Copy .env.example to .env and fill in your values
 */

try { require("dotenv").config(); } catch(e) { /* dotenv optional in test env */ }

const config = {
  // ── Telegram ──────────────────────────────────────────────
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || "YOUR_BOT_TOKEN_HERE",

  // ── Admin ─────────────────────────────────────────────────
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || "", // Admin's Telegram chat ID
  ADMIN_WHATSAPP: process.env.ADMIN_WHATSAPP || "919876543210", // WhatsApp number for handoff
  ASTROLOGER_NAME: process.env.ASTROLOGER_NAME || "Pandit Ji",

  // ── Payment ───────────────────────────────────────────────
  PAYMENT_AMOUNT: process.env.PAYMENT_AMOUNT || "499",
  PAYMENT_CURRENCY: process.env.PAYMENT_CURRENCY || "INR",
  PAYMENT_UPI_ID: process.env.PAYMENT_UPI_ID || "astrologer@upi",
  PAYMENT_QR_URL: process.env.PAYMENT_QR_URL || "", // URL to QR code image

  // ── Session ───────────────────────────────────────────────
  SESSION_TTL_MS: 30 * 60 * 1000, // 30 minutes
  MAX_QUESTIONS: 5,
  FREE_QUESTIONS: 2, // questions answered free (teaser)

  // ── Astrology API (optional - fallback to mock) ───────────
  // If you have a custom astrology API endpoint, set it here.
  // Otherwise the bot uses the built-in Swiss Ephemeris-style calculator.
  ASTRO_API_URL: process.env.ASTRO_API_URL || "",
  ASTRO_API_KEY: process.env.ASTRO_API_KEY || "",

  // ── Feature Flags ─────────────────────────────────────────
  USE_LIVE_ASTRO: process.env.USE_LIVE_ASTRO === "true", // false = use mock calculations
  DEBUG_MODE: process.env.DEBUG_MODE === "true",
};

// Validate critical config
if (
  config.TELEGRAM_TOKEN === "YOUR_BOT_TOKEN_HERE" &&
  process.env.NODE_ENV !== "test"
) {
  console.warn(
    "⚠️  WARNING: TELEGRAM_TOKEN not set. Please configure your .env file."
  );
}

module.exports = config;

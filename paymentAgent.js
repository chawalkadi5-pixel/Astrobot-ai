/**
 * Payment Agent
 * Handles UPI payment instructions, confirmation, and admin notification.
 *
 * MVP Flow:
 *  1. Send user QR code / UPI ID
 *  2. User manually confirms payment via button
 *  3. Bot asks for UTR/transaction ID
 *  4. Mark as confirmed, notify admin
 *
 * For production: Integrate Razorpay / PayU / Cashfree webhooks
 */

const config = require("./config");

class PaymentAgent {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Send payment instructions to user
   */
  async sendPaymentInstructions(chatId, session) {
    const { name } = session.data;
    const firstName = (name || "").split(" ")[0];

    const message =
      `💫 *Premium Reading — Full Unlock*\n\n` +
      `${firstName} ji, aapke 5 sawalon ka detailed, personalized jawab tayyar hai.\n\n` +
      `*Kya milega:*\n` +
      `✅ 5 sawalon ka complete answer\n` +
      `✅ Exact timing predictions\n` +
      `✅ Remedies (lal kitab + mantra)\n` +
      `✅ WhatsApp pe direct ${config.ASTROLOGER_NAME} se baat\n` +
      `✅ 48-hour follow-up Q&A\n\n` +
      `💰 *Sirf ₹${config.PAYMENT_AMOUNT}/-* (Regular ₹2499 ki jagah)\n\n` +
      `🛡️ *100% Money-Back Guarantee*\n` +
      `_Agar aap satisfied nahi hain reading se toh poora paisa wapas — koi sawaal nahi_\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `*Payment kaise karein:*\n` +
      `📱 UPI ID: \`${config.PAYMENT_UPI_ID}\`\n` +
      `Amount: ₹${config.PAYMENT_AMOUNT}/-\n\n` +
      `Payment karne ke baad *"Payment Done"* button dabayein 👇`;

    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Payment Done — Open Karo!", callback_data: "payment_done" }],
          [{ text: "🔙 Baad mein karunga", callback_data: "payment_later" }],
        ],
      },
    };

    // Send QR code image if configured
    if (config.PAYMENT_QR_URL) {
      try {
        await this.bot.sendPhoto(chatId, config.PAYMENT_QR_URL, {
          caption: `📲 Scan karein ya UPI ID use karein: \`${config.PAYMENT_UPI_ID}\``,
          parse_mode: "Markdown",
        });
      } catch (e) {
        console.warn("Could not send QR code image:", e.message);
      }
    }

    await this.bot.sendMessage(chatId, message, opts);
  }

  /**
   * Ask for UTR (transaction reference) after user clicks "Payment Done"
   */
  async askForUTR(chatId) {
    await this.bot.sendMessage(
      chatId,
      `✅ Bahut accha!\n\nApna *UPI Transaction ID / UTR number* yahan paste karein taaki hum confirm kar sakein:\n\n_(Example: 123456789012)_`,
      { parse_mode: "Markdown" }
    );
  }

  /**
   * Validate UTR format (basic check)
   */
  validateUTR(utr) {
    return utr && utr.trim().length >= 8;
  }

  /**
   * Confirm payment and store reference
   */
  async confirmPayment(chatId, session, utr) {
    const { name } = session.data;
    const firstName = (name || "").split(" ")[0];

    // In production: verify with payment gateway API
    // For MVP: trust the UTR and mark confirmed
    console.log(`Payment UTR received for user ${session.userId}: ${utr}`);

    await this.bot.sendMessage(
      chatId,
      `🎉 *Payment Confirm Ho Gaya, ${firstName} Ji!*\n\n` +
        `Aapka premium reading unlock ho gaya hai.\n\n` +
        `Ab main aapko hamare expert astrologer *${config.ASTROLOGER_NAME}* ke WhatsApp pe connect kar raha hoon...`,
      { parse_mode: "Markdown" }
    );

    return true;
  }

  /**
   * Send WhatsApp handoff message to user
   */
  async sendHandoffToUser(chatId, session) {
    const { name, questions, dob, pob } = session.data;
    const firstName = (name || "").split(" ")[0];
    const waNumber = config.ADMIN_WHATSAPP;
    const waLink = `https://wa.me/${waNumber}`;

    // Pre-filled WhatsApp message
    const waText = encodeURIComponent(
      `Namaste! Main ${name} hoon. Maine AstroBot pe premium reading kharidi hai (DOB: ${dob}). Mere sawal ready hain.`
    );
    const waDeepLink = `https://wa.me/${waNumber}?text=${waText}`;

    const handoffMsg =
      `✨ *Aapka Premium Session Ready Hai!*\n\n` +
      `*${firstName} ji*, ab aap seedha hamare expert astrologer se baat kar sakte hain:\n\n` +
      `👨‍🔮 *${config.ASTROLOGER_NAME}*\n` +
      `📱 WhatsApp: +${waNumber}\n\n` +
      `Neeche button dabayein — WhatsApp automatically khul jaayega:\n\n` +
      `_Bot yahan stop ho raha hai. Baaki consultation WhatsApp pe hogi._\n\n` +
      `🙏 Dhanyawad! Aapko shubbh reading mile.`;

    await this.bot.sendMessage(chatId, handoffMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 WhatsApp Pe Baat Karein", url: waDeepLink }],
        ],
      },
    });
  }

  /**
   * Notify admin with full user details
   */
  async notifyAdmin(session) {
    if (!config.ADMIN_CHAT_ID) {
      console.warn("ADMIN_CHAT_ID not configured — skipping admin notification");
      return;
    }

    const { name, dob, tob, pob, questions, telegramUser, paymentRef } =
      session.data;

    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const adminMsg =
      `🔔 *NEW PREMIUM BOOKING*\n\n` +
      `👤 *User Details:*\n` +
      `Name: ${name}\n` +
      `DOB: ${dob} | Time: ${tob}\n` +
      `Place: ${pob}\n` +
      `Telegram: @${telegramUser?.username || "N/A"} (ID: ${session.userId})\n\n` +
      `💰 *Payment:*\n` +
      `Status: ✅ CONFIRMED\n` +
      `UTR/Ref: ${paymentRef || "Not provided"}\n` +
      `Amount: ₹${config.PAYMENT_AMOUNT}\n\n` +
      `❓ *User's 5 Questions:*\n` +
      `${questionsText}\n\n` +
      `⏰ Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    try {
      await this.bot.sendMessage(config.ADMIN_CHAT_ID, adminMsg, {
        parse_mode: "Markdown",
      });
      console.log(`Admin notified for user ${session.userId}`);
    } catch (err) {
      console.error("Failed to notify admin:", err.message);
    }
  }

  /**
   * Handle "pay later" — send reminder
   */
  async sendPayLaterMessage(chatId, session) {
    const { name } = session.data;
    const firstName = (name || "").split(" ")[0];

    await this.bot.sendMessage(
      chatId,
      `😊 Bilkul ${firstName} ji!\n\n` +
        `Jab bhi tayyar hon, yahan /start karein aur apni reading unlock karein.\n\n` +
        `🛡️ Yaad rahein: *Money-back guarantee* hamesha valid hai.\n\n` +
        `Aapke sawal yahan save hain. 🙏`,
      { parse_mode: "Markdown" }
    );
  }
}

module.exports = PaymentAgent;

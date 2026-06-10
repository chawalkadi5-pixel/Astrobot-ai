/**
 * Conversation Agent
 * Orchestrates the full user journey:
 *  Onboarding → Kundali → Questions → Upsell → Payment → Handoff
 */

const { STEPS } = require("../services/sessionManager");
const AstroAgent = require("./astroAgent");
const PaymentAgent = require("./paymentAgent");
const { validateDOB, validateTOB, validateName, validatePlace } = require("../utils/validators");
const { logger } = require("../utils/logger");
const config = require("../../config/config");

// Typing simulation delay (ms)
const TYPING_DELAY = 800;

class ConversationAgent {
  constructor(bot, sessionManager) {
    this.bot = bot;
    this.sessionManager = sessionManager;
    this.astroAgent = new AstroAgent();
    this.paymentAgent = new PaymentAgent(bot);
  }

  // ── Entry Points ────────────────────────────────────────────────────────────

  async handleStart(chatId, userId, telegramUser) {
    const session = this.sessionManager.createSession(userId, telegramUser);
    const firstName = telegramUser?.first_name || "Dost";

    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `🙏 *Jai Shri Ram, ${firstName} Ji!*\n\n` +
        `Main hoon aapka *Vedic Jyotish Saathi* — aapki kundali se aapke past, present aur future ke raaz kholne ke liye tayyar hoon.\n\n` +
        `⭐ Lakho logon ne hamari readings se apni life ki sahi disha paai hai.\n\n` +
        `Shuru karte hain? Sabse pehle aapka *poora naam* batayein 👇`,
      { parse_mode: "Markdown" }
    );

    this.sessionManager.setStep(userId, STEPS.COLLECT_NAME);
  }

  async handleMessage(chatId, userId, text) {
    let session = this.sessionManager.getSession(userId);

    if (!session) {
      await this.bot.sendMessage(
        chatId,
        "Namaste! 🙏 /start karein apna consultation shuru karne ke liye."
      );
      return;
    }

    const step = session.step;
    logger.info(`User ${userId} | Step: ${step} | Input: ${text.substring(0, 50)}`);

    switch (step) {
      case STEPS.COLLECT_NAME:
        return this._handleCollectName(chatId, userId, text);
      case STEPS.COLLECT_DOB:
        return this._handleCollectDOB(chatId, userId, text);
      case STEPS.COLLECT_TOB:
        return this._handleCollectTOB(chatId, userId, text);
      case STEPS.COLLECT_POB:
        return this._handleCollectPOB(chatId, userId, text);
      case STEPS.ASK_QUESTIONS:
      case STEPS.COLLECTING_Q1:
      case STEPS.COLLECTING_Q2:
      case STEPS.COLLECTING_Q3:
      case STEPS.COLLECTING_Q4:
      case STEPS.COLLECTING_Q5:
        return this._handleCollectQuestion(chatId, userId, text, session);
      case STEPS.AWAITING_PAYMENT:
        return this._handlePaymentUTR(chatId, userId, text, session);
      case STEPS.COMPLETED:
        return this.bot.sendMessage(
          chatId,
          "Aapka consultation complete ho gaya hai. Naya session shuru karne ke liye /start karein. 🙏"
        );
      default:
        return this.bot.sendMessage(
          chatId,
          "Kuch samajh nahi aaya. /start karke dobara shuru karein. 🙏"
        );
    }
  }

  async handleCallbackQuery(chatId, userId, data) {
    const session = this.sessionManager.getSession(userId);
    if (!session) return;

    switch (data) {
      case "start_questions":
        return this._startQuestionCollection(chatId, userId);
      case "payment_done":
        return this._handlePaymentDone(chatId, userId, session);
      case "payment_later":
        return this.paymentAgent.sendPayLaterMessage(chatId, session);
      case "confirm_unlock":
        return this._showUpsellOffer(chatId, userId, session);
      default:
        logger.warn(`Unknown callback: ${data}`);
    }
  }

  // ── Step Handlers ───────────────────────────────────────────────────────────

  async _handleCollectName(chatId, userId, text) {
    if (!validateName(text)) {
      return this.bot.sendMessage(
        chatId,
        "Kripya apna *poora naam* likhein (sirf letters, kam se kam 2 characters).\nExample: *Priya Sharma*",
        { parse_mode: "Markdown" }
      );
    }

    this.sessionManager.updateSession(userId, { data: { name: text.trim() } });
    this.sessionManager.setStep(userId, STEPS.COLLECT_DOB);

    const firstName = text.split(" ")[0];
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `Bahut sundar naam hai, *${firstName} Ji!* 🌟\n\nAb apni *Date of Birth* batayein:\nFormat: *DD/MM/YYYY*\n\nExample: *15/08/1990*`,
      { parse_mode: "Markdown" }
    );
  }

  async _handleCollectDOB(chatId, userId, text) {
    const validation = validateDOB(text);
    if (!validation.valid) {
      return this.bot.sendMessage(
        chatId,
        `⚠️ ${validation.error}\n\nExample: *15/08/1990*`,
        { parse_mode: "Markdown" }
      );
    }

    this.sessionManager.updateSession(userId, { data: { dob: validation.formatted } });
    this.sessionManager.setStep(userId, STEPS.COLLECT_TOB);

    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `✅ DOB noted!\n\nAb apna *janam samay* (Birth Time) batayein:\nFormat: *HH:MM* (24-hour)\n\nExample: *14:30* (2:30 PM ke liye)\n\n_(Agar bilkul exact pata nahi toh approximate time bhi chalega)_`,
      { parse_mode: "Markdown" }
    );
  }

  async _handleCollectTOB(chatId, userId, text) {
    const validation = validateTOB(text);
    if (!validation.valid) {
      return this.bot.sendMessage(
        chatId,
        `⚠️ ${validation.error}\n\nExample: *14:30* ya *06:15*`,
        { parse_mode: "Markdown" }
      );
    }

    this.sessionManager.updateSession(userId, { data: { tob: validation.formatted } });
    this.sessionManager.setStep(userId, STEPS.COLLECT_POB);

    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `👍 Samay note ho gaya!\n\nAb apna *janam sthan* (Birth Place) batayein:\n\nExample: *Delhi, India* ya *Mumbai* ya *Patna, Bihar*`,
      { parse_mode: "Markdown" }
    );
  }

  async _handleCollectPOB(chatId, userId, text) {
    if (!validatePlace(text)) {
      return this.bot.sendMessage(
        chatId,
        "Kripya *valid janam sthan* likhein.\nExample: *Delhi, India*",
        { parse_mode: "Markdown" }
      );
    }

    this.sessionManager.updateSession(userId, { data: { pob: text.trim() } });
    this.sessionManager.setStep(userId, STEPS.ANALYZING);

    await this._typing(chatId);
    await this.bot.sendMessage(chatId, "🔮 Aapki kundali tayyar ho rahi hai...\n\n_Graha positions calculate ho rahe hain_");

    // Generate kundali
    await this._generateAndShowKundali(chatId, userId);
  }

  async _generateAndShowKundali(chatId, userId) {
    const session = this.sessionManager.getSession(userId);
    const { name, dob, tob, pob } = session.data;

    try {
      // Simulate analysis time
      await this._delay(1500);

      const kundali = await this.astroAgent.analyzeKundali({ name, dob, tob, pob });
      this.sessionManager.updateSession(userId, { data: { kundali } });

      await this._sendKundaliReport(chatId, kundali);

      // After kundali, move to question engagement
      await this._delay(1000);
      await this._inviteQuestions(chatId, userId, kundali);
    } catch (err) {
      logger.error("Kundali generation failed:", err);
      await this.bot.sendMessage(
        chatId,
        "⚠️ Kundali calculate karne mein thoda issue aaya. Please /start karke dobara try karein."
      );
    }
  }

  async _sendKundaliReport(chatId, kundali) {
    const {
      name, lagnaSign, moonSign, sunSign, nakshatra,
      currentDasha, personality, predictions
    } = kundali;
    const firstName = name.split(" ")[0];

    // Message 1: Basic Chart
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `✨ *${firstName} Ji Ki Kundali Tayyar Hai!*\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🏠 *Lagna (Ascendant):* ${lagnaSign}\n` +
        `🌙 *Moon Sign (Rashi):* ${moonSign}\n` +
        `☀️ *Sun Sign:* ${sunSign}\n` +
        `⭐ *Janm Nakshatra:* ${nakshatra}\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `🪐 *Current Mahadasha:* ${currentDasha.lord}\n` +
        `⏳ ${currentDasha.yearsRemaining} saal aur chalegi yeh dasha`,
      { parse_mode: "Markdown" }
    );

    await this._delay(800);

    // Message 2: Personality
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `🧠 *Aapki Personality (Kundali ke Anusar):*\n\n${personality}`,
      { parse_mode: "Markdown" }
    );

    await this._delay(800);

    // Message 3: Predictions teaser
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `🎯 *2 Strong Predictions (Abhi Ke Liye):*\n\n` +
        `💼 *Career:*\n${predictions.career}\n\n` +
        `❤️ *Relationships:*\n${predictions.love}`,
      { parse_mode: "Markdown" }
    );
  }

  async _inviteQuestions(chatId, userId, kundali) {
    const firstName = kundali.name.split(" ")[0];

    await this._delay(600);
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `🙋 *${firstName} Ji, Ab Aapki Baari!*\n\n` +
        `Aap apni life ke *5 sawal* pooch sakte hain — career, love, health, family, future... kuch bhi!\n\n` +
        `Main pehle 2 sawalon ka jawab abhi deta hoon (free mein).\n` +
        `Baki 3 ke complete answers premium reading mein.\n\n` +
        `_Tayyar hain? Pehla sawaal likhein_ 👇`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✍️ Sawaal Poochhna Shuru Karein", callback_data: "start_questions" }],
          ],
        },
      }
    );
  }

  async _startQuestionCollection(chatId, userId) {
    this.sessionManager.setStep(userId, STEPS.COLLECTING_Q1);
    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `✨ *Pehla Sawaal Likhein:*\n\n_(Koi bhi topic — career, love, health, paise, family...)_`,
      { parse_mode: "Markdown" }
    );
  }

  async _handleCollectQuestion(chatId, userId, text, session) {
    const questionCount = session.data.questions.length;
    const maxQ = config.MAX_QUESTIONS;
    const freeQ = config.FREE_QUESTIONS;

    // Add question
    this.sessionManager.addQuestion(userId, text);
    const updatedSession = this.sessionManager.getSession(userId);
    const newCount = updatedSession.data.questions.length;

    // Answer if free
    if (newCount <= freeQ) {
      await this._typing(chatId);
      const { answer } = this.astroAgent.generatePartialAnswer(
        text,
        updatedSession.data.kundali,
        newCount - 1
      );

      await this.bot.sendMessage(chatId, `🔮 *Jawab:*\n\n${answer}`, {
        parse_mode: "Markdown",
      });

      await this._delay(700);
    }

    // Ask next question or transition to upsell
    if (newCount < maxQ) {
      const questionWords = ["pehla", "doosra", "teesra", "chautha", "paanchwa"];
      const nextLabel = questionWords[newCount] || `${newCount + 1}va`;

      this.sessionManager.setStep(userId, `COLLECTING_Q${newCount + 1}`);

      if (newCount === freeQ) {
        // Transition message before upsell questions
        await this._typing(chatId);
        await this.bot.sendMessage(
          chatId,
          `🌟 *Bahut accha sawaal tha!*\n\nAbhi tak ke jawab aapko kaisa laga? Aage ke ${maxQ - freeQ} sawaal ke *complete, detailed answers* premium reading mein hain.\n\nPehle ${maxQ - newCount} aur sawal poochh lein — phir sab ek saath unlock karein! 👇\n\n*${nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1)} sawaal:*`,
          { parse_mode: "Markdown" }
        );
      } else if (newCount > freeQ) {
        await this._typing(chatId);
        await this.bot.sendMessage(chatId, `✅ Noted! Ab *${nextLabel} sawaal* likhein:`, {
          parse_mode: "Markdown",
        });
      }
    } else {
      // All 5 questions collected → show upsell
      await this._delay(500);
      await this._showUpsellOffer(chatId, userId, updatedSession);
    }
  }

  async _showUpsellOffer(chatId, userId, session) {
    const { name, questions } = session.data;
    const firstName = (name || "").split(" ")[0];

    this.sessionManager.setStep(userId, STEPS.UPSELL);

    const questionList = questions.map((q, i) => `${i + 1}. "${q}"`).join("\n");

    await this._typing(chatId);
    await this.bot.sendMessage(
      chatId,
      `🎯 *${firstName} Ji — Aapke 5 Sawal Ready Hain!*\n\n` +
        `${questionList}\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Inke *complete, detailed answers* mein hoga:\n` +
        `• Exact timing (kab hoga)\n` +
        `• Reasons (kyun ho raha hai)\n` +
        `• Remedies (kya karein)\n` +
        `• Personal guidance\n\n` +
        `💰 *Sirf ₹${config.PAYMENT_AMOUNT}/-* aur yeh sab unlock!\n` +
        `🛡️ 100% Money-back guarantee\n\n` +
        `Hazaron logon ki life badal gayi ek reading se... 🌟`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: `🔓 ₹${config.PAYMENT_AMOUNT} Mein Unlock Karein`, callback_data: "confirm_unlock" }],
            [{ text: "ℹ️ Pehle aur janna hai", callback_data: "payment_later" }],
          ],
        },
      }
    );
  }

  async _handlePaymentDone(chatId, userId, session) {
    this.sessionManager.setStep(userId, STEPS.AWAITING_PAYMENT);
    await this.paymentAgent.askForUTR(chatId);
  }

  async _handlePaymentUTR(chatId, userId, text, session) {
    if (!this.paymentAgent.validateUTR(text)) {
      return this.bot.sendMessage(
        chatId,
        "⚠️ Transaction ID valid nahi laga. Kripya apna *UTR / UPI Transaction ID* dobara enter karein.\n_(Example: 123456789012)_",
        { parse_mode: "Markdown" }
      );
    }

    // Store UTR and confirm
    this.sessionManager.updateSession(userId, {
      data: { paymentStatus: "confirmed", paymentRef: text.trim() },
    });

    const confirmed = await this.paymentAgent.confirmPayment(chatId, session, text);

    if (confirmed) {
      this.sessionManager.setStep(userId, STEPS.PAYMENT_CONFIRMED);

      await this._delay(1200);

      // Send handoff
      await this.paymentAgent.sendHandoffToUser(chatId, session);

      // Notify admin
      const finalSession = this.sessionManager.getSession(userId);
      await this.paymentAgent.notifyAdmin(finalSession);

      // Mark complete
      this.sessionManager.setStep(userId, STEPS.COMPLETED);
    }
  }

  // ── Utils ────────────────────────────────────────────────────────────────────

  async _typing(chatId, duration = TYPING_DELAY) {
    await this.bot.sendChatAction(chatId, "typing");
    await this._delay(duration);
  }

  _delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = ConversationAgent;

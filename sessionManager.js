/**
 * Session Manager
 * In-memory store for user sessions with TTL cleanup.
 * For production: replace with Redis or a DB.
 */

const config = require("./config");

// ── Flow Steps ────────────────────────────────────────────────────────────────
const STEPS = {
  WELCOME: "WELCOME",
  COLLECT_NAME: "COLLECT_NAME",
  COLLECT_DOB: "COLLECT_DOB",
  COLLECT_TOB: "COLLECT_TOB",
  COLLECT_POB: "COLLECT_POB",
  ANALYZING: "ANALYZING",
  SHOW_KUNDALI: "SHOW_KUNDALI",
  ASK_QUESTIONS: "ASK_QUESTIONS",
  COLLECTING_Q1: "COLLECTING_Q1",
  COLLECTING_Q2: "COLLECTING_Q2",
  COLLECTING_Q3: "COLLECTING_Q3",
  COLLECTING_Q4: "COLLECTING_Q4",
  COLLECTING_Q5: "COLLECTING_Q5",
  ANSWERING_FREE: "ANSWERING_FREE",
  UPSELL: "UPSELL",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  COMPLETED: "COMPLETED",
};

class SessionManager {
  constructor() {
    this.sessions = new Map();

    // Cleanup expired sessions every 10 minutes
    setInterval(() => this._cleanup(), 10 * 60 * 1000);
  }

  /**
   * Get or create a session for a user
   */
  getSession(userId) {
    return this.sessions.get(String(userId)) || null;
  }

  /**
   * Create a fresh session
   */
  createSession(userId, telegramUser) {
    const session = {
      userId: String(userId),
      step: STEPS.WELCOME,
      data: {
        telegramUser,
        name: null,
        dob: null, // "DD/MM/YYYY"
        tob: null, // "HH:MM"
        pob: null, // "City, Country"
        kundali: null, // generated kundali data
        questions: [], // user's 5 questions
        freeAnswersGiven: 0,
        paymentStatus: "pending", // pending | confirmed
        paymentRef: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(String(userId), session);
    console.log(`Session created for user ${userId}`);
    return session;
  }

  /**
   * Update session fields
   */
  updateSession(userId, updates) {
    const session = this.getSession(userId);
    if (!session) return null;

    // Deep merge data fields
    if (updates.data) {
      session.data = { ...session.data, ...updates.data };
      delete updates.data;
    }

    Object.assign(session, updates);
    session.updatedAt = Date.now();
    this.sessions.set(String(userId), session);
    return session;
  }

  /**
   * Move session to next step
   */
  setStep(userId, step) {
    return this.updateSession(userId, { step });
  }

  /**
   * Reset / delete session
   */
  resetSession(userId) {
    this.sessions.delete(String(userId));
    console.log(`Session reset for user ${userId}`);
  }

  /**
   * Get current question count
   */
  getQuestionCount(userId) {
    const session = this.getSession(userId);
    return session ? session.data.questions.length : 0;
  }

  /**
   * Add a question to session
   */
  addQuestion(userId, question) {
    const session = this.getSession(userId);
    if (!session) return;
    session.data.questions.push(question.trim());
    session.updatedAt = Date.now();
  }

  /**
   * Cleanup expired sessions
   */
  _cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [userId, session] of this.sessions) {
      if (now - session.updatedAt > config.SESSION_TTL_MS) {
        this.sessions.delete(userId);
        removed++;
      }
    }
    if (removed > 0) console.log(`Cleaned up ${removed} expired sessions`);
  }

  /**
   * Stats for monitoring
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      steps: [...this.sessions.values()].reduce((acc, s) => {
        acc[s.step] = (acc[s.step] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

module.exports = SessionManager;
module.exports.STEPS = STEPS;

# 🔮 AstroBot — Vedic Astrology Telegram Bot

Lead generation + paid consultation bot with full Hinglish flow.

## Architecture

```
src/
├── bot.js                    ← Entry point, Telegram event handlers
├── agents/
│   ├── conversationAgent.js  ← Orchestrates full user journey
│   ├── astroAgent.js         ← Kundali + predictions engine
│   └── paymentAgent.js       ← UPI payment flow + admin handoff
├── services/
│   └── sessionManager.js     ← In-memory session state with TTL
└── utils/
    ├── validators.js          ← DOB/TOB/name/place validators
    └── logger.js              ← Console logger
config/
└── config.js                 ← All env vars + constants
tests/
└── test.js                   ← Full test suite (no external deps)
```

## User Flow

```
/start
  → Collect Name
  → Collect Date of Birth (DD/MM/YYYY)
  → Collect Time of Birth (HH:MM)
  → Collect Place of Birth
  → Generate Kundali (Lagna, Moon Sign, Dasha, Predictions)
  → Invite 5 Questions
  → Answer Q1-Q2 free (teaser style)
  → Collect Q3-Q5
  → Show Upsell (₹499, money-back guarantee)
  → Payment via UPI → UTR confirmation
  → WhatsApp handoff to astrologer
  → Admin notified with full details
```

## Setup

### 1. Create Telegram Bot

1. Open Telegram → message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` → follow prompts
3. Copy the token

### 2. Get Your Admin Chat ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your chat ID

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required fields in `.env`:
```
TELEGRAM_TOKEN=your_bot_token
ADMIN_CHAT_ID=your_chat_id
ADMIN_WHATSAPP=919876543210
PAYMENT_UPI_ID=yourupi@upi
ASTROLOGER_NAME=Pandit Ji
```

### 4. Install & Run

```bash
npm install
npm start

# Development (auto-restart):
npm run dev
```

### 5. Run Tests

```bash
npm test
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_TOKEN` | Bot token from BotFather | Required |
| `ADMIN_CHAT_ID` | Your Telegram ID for notifications | Required |
| `ADMIN_WHATSAPP` | WhatsApp number for handoff | Required |
| `PAYMENT_UPI_ID` | UPI ID for payments | Required |
| `PAYMENT_AMOUNT` | Consultation fee (INR) | `499` |
| `ASTROLOGER_NAME` | Shown to users in handoff | `Pandit Ji` |
| `PAYMENT_QR_URL` | URL to QR code image | Optional |
| `USE_LIVE_ASTRO` | Use external astro API | `false` |

## Connecting a Real Astrology API

Set `USE_LIVE_ASTRO=true` and configure `ASTRO_API_URL` + `ASTRO_API_KEY`.
Then update `astroAgent.js` → `analyzeKundali()` to call your API and map the response.

## Upgrading to Production

- **Session persistence**: Replace in-memory `SessionManager` with Redis (`ioredis`)
- **Payment verification**: Integrate Razorpay/Cashfree webhooks in `paymentAgent.js`
- **Database**: Store all sessions/orders in PostgreSQL or MongoDB
- **Deployment**: PM2 or Docker on any VPS (DigitalOcean, AWS, etc.)
- **Logging**: Replace logger with Winston + log file rotation

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin consultation |
| `/reset` | Clear session, start over |
| `/status` | Check current step (debug) |

## Disclaimer

This bot provides general astrological guidance for entertainment and reflection purposes only. It does not provide medical, legal, or financial advice.

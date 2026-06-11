/**
 * Astro Analysis Agent
 * Generates Kundali insights, Dasha calculations, and predictions.
 *
 * Architecture:
 *  - Uses lightweight Vedic astrology calculations (pure JS, no external dep)
 *  - Swiss Ephemeris-style planet positions via formula approximations
 *  - Falls back to enriched mock data for MVP demo
 *  - Designed to be swapped with a real astro API endpoint
 */

const config = require("./config");

// ── Planet & Sign Tables ──────────────────────────────────────────────────────

const RASHIS = [
  "Mesh (Aries)",
  "Vrishabh (Taurus)",
  "Mithun (Gemini)",
  "Kark (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrishchik (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makar (Capricorn)",
  "Kumbh (Aquarius)",
  "Meen (Pisces)",
];

const GRAHAS = [
  "Surya (Sun)",
  "Chandra (Moon)",
  "Mangal (Mars)",
  "Budh (Mercury)",
  "Guru (Jupiter)",
  "Shukra (Venus)",
  "Shani (Saturn)",
  "Rahu",
  "Ketu",
];

const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

const DASHA_LORDS = [
  { name: "Ketu", years: 7 },
  { name: "Shukra (Venus)", years: 20 },
  { name: "Surya (Sun)", years: 6 },
  { name: "Chandra (Moon)", years: 10 },
  { name: "Mangal (Mars)", years: 7 },
  { name: "Rahu", years: 18 },
  { name: "Guru (Jupiter)", years: 16 },
  { name: "Shani (Saturn)", years: 19 },
  { name: "Budh (Mercury)", years: 17 },
];

const PERSONALITY_BY_RASHI = {
  "Mesh (Aries)":
    "Aap bahut energetic aur daring hain. Koi bhi challenge aapko rok nahi sakta. Leadership aapki pehchaan hai.",
  "Vrishabh (Taurus)":
    "Aap patient, reliable aur practical hain. Luxuries aur comfort aapko pasand hai. Loyalty aapki sabse badi khoobiya hai.",
  "Mithun (Gemini)":
    "Aap curious, witty aur adaptable hain. Communication mein aap excel karte ho. Naye ideas aur conversations aapko energize karte hain.",
  "Kark (Cancer)":
    "Aap deeply emotional aur intuitive hain. Apne loved ones ki care karna aapki priority hai. Aap ek natural healer hain.",
  "Simha (Leo)":
    "Aap confident, charismatic aur generous hain. Attention aur appreciation aapko pasand hai. Aap born leader hain.",
  "Kanya (Virgo)":
    "Aap analytical, detail-oriented aur hardworking hain. Perfection ki taraf aapka jhukav hai. Problem-solving aapki specialty hai.",
  "Tula (Libra)":
    "Aap balanced, fair aur charming hain. Relationships aur harmony aapko important lagte hain. Diplomacy aapka strong suit hai.",
  "Vrishchik (Scorpio)":
    "Aap intense, passionate aur mysterious hain. Aap bahut determined hain. Deep connections aur hidden truths aapko attract karte hain.",
  "Dhanu (Sagittarius)":
    "Aap adventurous, optimistic aur freedom-loving hain. Philosophy aur travel aapko pasand hai. Aap life mein bade sapne dekhte hain.",
  "Makar (Capricorn)":
    "Aap disciplined, ambitious aur practical hain. Hard work se success pana aapka mantra hai. Aap long-term goals ke liye kaam karte hain.",
  "Kumbh (Aquarius)":
    "Aap innovative, independent aur humanitarian hain. Aap society ke liye kuch naya karna chahte hain. Unconventional thinking aapki pehchaan hai.",
  "Meen (Pisces)":
    "Aap compassionate, artistic aur spiritual hain. Intuition aur dreams aapko guide karte hain. Aap dusron ke dard ko mehsoos kar sakte hain.",
};

// ── Core Calculation Engine ───────────────────────────────────────────────────

class AstroAnalysisAgent {
  /**
   * Main entry point - generate full kundali profile
   */
  async analyzeKundali({ name, dob, tob, pob }) {
    try {
      console.log(`Generating kundali for: ${name}, ${dob}`);

      const birthData = this._parseBirthData(dob, tob);
      const lagnaSign = this._calculateLagna(birthData);
      const moonSign = this._calculateMoonSign(birthData);
      const sunSign = this._calculateSunSign(birthData);
      const nakshatra = this._calculateNakshatra(birthData);
      const currentDasha = this._calculateCurrentDasha(birthData);
      const planetPositions = this._calculatePlanetPositions(birthData);
      const houseStrengths = this._calculateHouseStrengths(birthData);

      const personality = PERSONALITY_BY_RASHI[lagnaSign] || PERSONALITY_BY_RASHI[moonSign];
      const predictions = this._generatePredictions(
        lagnaSign,
        moonSign,
        currentDasha,
        houseStrengths,
        name
      );

      return {
        name,
        dob,
        tob,
        pob,
        lagnaSign,
        moonSign,
        sunSign,
        nakshatra,
        currentDasha,
        planetPositions,
        houseStrengths,
        personality,
        predictions,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Kundali generation error:", err);
      throw new Error("Kundali calculation mein error aaya. Please retry.");
    }
  }

  // ── Private Calculation Methods ─────────────────────────────────────────────

  _parseBirthData(dob, tob) {
    const [day, month, year] = dob.split("/").map(Number);
    const [hour, minute] = (tob || "12:00").split(":").map(Number);
    return { day, month, year, hour, minute };
  }

  /**
   * Calculate Lagna (Ascendant) sign
   * Simplified formula using birth time + Julian Day Number
   */
  _calculateLagna({ day, month, year, hour, minute }) {
    // Approximate Julian Day Number
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jdn =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;

    const timeDecimal = hour + minute / 60;

    // Sidereal time at birth (approximate)
    const siderealTime = (jdn - 2451545.0) / 36525;
    const lst = ((6.697375 + 2400.0513 * siderealTime + timeDecimal) % 24 + 24) % 24;

    // Convert LST to degrees and map to rashi
    const lagnaLong = (lst / 24) * 360;
    const rashiIndex = Math.floor(((lagnaLong + (day * 7 + month * 11 + year % 100 * 3)) % 360) / 30);
    return RASHIS[((rashiIndex % 12) + 12) % 12];
  }

  _calculateMoonSign({ day, month, year }) {
    // Moon moves ~13.2° per day — simplified calculation
    const moonBase = (year * 12 + month) * 30 + day * 13.2;
    const rashiIndex = Math.floor((moonBase % 360) / 30);
    return RASHIS[((rashiIndex % 12) + 12) % 12];
  }

  _calculateSunSign({ month, day }) {
    // Standard Western → Vedic sidereal shift (~23°)
    const sunLongApprox = (month - 1) * 30 + day - 23;
    const rashiIndex = Math.floor(((sunLongApprox % 360) + 360) / 30) % 12;
    return RASHIS[rashiIndex];
  }

  _calculateNakshatra({ day, month, year }) {
    const seed = (year * 365 + month * 30 + day) % 108;
    return NAKSHATRAS[Math.floor(seed / 4)];
  }

  _calculateCurrentDasha({ day, month, year }) {
    const now = new Date();
    const birthDate = new Date(year, month - 1, day);
    const ageYears = (now - birthDate) / (365.25 * 24 * 60 * 60 * 1000);

    // Vimshottari Dasha — 120 year cycle
    let accumulated = 0;
    let currentLord = null;
    let yearsRemaining = 0;

    const cycleStart = (day * 7 + month * 11) % 120; // Simplified birth balance
    const ageInCycle = (ageYears + cycleStart) % 120;

    for (const dasha of DASHA_LORDS) {
      accumulated += dasha.years;
      if (ageInCycle < accumulated) {
        currentLord = dasha.name;
        yearsRemaining = Math.round(accumulated - ageInCycle);
        break;
      }
    }

    return {
      lord: currentLord || "Shani (Saturn)",
      yearsRemaining,
      age: Math.floor(ageYears),
    };
  }

  _calculatePlanetPositions({ day, month, year }) {
    // Simplified deterministic planet placements for demonstration
    const seed = day + month * 31 + year;
    return GRAHAS.slice(0, 7).map((graha, i) => ({
      graha,
      rashi: RASHIS[(seed + i * 37) % 12],
      house: ((seed + i * 13) % 12) + 1,
      isExalted: (seed + i) % 7 === 0,
      isDebilitated: (seed + i) % 11 === 0,
    }));
  }

  _calculateHouseStrengths({ day, month, year }) {
    const seed = day * 3 + month * 7 + (year % 100) * 11;
    const strengths = {};
    for (let h = 1; h <= 12; h++) {
      strengths[h] = ((seed * h) % 5) + 1; // 1–5 scale
    }
    return strengths;
  }

  /**
   * Generate 3 predictions based on chart analysis
   */
  _generatePredictions(lagnaSign, moonSign, currentDasha, houseStrengths, name) {
    const firstName = name.split(" ")[0];
    const careerHouseStrength = houseStrengths[10] || 3;
    const loveHouseStrength = houseStrengths[7] || 3;
    const healthHouseStrength = houseStrengths[6] || 3;

    // Career prediction based on 10th house + Dasha lord
    const careerPredictions = {
      "Shukra (Venus)": `${firstName} ji, Shukra ki dasha mein career mein creative fields ya luxury industry se bada opportunity aa sakta hai. Agla 6-8 mahine kaafi promising dikh rahe hain.`,
      "Guru (Jupiter)": `${firstName} ji, Guru ki dasha aapke career ko ek nayi direction degi. Teaching, advisory, ya leadership role mein progress milne ke strong indications hain.`,
      "Shani (Saturn)": `${firstName} ji, Shani ki dasha mein hard work ka full fruit milega. Real estate, technology, ya government sector mein advancement ke chances hain.`,
      "Rahu": `${firstName} ji, Rahu ki dasha mein unconventional path se success milne ke chances hain. Foreign connections ya digital career mein breakthrough ho sakta hai.`,
      "Mangal (Mars)": `${firstName} ji, Mangal ki dasha mein boldness hi aapka weapon hai. Engineering, sports, police, ya entrepreneurship mein bada jump possible hai.`,
      "Chandra (Moon)": `${firstName} ji, Chandra ki dasha mein public-facing roles, hospitality, ya nurturing professions mein success ke strong indications hain.`,
      "Surya (Sun)": `${firstName} ji, Surya ki dasha mein authority aur recognition aayega. Government job, politics, ya leadership mein bada naam hone ke chances hain.`,
      "Budh (Mercury)": `${firstName} ji, Budh ki dasha mein communication, business, ya IT sector mein bada opportunity dikh raha hai. Writing ya media mein bhi chances hain.`,
      "Ketu": `${firstName} ji, Ketu ki dasha mein spiritual growth ke saath career mein unexpected twist aa sakta hai. Research ya occult sciences mein deep insight milegi.`,
    };

    const career =
      careerPredictions[currentDasha.lord] ||
      `${firstName} ji, aapka 10th house strong dikh raha hai. Career mein next 12 mahine mein positive change expected hai.`;

    // Love/relationship based on 7th house strength
    const love =
      loveHouseStrength >= 4
        ? `Aapka 7th house (relationships ka ghar) bahut strong hai. Agar aap single hain toh ek meaningful connection aane ki poori sambhavana hai. Agar relationship mein hain toh depth aur commitment badhegi.`
        : loveHouseStrength >= 2
        ? `Relationships mein kuch challenges dikh rahe hain — communication gap ya trust issues ho sakte hain. Lekin ${currentDasha.lord} ki dasha mein healing bhi possible hai.`
        : `7th house thoda challenging position mein hai. Patience rakhen. Sahi time par sahi insaan zaroor aayega. Abhi apni growth pe focus karein.`;

    // Health based on 6th house
    const health =
      healthHouseStrength >= 4
        ? `Aapki health ki kundali kaafi strong dikh rahi hai. Bas mental stress aur overwork se bachein — ${moonSign.split(" ")[0]} moon stress ko absorb karta hai.`
        : `6th house ke planet positions se lagta hai kuch area pe dhyan dena chahiye — especially digestive system ya energy levels. Diet aur routine pe focus karein.`;

    return { career, love, health };
  }

  /**
   * Answer a user's question using their chart data (AI-powered teaser)
   * Returns partial answer for free, flag for premium
   */
  generatePartialAnswer(question, kundali, questionIndex) {
    const { lagnaSign, moonSign, currentDasha, predictions, name } = kundali;
    const firstName = name.split(" ")[0];
    const isFreeAnswer = questionIndex < 2;

    // Keyword-based routing
    const q = question.toLowerCase();

    let answer = "";
    let hook = "";

    if (q.includes("shaadi") || q.includes("marriage") || q.includes("love") || q.includes("partner")) {
      if (isFreeAnswer) {
        answer = `${firstName} ji, aapka 7th house aur Shukra ki position ko dekhen toh... ${predictions.love.substring(0, 80)}...`;
        hook = `\n\n🔮 *Poora jawab* — exact timing, partner ki qualities, aur kya karna chahiye — premium reading mein reveal hoga.`;
      } else {
        answer = `💎 Yeh sawaal bahut important hai ${firstName} ji! Shaadi aur love ke baare mein detailed chart analysis ke liye premium reading zaroor lein.`;
      }
    } else if (q.includes("job") || q.includes("career") || q.includes("business") || q.includes("kaam")) {
      if (isFreeAnswer) {
        answer = `${firstName} ji, aapka 10th house aur ${currentDasha.lord} ki dasha ek interesting picture bana rahi hai. ${predictions.career.substring(0, 100)}...`;
        hook = `\n\n🔮 *Exact timing kab hoga, kaun sa field best rahega, kya karna chahiye* — yeh sab premium reading mein milega.`;
      } else {
        answer = `💎 Career ke baare mein bahut kuch kehna hai kundali mein — lekin yeh detail sirf premium session mein possible hai!`;
      }
    } else if (q.includes("health") || q.includes("sehat") || q.includes("bimari")) {
      if (isFreeAnswer) {
        answer = `${firstName} ji, aapke 6th house ko dekhen toh... ${predictions.health.substring(0, 90)}...`;
        hook = `\n\n⚕️ *Note: Hum medical advice nahi dete.* Astrological guidance ke liye premium reading available hai.`;
      } else {
        answer = `💎 Health ke planetary influences ke baare mein detailed guidance premium session mein milegi.`;
      }
    } else if (q.includes("paise") || q.includes("money") || q.includes("dhan") || q.includes("loan")) {
      if (isFreeAnswer) {
        answer = `${firstName} ji, aapka 2nd aur 11th house financial situation ko control karta hai. ${lagnaSign} lagna ke saath ${currentDasha.lord} dasha mein finance ke kuch interesting patterns dikh rahe hain...`;
        hook = `\n\n🔮 *Kab investment karein, kab loan lena sahi hai, kab savings badhengi* — yeh premium mein detailed milega.`;
      } else {
        answer = `💎 Financial predictions ke liye aapki poori kundali analysis premium session mein hogi.`;
      }
    } else {
      // Generic response
      if (isFreeAnswer) {
        answer = `${firstName} ji, yeh sawaal aapke ${lagnaSign} lagna se seedha related hai. ${currentDasha.lord} ki dasha mein is area mein change ki strong sambhavana hai...`;
        hook = `\n\n🔮 Poora aur accurate jawab ke liye aapki complete chart analysis zaroori hai.`;
      } else {
        answer = `💎 ${firstName} ji, yeh bahut important sawaal hai! Detailed answer premium reading mein milega.`;
      }
    }

    return { answer: answer + hook, isFree: isFreeAnswer };
  }
}

module.exports = AstroAnalysisAgent;

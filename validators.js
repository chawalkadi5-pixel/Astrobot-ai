/**
 * Input Validators
 * Validate and normalize user inputs
 */

/**
 * Validate name — only letters/spaces, min 2 chars
 */
function validateName(name) {
  if (!name || typeof name !== "string") return false;
  const cleaned = name.trim();
  return cleaned.length >= 2 && /^[a-zA-Z\s\u0900-\u097F.'-]+$/.test(cleaned);
}

/**
 * Validate Date of Birth
 * Accepts: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * Returns: { valid, formatted: "DD/MM/YYYY", error }
 */
function validateDOB(input) {
  if (!input) return { valid: false, error: "Date of birth required" };

  const cleaned = input.trim().replace(/[-.\s]/g, "/");
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return {
      valid: false,
      error: "Format sahi nahi hai. DD/MM/YYYY mein likhein.\nExample: *15/08/1990*",
    };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return { valid: false, error: "Month 1 se 12 ke beech hona chahiye." };
  }

  if (day < 1 || day > 31) {
    return { valid: false, error: "Day 1 se 31 ke beech hona chahiye." };
  }

  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) {
    return {
      valid: false,
      error: `Year 1900 se ${currentYear} ke beech hona chahiye.`,
    };
  }

  // Validate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { valid: false, error: `Is month mein sirf ${daysInMonth} din hote hain.` };
  }

  const formatted = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  return { valid: true, formatted };
}

/**
 * Validate Time of Birth
 * Accepts: HH:MM, H:MM, HHMM, "14:30", "2:30 PM"
 * Returns: { valid, formatted: "HH:MM", error }
 */
function validateTOB(input) {
  if (!input) return { valid: false, error: "Time required" };

  let cleaned = input.trim().toUpperCase();

  // Handle 12-hour format: "2:30 PM" → convert
  const ampmMatch = cleaned.match(/^(\d{1,2}):?(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3];

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return {
        valid: true,
        formatted: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    }
  }

  // Handle 24-hour: HH:MM or HHMM
  const match24 = cleaned.replace(":", "").match(/^(\d{1,2})(\d{2})$/) ||
    cleaned.match(/^(\d{1,2}):(\d{2})$/);

  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);

    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return {
        valid: true,
        formatted: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    }
  }

  return {
    valid: false,
    error: "Time format sahi nahi. HH:MM mein likhein.\nExample: *14:30* (2:30 PM ke liye) ya *06:15*",
  };
}

/**
 * Validate place of birth — basic check, at least 2 chars
 */
function validatePlace(place) {
  if (!place || typeof place !== "string") return false;
  const cleaned = place.trim();
  return cleaned.length >= 2 && cleaned.length <= 100;
}

module.exports = { validateName, validateDOB, validateTOB, validatePlace };

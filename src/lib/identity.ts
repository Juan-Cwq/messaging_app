/**
 * Haven Identity Generator
 *
 * Generates anonymous usernames and recovery keys for secure,
 * privacy-preserving authentication.
 */

// Word lists for generating memorable usernames
const adjectives = [
  "silent", "hidden", "shadow", "swift", "brave", "calm", "dark", "bright",
  "frost", "storm", "iron", "steel", "night", "dawn", "ghost", "noble",
  "wild", "free", "lone", "stark", "bold", "keen", "true", "wise",
  "deep", "high", "cold", "warm", "quick", "slow", "old", "young",
  "grey", "blue", "red", "black", "white", "gold", "silver", "copper"
];

const nouns = [
  "wolf", "hawk", "raven", "fox", "bear", "lion", "tiger", "eagle",
  "serpent", "dragon", "phoenix", "falcon", "panther", "viper", "cobra", "owl",
  "shark", "whale", "storm", "thunder", "lightning", "flame", "frost", "shadow",
  "knight", "ranger", "scout", "guard", "sentinel", "warden", "seeker", "hunter",
  "cipher", "ghost", "phantom", "spectre", "wraith", "shade", "spirit", "oracle"
];

/**
 * Generates a cryptographically random integer between 0 and max (exclusive)
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] % max;
}

/**
 * Generates a random anonymous username
 * Format: [adjective][noun][number]
 * Example: "SilentWolf427"
 */
export function generateUsername(): string {
  const adjective = adjectives[getSecureRandomInt(adjectives.length)];
  const noun = nouns[getSecureRandomInt(nouns.length)];
  const number = getSecureRandomInt(1000);

  // Capitalize first letter of each word
  const capitalizedAdjective = adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const capitalizedNoun = noun.charAt(0).toUpperCase() + noun.slice(1);

  return `${capitalizedAdjective}${capitalizedNoun}${number}`;
}

/**
 * Generates multiple username suggestions
 */
export function generateUsernameSuggestions(count: number = 5): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  while (suggestions.length < count) {
    const username = generateUsername();
    if (!seen.has(username)) {
      seen.add(username);
      suggestions.push(username);
    }
  }

  return suggestions;
}

/**
 * Validates a username
 * - Must be 3-30 characters
 * - Only alphanumeric and underscores
 * - Cannot start with a number
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 30) {
    return { valid: false, error: "Username must be 30 characters or less" };
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
    return { valid: false, error: "Username must start with a letter and contain only letters, numbers, and underscores" };
  }

  return { valid: true };
}

/**
 * Generates a recovery key for account recovery
 * Format: XXXX-XXXX-XXXX-XXXX-XXXX (25 characters + 4 dashes)
 * Uses cryptographically secure random generation
 */
export function generateRecoveryKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar-looking chars (0, O, 1, I)
  const segments = 5;
  const charsPerSegment = 4;
  const parts: string[] = [];

  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < charsPerSegment; j++) {
      segment += chars[getSecureRandomInt(chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

/**
 * Converts a username to a pseudo-email for Supabase auth
 * This allows us to use username-based auth while working with Supabase's email requirement
 */
export function usernameToPseudoEmail(username: string): string {
  return `${username.toLowerCase()}@haven.anonymous`;
}

/**
 * Extracts the username from a pseudo-email
 */
export function pseudoEmailToUsername(email: string): string {
  if (email.endsWith("@haven.anonymous")) {
    return email.replace("@haven.anonymous", "");
  }
  return email;
}

/**
 * Checks if an email is a Haven pseudo-email
 */
export function isHavenPseudoEmail(email: string): boolean {
  return email.endsWith("@haven.anonymous");
}

/**
 * Haven Password Utilities
 *
 * Password strength validation and requirements for secure authentication.
 */

export interface PasswordStrength {
  score: number; // 0-4
  label: "weak" | "fair" | "good" | "strong" | "excellent";
  color: string;
  feedback: string[];
}

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

/**
 * Checks password against all requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: "At least 12 characters",
      met: password.length >= 12,
    },
    {
      id: "lowercase",
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      met: /\d/.test(password),
    },
    {
      id: "special",
      label: "One special character",
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];
}

/**
 * Calculates password strength
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = checkPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;
  const feedback: string[] = [];

  // Add feedback for unmet requirements
  requirements.forEach((req) => {
    if (!req.met) {
      feedback.push(`Add ${req.label.toLowerCase()}`);
    }
  });

  // Additional checks
  if (password.length < 8) {
    feedback.unshift("Password is too short");
  }

  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
    /(.)\1{2,}/, // Repeated characters
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    feedback.push("Avoid common patterns");
  }

  // Calculate score
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (metCount >= 3) score += 1;
  if (metCount >= 5) score += 1;
  if (password.length >= 16 && metCount === 5) score += 1;

  // Cap at 4
  score = Math.min(score, 4);

  const strengthMap: Record<number, { label: PasswordStrength["label"]; color: string }> = {
    0: { label: "weak", color: "bg-error" },
    1: { label: "fair", color: "bg-warning" },
    2: { label: "good", color: "bg-info" },
    3: { label: "strong", color: "bg-success" },
    4: { label: "excellent", color: "bg-success" },
  };

  const { label, color } = strengthMap[score];

  return {
    score,
    label,
    color,
    feedback: feedback.slice(0, 3), // Limit to 3 feedback items
  };
}

/**
 * Validates if password meets minimum requirements
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  const requirements = checkPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;

  if (metCount < 3) {
    return { valid: false, error: "Password must meet at least 3 requirements" };
  }

  return { valid: true };
}

/**
 * Generates a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const all = lowercase + uppercase + numbers + special;

  const randomBuffer = new Uint32Array(length);
  crypto.getRandomValues(randomBuffer);

  // Ensure at least one of each type
  let password = "";
  password += lowercase[randomBuffer[0] % lowercase.length];
  password += uppercase[randomBuffer[1] % uppercase.length];
  password += numbers[randomBuffer[2] % numbers.length];
  password += special[randomBuffer[3] % special.length];

  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += all[randomBuffer[i] % all.length];
  }

  // Shuffle the password
  const shuffled = password
    .split("")
    .sort(() => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] % 2 === 0 ? 1 : -1;
    })
    .join("");

  return shuffled;
}

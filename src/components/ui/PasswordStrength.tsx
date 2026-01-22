import { motion } from "framer-motion";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { calculatePasswordStrength, checkPasswordRequirements } from "../../lib/password";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrength = ({ password, showRequirements = true }: PasswordStrengthProps) => {
  const strength = calculatePasswordStrength(password);
  const requirements = checkPasswordRequirements(password);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-3"
    >
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-base-content/60">Password strength</span>
          <span
            className={`font-medium capitalize ${
              strength.label === "weak"
                ? "text-error"
                : strength.label === "fair"
                ? "text-warning"
                : strength.label === "good"
                ? "text-info"
                : "text-success"
            }`}
          >
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${strength.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${(strength.score / 4) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1">
          {requirements.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-xs"
            >
              {req.met ? (
                <CheckCircleIcon className="h-4 w-4 text-success flex-shrink-0" />
              ) : (
                <XCircleIcon className="h-4 w-4 text-base-content/30 flex-shrink-0" />
              )}
              <span className={req.met ? "text-success" : "text-base-content/50"}>
                {req.label}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {strength.feedback.length > 0 && (
        <div className="text-xs text-warning">
          {strength.feedback[0]}
        </div>
      )}
    </motion.div>
  );
};

export default PasswordStrength;

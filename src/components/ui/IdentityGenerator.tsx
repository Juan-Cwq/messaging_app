import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowPathIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { generateUsernameSuggestions, validateUsername } from "../../lib/identity";

interface IdentityGeneratorProps {
  value: string;
  onChange: (username: string) => void;
  error?: string;
}

export const IdentityGenerator = ({ value, onChange, error }: IdentityGeneratorProps) => {
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    generateUsernameSuggestions(4)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();

  const regenerateSuggestions = useCallback(() => {
    setIsGenerating(true);
    // Small delay for visual feedback
    setTimeout(() => {
      setSuggestions(generateUsernameSuggestions(4));
      setIsGenerating(false);
    }, 300);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (newValue) {
      const validation = validateUsername(newValue);
      setValidationError(validation.error);
    } else {
      setValidationError(undefined);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setValidationError(undefined);
  };

  const copyToClipboard = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="label-text font-medium flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-primary" />
          Anonymous Identity
        </label>
        <button
          type="button"
          onClick={regenerateSuggestions}
          className="btn btn-ghost btn-xs gap-1"
          disabled={isGenerating}
        >
          <ArrowPathIcon
            className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`}
          />
          New suggestions
        </button>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Choose a username"
          className={`input input-bordered w-full pr-10 ${
            displayError ? "input-error" : ""
          }`}
          autoComplete="off"
          spellCheck="false"
        />
        {value && (
          <button
            type="button"
            onClick={copyToClipboard}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
            aria-label="Copy username"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-success" />
            ) : (
              <ClipboardDocumentIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {displayError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-error text-xs"
          >
            {displayError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-base-content/60">
          Or pick an anonymous identity:
        </p>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={`btn btn-sm ${
                  value === suggestion
                    ? "btn-primary"
                    : "btn-outline btn-ghost"
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {suggestion}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-base-content/40">
        Your identity is anonymous. No email or phone number required.
      </p>
    </div>
  );
};

export default IdentityGenerator;

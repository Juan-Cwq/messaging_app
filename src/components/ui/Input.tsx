import { forwardRef, InputHTMLAttributes, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "input-sm",
  md: "input-md",
  lg: "input-lg",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = "md",
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      type,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={clsx("form-control", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="label">
            <span className="label-text font-medium">{label}</span>
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
              {leftIcon}
            </div>
          )}

          <motion.input
            ref={ref}
            id={inputId}
            type={inputType}
            className={clsx(
              "input input-bordered w-full transition-all duration-200",
              sizeClasses[size],
              error && "input-error",
              leftIcon && "pl-10",
              (rightIcon || isPassword) && "pr-10",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              className
            )}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}

          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
              {rightIcon}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.label
              className="label"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <span className="label-text-alt text-error">{error}</span>
            </motion.label>
          )}
          {hint && !error && (
            <motion.label
              className="label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <span className="label-text-alt text-base-content/60">{hint}</span>
            </motion.label>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

import { forwardRef, ButtonHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "error";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  error: "btn-error",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        className={clsx(
          "btn",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          isLoading && "loading",
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02, y: -1 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.15, ease: "easeOut" }}
        {...(props as HTMLMotionProps<"button">)}
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;

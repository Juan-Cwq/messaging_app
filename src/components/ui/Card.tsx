import { forwardRef, HTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";

type CardVariant = "default" | "bordered" | "ghost";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variant?: CardVariant;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-base-100 shadow-lg",
  bordered: "bg-base-100 border border-base-300",
  ghost: "bg-transparent",
};

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      hoverable = false,
      padding = "md",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={clsx(
          "rounded-xl",
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && "cursor-pointer",
          className
        )}
        whileHover={
          hoverable
            ? {
                y: -4,
                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
              }
            : undefined
        }
        transition={{ duration: 0.2, ease: "easeOut" }}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx("mb-4", className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Component = "h3", className, ...props }, ref) => (
    <Component
      ref={ref}
      className={clsx("text-xl font-semibold", className)}
      {...props}
    >
      {children}
    </Component>
  )
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx("text-sm text-base-content/60 mt-1", className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = "CardDescription";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx("", className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("mt-6 flex items-center gap-3", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";

export default Card;

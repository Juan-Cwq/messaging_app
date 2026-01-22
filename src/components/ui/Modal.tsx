import { forwardRef, HTMLAttributes, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
    },
  },
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      children,
      isOpen,
      onClose,
      size = "md",
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      className,
      ...props
    },
    ref
  ) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }, [isOpen, handleEscape]);

    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={closeOnOverlayClick ? onClose : undefined}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              ref={ref}
              className={clsx(
                "relative w-full bg-base-100 rounded-xl shadow-2xl",
                sizeClasses[size],
                className
              )}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              {...props}
            >
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

Modal.displayName = "Modal";

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("p-6 pb-0", className)}
      {...props}
    >
      {children}
    </div>
  )
);

ModalHeader.displayName = "ModalHeader";

interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h2
      ref={ref}
      className={clsx("text-xl font-semibold pr-8", className)}
      {...props}
    >
      {children}
    </h2>
  )
);

ModalTitle.displayName = "ModalTitle";

interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx("text-sm text-base-content/60 mt-2", className)}
      {...props}
    >
      {children}
    </p>
  )
);

ModalDescription.displayName = "ModalDescription";

interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx("p-6", className)} {...props}>
      {children}
    </div>
  )
);

ModalBody.displayName = "ModalBody";

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "p-6 pt-0 flex items-center justify-end gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

ModalFooter.displayName = "ModalFooter";

export default Modal;

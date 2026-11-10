"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "./cn";

type SizeVariant = "sm" | "default" | "lg";

interface CopyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
  size?: SizeVariant;
  onCopyResult?: (copied: boolean) => void;
}

const sizeMap: Record<SizeVariant, { button: string; icon: number }> = {
  sm: { button: "h-8 w-8", icon: 14 },
  default: { button: "h-9 w-9", icon: 16 },
  lg: { button: "h-12 w-12", icon: 20 },
};

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      size = "default",
      className,
      onClick,
      onCopyResult,
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = React.useState<boolean>(false);
    const timer = React.useRef<number | undefined>(undefined);
    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || !value) return;
      try {
        await navigator.clipboard.writeText(value);
        window.clearTimeout(timer.current);
        setCopied(true);
        onCopyResult?.(true);
        timer.current = window.setTimeout(() => setCopied(false), 1500);
      } catch {
        onCopyResult?.(false);
      }
    };

    const { button: buttonSize, icon: iconSize } = sizeMap[size];

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copiado" : "Copiar convite"}
        aria-disabled={copied}
        className={cn(
          "relative cursor-pointer motion-safe:active:scale-[0.97] transition-all ease-out duration-200 motion-reduce:transition-none inline-flex items-center justify-center rounded-md text-neutral-900 dark:text-neutral-50",
          buttonSize,
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "transition-all duration-200 motion-reduce:transition-none",
            copied
              ? "scale-100 opacity-100 blur-none"
              : "scale-70 opacity-0 blur-[2px]",
          )}
        >
          <CheckIcon
            size={iconSize}
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
        <div
          className={cn(
            "absolute transition-all duration-200 motion-reduce:transition-none",
            copied
              ? "scale-0 opacity-0 blur-[2px]"
              : "scale-100 opacity-100 blur-none",
          )}
        >
          <CopyIcon size={iconSize} strokeWidth={2} aria-hidden="true" />
        </div>
      </button>
    );
  },
);

CopyButton.displayName = "CopyButton";

export { CopyButton };
export type { CopyButtonProps };

import { useEffect, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

interface SheetContentProps {
  side?: "right" | "left";
  className?: string;
  children: ReactNode;
}

interface SheetHeaderProps {
  children: ReactNode;
  className?: string;
}

interface SheetTitleProps {
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onOpenChange(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50"
    >
      {children}
    </div>
  );
}

export function SheetContent({ side = "right", className = "", children }: SheetContentProps) {
  const sideClasses = side === "right"
    ? "right-0 h-full animate-slide-in-right"
    : "left-0 h-full animate-slide-in-left";

  return (
    <div
      className={`fixed top-0 ${sideClasses} bg-white shadow-xl flex flex-col ${className}`}
    >
      {children}
    </div>
  );
}

export function SheetHeader({ children, className = "" }: SheetHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-zinc-200 ${className}`}>
      {children}
    </div>
  );
}

export function SheetTitle({ children, className = "" }: SheetTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-zinc-900 ${className}`}>
      {children}
    </h2>
  );
}

export function SheetClose({ onClose, className = "" }: { onClose: () => void; className?: string }) {
  return (
    <button
      onClick={onClose}
      className={`text-zinc-400 hover:text-zinc-600 transition-colors ${className}`}
      aria-label="Close"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

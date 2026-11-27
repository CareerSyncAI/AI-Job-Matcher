"use client";

import React, { useEffect, useId, useLayoutEffect, useRef } from "react";
import { IconX } from "@/components/Icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const RAW_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Checks if an element is genuinely visible and focusable in the DOM.
 * Accounts for:
 * - Controls inside ancestors with display: none, visibility: hidden/collapse
 * - Controls inside ancestors with [hidden], [aria-hidden="true"], or [inert]
 * - Controls disabled directly or via a disabled ancestor <fieldset>,
 *   respecting the HTML standard first-<legend> exception.
 */
export function isElementVisibleAndFocusable(el: HTMLElement): boolean {
  if (!el || typeof el.focus !== "function") return false;

  // 1. Browser-native or explicit disabled check
  const formEl = el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (formEl.disabled) {
    return false;
  }

  // 2. Hidden inputs or negative tabindex
  if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "hidden") {
    return false;
  }
  if (el.getAttribute("tabindex") === "-1") return false;

  // 3. Check every disabled ancestor <fieldset>, respecting the first direct-child
  // <legend> exception independently for each fieldset (HTML Standard).
  if (typeof el.closest === "function") {
    // 4. Check for ancestors with [hidden], [aria-hidden="true"], or [inert]
    if (el.closest('[hidden], [aria-hidden="true"], [inert]')) {
      return false;
    }
  } else {
    // Fallback if el.closest is not supported
    if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true" || el.hasAttribute("inert")) {
      return false;
    }
  }

  // 5. Check disabled fieldsets and CSS visibility on the element and all ancestors.
  let current: HTMLElement | null = el;
  while (current) {
    if (current.tagName === "FIELDSET" && (current as HTMLFieldSetElement).disabled) {
      const firstLegend = Array.from(current.children).find(
        (child) => child.tagName === "LEGEND"
      );
      if (!firstLegend?.contains(el)) {
        return false;
      }
    }

    if (current.hasAttribute && (
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true" ||
      current.hasAttribute("inert")
    )) {
      return false;
    }

    if (current.style) {
      if (current.style.display === "none" || current.style.visibility === "hidden" || current.style.visibility === "collapse") {
        return false;
      }
    }

    if (typeof window !== "undefined" && window.getComputedStyle) {
      try {
        const style = window.getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
          return false;
        }
      } catch {
        // In minimal test environments where getComputedStyle might throw
      }
    }

    current = current.parentElement;
  }

  // 6. Check dimensions if rendered in layout
  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects && el.getClientRects().length === 0) {
    if (el.style && (el.style.display === "none" || el.style.visibility === "hidden")) {
      return false;
    }
  }

  return true;
}

/**
 * Returns all genuinely focusable, enabled, and visible elements inside a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(RAW_FOCUSABLE_SELECTOR));
  return elements.filter(isElementVisibleAndFocusable);
}

interface ModalRegistration {
  id: string;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  previousActiveElement: HTMLElement | null;
}

// Global modal stack state
const modalStack: ModalRegistration[] = [];
let savedBodyOverflow = "";

function pushModal(reg: ModalRegistration) {
  if (modalStack.length === 0 && typeof document !== "undefined") {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  // Remove if already present (idempotence)
  const idx = modalStack.findIndex((m) => m.id === reg.id);
  if (idx !== -1) {
    modalStack.splice(idx, 1);
  }
  modalStack.push(reg);
}

function removeModal(id: string): ModalRegistration | null {
  const idx = modalStack.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const [removed] = modalStack.splice(idx, 1);

  if (modalStack.length === 0 && typeof document !== "undefined") {
    document.body.style.overflow = savedBodyOverflow;
  }
  return removed;
}

function getTopModal(): ModalRegistration | null {
  return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
}

// Centralized document-level event handlers installed once
let globalListenersInstalled = false;

function ensureGlobalListeners() {
  if (globalListenersInstalled || typeof document === "undefined") return;

  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    const top = getTopModal();
    if (!top || !top.dialogRef.current) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      top.onClose();
      return;
    }

    if (e.key === "Tab") {
      const container = top.dialogRef.current;
      const focusables = getFocusableElements(container);

      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const handleGlobalFocusIn = (e: FocusEvent) => {
    const top = getTopModal();
    if (!top || !top.dialogRef.current) return;

    const container = top.dialogRef.current;
    if (!container.contains(e.target as Node)) {
      e.preventDefault();
      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    }
  };

  document.addEventListener("keydown", handleGlobalKeyDown, true);
  document.addEventListener("focusin", handleGlobalFocusIn, true);
  globalListenersInstalled = true;
}

/**
 * Accessible Modal Dialog Component
 * - Reliable active-modal stack management: only the topmost modal owns keyboard focus & Escape
 * - Resilient to parent re-renders and inline callback reference shifts
 * - Stable focus management that NEVER resets focus while typing or updating form state
 * - Accurate focusable element detection filtering hidden, disabled, and tabindex="-1" elements
 * - Focus restoration specifically and exclusively to the previous trigger or previous modal
 * - Prevents background page scrolling until the last modal closes
 * - Sets appropriate ARIA attributes (role="dialog", aria-modal="true")
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
  className = "",
}) => {
  const uniqueId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    ensureGlobalListeners();

    // 1. Capture the element that triggered this modal opening
    previousActiveElementRef.current = (document.activeElement as HTMLElement | null) || null;

    // 2. Register this modal onto the active-modal stack
    pushModal({
      id: uniqueId,
      dialogRef,
      onClose: () => onCloseRef.current(),
      previousActiveElement: previousActiveElementRef.current,
    });

    // 3. Initial focus placement into modal (only if this is currently the top modal)
    const focusTimer = setTimeout(() => {
      const top = getTopModal();
      if (top && top.id === uniqueId && dialogRef.current) {
        if (dialogRef.current.contains(document.activeElement)) {
          return; // Do not steal focus if user is already interacting
        }
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 30);

    return () => {
      clearTimeout(focusTimer);
      const removed = removeModal(uniqueId);

      // Restore focus to previous active element or previous top modal
      if (removed) {
        const nextTop = getTopModal();
        if (nextTop && nextTop.dialogRef.current) {
          // A modal is still underneath; activate it and focus its active/first element
          const underFocusables = getFocusableElements(nextTop.dialogRef.current);
          if (underFocusables.length > 0) {
            underFocusables[0].focus();
          } else {
            nextTop.dialogRef.current.focus();
          }
        } else if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === "function"
        ) {
          // Last modal closed, return focus to original trigger
          previousActiveElementRef.current.focus();
        }
      }
    };
  }, [isOpen, uniqueId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      onClick={(e) => {
        // Only trigger backdrop close if clicked directly and this is top modal
        const top = getTopModal();
        if (top && top.id === uniqueId && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} rounded-2xl border p-6 shadow-2xl focus:outline-none ${className}`}
      >
        {(title || description) && (
          <div className="flex items-start justify-between mb-4 border-b pb-3 border-inherit">
            <div>
              {title && <h3 className="text-base font-semibold leading-snug">{title}</h3>}
              {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <IconX size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

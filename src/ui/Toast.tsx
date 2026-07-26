import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A minimal in-repo toaster (docs/affordo-context.md §9). The reference mounts
 * `sonner`'s `<Toaster position="top-center" />`; we hand-roll the same shape
 * rather than take a dependency, matching the router's no-dependency ethos
 * (ADR 0018) while styling to the same tokens
 * (`bg-background text-foreground border-border shadow-lg`, top-center).
 *
 * Mounted once at the app root so any screen can raise a toast via `useToast()`.
 */
interface ToastRecord {
  id: number;
  message: string;
}

interface ToastContextValue {
  /** Raise a toast; its text appears in the top-center region. */
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  // Monotonic key source, kept out of the state updater so it stays pure
  // (React double-invokes updaters under StrictMode).
  const nextId = useRef(0);

  const toast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

/** The top-center region that renders raised toasts, styled to the tokens. */
function ToastViewport({ toasts }: { toasts: ToastRecord[] }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Read the toast API. Throws if used outside a `ToastProvider`. */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return value;
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = "info" }: ToastInput) => {
      const id = ++idRef.current;

      setToasts((current) => [...current, { id, title, description, variant }]);

      window.setTimeout(() => {
        removeToast(id);
      }, 3600);
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border bg-white p-4 shadow-soft ${
              toast.variant === "success"
                ? "border-emerald-200"
                : toast.variant === "error"
                  ? "border-rose-200"
                  : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 ${
                  toast.variant === "success"
                    ? "text-emerald-600"
                    : toast.variant === "error"
                      ? "text-rose-600"
                      : "text-primary"
                }`}
              >
                {toast.variant === "success" ? (
                  <CheckCircle2 className="size-4" />
                ) : toast.variant === "error" ? (
                  <TriangleAlert className="size-4" />
                ) : (
                  <Info className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p> : null}
              </div>
              <Button
                className="size-8 rounded-full p-0"
                onClick={() => removeToast(toast.id)}
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

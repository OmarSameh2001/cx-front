import toast from "react-hot-toast";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export const showSuccessToast = (message: string, duration: number = 4000) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Success</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { duration }
  );
};

export const showErrorToast = (message: string, duration: number = 5000) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Error</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { duration }
  );
};

export const showInfoToast = (message: string, duration: number = 4000) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Info size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Information</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { duration }
  );
};

export const showWarningToast = (message: string, duration: number = 4500) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <AlertTriangle size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Warning</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { duration }
  );
};

interface ConfirmToastOptions {
  message?: string;
  title?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  tableName?: string;
}

function destructHandler(table: string) {
  switch (table.toLowerCase()) {
    case "insurers":
      return (
        <p className="text-sm text-red-500 opacity-90 mt-1">
          Deleting this insurer will also delete its products, and may cause issues to qoutes that depend on this products.
        </p>
      );
    case "products":
      return (
        <p className="text-sm text-red-500 opacity-90 mt-1">
          Deleting this product will also delete all qoutes associated with it.
        </p>
      );
    case "qoutes":
      return (
        <p className="text-sm text-red-500 opacity-90 mt-1">
          Deleting this qoute will also delete all claculations associated with it.
        </p>
    )
    case "clients":
      return (
        <p className="text-sm text-red-500 opacity-90 mt-1">
          Deleting this client will also delete all qoutes associated with him.
        </p>
    )
    default:
      return null;
  }
}

export const showConfirmToast = ({
  message = "Are you sure?",
  title = "Confirmation",
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tableName,
}: ConfirmToastOptions): string => {
  const toastId = toast.custom(
    (t) => (
      <div
        className={`flex flex-col gap-3 px-4 py-3 rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm opacity-90 mt-1">{message}</p>
          {tableName && destructHandler(tableName)}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-900 transition-colors cursor-pointer text-black dark:text-white"
            onClick={() => {
              toast.dismiss(toastId);
              onCancel?.();
            }}
          >
            {cancelText}
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-900 transition-colors cursor-pointer text-black dark:text-white"
            onClick={() => {
              toast.dismiss(toastId);
              onConfirm?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ),
    { duration: 100000 }
  );
  return toastId;
};

export const showLoadingToast = (message?: string): string => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-5 h-5 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm opacity-90">{message || "Loading..."}</p>
        </div>
      </div>
    ),
    { duration: Number.POSITIVE_INFINITY }
  );
};

export const showLoadingSuccess = (
  toastId: string,
  message: string,
  duration: number = 2000
) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Success</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { id: toastId, duration }
  );
};

export const showLoadingError = (
  toastId: string,
  message = "Something went wrong",
  duration: number = 3000
) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 z-[9999] rounded-lg shadow-lg bg-gray-200 dark:bg-[#000000] dark:text-white text-black min-w-[300px] max-w-[500px] ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle size={18} className="dark:text-white text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Error</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          onClick={() => toast.dismiss(t.id)}
        >
          <X size={16} className="dark:text-white text-black" />
        </button>
      </div>
    ),
    { id: toastId, duration }
  );
};

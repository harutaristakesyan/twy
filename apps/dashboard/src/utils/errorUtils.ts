import type { AxiosError } from "axios";

type ModalFuncProps = { title: string; content: string };

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
};

/**
 * Extract error message from various error formats
 * Supports:
 * - ApiClient errors: error.data.message or error.data.error (data attached directly by ApiClient)
 * - Axios errors: error.response.data.message or error.response.data.error
 * - Error objects: error.message
 * - Custom error strings
 */
export function getErrorMessage(error: unknown): string {
  try {
    // Handle string errors directly
    if (typeof error === "string") {
      return error;
    }

    // Handle Error instances
    if (error instanceof Error) {
      // Check if ApiClient attached data directly (not under response)
      // This is the most reliable source as it's the raw API response data
      try {
        const errorWithData = error as Error & {
          data?: { message?: string; error?: string };
        };
        if (errorWithData?.data && typeof errorWithData.data === "object") {
          // Prioritize message field, then error field
          const apiMessage = errorWithData.data.message || errorWithData.data.error;
          if (apiMessage && typeof apiMessage === "string" && apiMessage.trim()) {
            return apiMessage;
          }
        }
      } catch (_e) {
        // Silently continue if accessing data fails
      }

      // Fallback to error.message if it's not the generic "Request failed"
      const message = error.message;
      if (
        message &&
        message !== "Request failed" &&
        typeof message === "string" &&
        message.trim()
      ) {
        // Don't return error messages that look like code errors
        if (!message.includes(" is not a function") && !message.includes("Cannot read")) {
          return message;
        }
      }
    }

    // Check for Axios error structure (only if response exists and is an object)
    try {
      const axiosError = error as AxiosError<{
        message?: string;
        error?: string;
      }>;
      if (
        axiosError?.response &&
        typeof axiosError.response === "object" &&
        axiosError.response.data &&
        typeof axiosError.response.data === "object"
      ) {
        // Try message field first, then error field
        const apiMessage = axiosError.response.data.message || axiosError.response.data.error;
        if (apiMessage && typeof apiMessage === "string" && apiMessage.trim()) {
          return apiMessage;
        }
      }
    } catch (_e) {
      // Silently continue if accessing axios structure fails
    }

    // Check for legacy error structure
    try {
      const legacyError = error as ApiError;
      if (legacyError?.response?.data?.message) {
        const msg = legacyError.response.data.message;
        if (typeof msg === "string" && msg.trim()) {
          return msg;
        }
      }
      if (legacyError?.response?.data?.error) {
        const err = legacyError.response.data.error;
        if (typeof err === "string" && err.trim()) {
          return err;
        }
      }
      if (legacyError?.message) {
        const msg = legacyError.message;
        if (typeof msg === "string" && msg.trim() && !msg.includes(" is not a function")) {
          return msg;
        }
      }
    } catch (_e) {
      // Silently continue if accessing legacy structure fails
    }

    // Fallback
    return "An unexpected error occurred. Please try again.";
  } catch (extractionError) {
    // If error extraction itself fails, log it and return a safe message
    console.error("Error extracting error message:", extractionError, "Original error:", error);
    return "An unexpected error occurred. Please try again.";
  }
}

export function mapErrorToModalProps(error: unknown): ModalFuncProps {
  const rawMessage = getErrorMessage(error);
  let code = "";
  let message = rawMessage;

  // Handle Cognito PreSignUp custom error JSON
  if (rawMessage.startsWith("PreSignUp failed with error")) {
    const json = JSON.parse(
      rawMessage.replace(/^PreSignUp failed with error\s*/, "").replace(/\.$/, ""),
    );
    code = json.code;
    message = json.message;
  }

  const mappings: Record<string, ModalFuncProps> = {
    EMAIL_ALREADY_GOOGLE: {
      title: "Email Linked to Google",
      content: "This email is already registered via Google. Please sign in with Google.",
    },
    EMAIL_ALREADY_EXISTS: {
      title: "Email Already Registered",
      content: "This email is already in use. Try signing in instead.",
    },
    WEAK_PASSWORD: {
      title: "Weak Password",
      content:
        "Please use a stronger password with at least one number, symbol, and uppercase letter.",
    },
    INVALID_INPUT: {
      title: "Invalid Input",
      content: "One or more fields have invalid data. Please check your input.",
    },
    NETWORK_ERROR: {
      title: "Network Issue",
      content: "Please check your connection and try again.",
    },
  };

  const fallback: ModalFuncProps = {
    title: "Error",
    content: message,
  };

  return mappings[code || message] || fallback;
}

import { AxiosError } from 'axios';

/**
 * Extract a human-readable message from any backend error response.
 * Handles Zod validation errors by unpacking fieldErrors into a single
 * "field: message" line, so users see WHY validation failed.
 */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  if (!(err instanceof AxiosError)) {
    return err instanceof Error ? err.message : fallback;
  }

  const data = err.response?.data as
    | {
        error?: {
          message?: string;
          details?: {
            fieldErrors?: Record<string, string[]>;
            formErrors?: string[];
          };
        };
      }
    | undefined;

  const fieldErrors = data?.error?.details?.fieldErrors;
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const parts = Object.entries(fieldErrors).map(
      ([field, messages]) => `${field}: ${messages.join(', ')}`
    );
    return parts.join(' · ');
  }

  return data?.error?.message ?? err.message ?? fallback;
}

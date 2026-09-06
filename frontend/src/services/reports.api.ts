import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/axios';
import { downloadBlob } from '@/lib/downloadFile';

export type ReportType = 'sales' | 'appointments' | 'staff';

export interface DownloadReportInput {
  type: ReportType;
  from: string;
  to: string;
}

/**
 * Downloads one of the admin PDF reports and saves it straight to disk —
 * a one-shot action (not cached data), so this is a mutation rather than a
 * query, same as every other "do a thing" call in the app.
 */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ type, from, to }: DownloadReportInput) => {
      let res;
      try {
        res = await api.get(`/reports/${type}`, {
          params: { from, to },
          responseType: 'blob',
        });
      } catch (err) {
        // With responseType: 'blob', a JSON error body (validation, rate
        // limit) also arrives as a Blob — apiError() expects a parsed
        // object, so unpack it here rather than everywhere it's called.
        if (err instanceof AxiosError && err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            err.response.data = JSON.parse(text);
          } catch {
            // Not JSON (e.g. a proxy/network error page) — leave as-is.
          }
        }
        throw err;
      }
      downloadBlob(res.data as Blob, `${type}-report_${from}_to_${to}.pdf`);
    },
  });
}

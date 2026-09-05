export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function ok<T>(data: T) {
  return { success: true, data };
}

export function paginated<T>(data: T[], page: number, pageSize: number, total: number) {
  return { success: true, page, pageSize, total, data };
}

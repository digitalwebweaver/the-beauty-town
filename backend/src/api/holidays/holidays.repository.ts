import { query } from '@/config/db';

export interface DbHoliday {
  id: string;
  holiday_date: string;
  reason: string | null;
  created_at: string;
}

export async function listHolidays(): Promise<DbHoliday[]> {
  const { rows } = await query<DbHoliday>(`SELECT * FROM salon_holidays ORDER BY holiday_date ASC`);
  return rows;
}

export async function isHoliday(date: string): Promise<boolean> {
  const { rowCount } = await query(`SELECT 1 FROM salon_holidays WHERE holiday_date = $1`, [date]);
  return (rowCount ?? 0) > 0;
}

export async function createHoliday(input: { date: string; reason?: string }): Promise<DbHoliday> {
  const { rows } = await query<DbHoliday>(
    `INSERT INTO salon_holidays (holiday_date, reason) VALUES ($1, $2) RETURNING *`,
    [input.date, input.reason ?? null]
  );
  return rows[0];
}

export async function deleteHoliday(id: string): Promise<boolean> {
  const { rowCount } = await query(`DELETE FROM salon_holidays WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

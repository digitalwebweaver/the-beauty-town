import type { ReactNode } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './styles';

/** The row of tinted stat tiles at the top of every report — same idea as
 * the admin dashboard's KPI cards, condensed for a single print line. */
export function KpiBand({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.kpiRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.kpiTile}>
          <Text style={styles.kpiLabel}>{item.label}</Text>
          <Text style={styles.kpiValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** A titled block of content — `wrap={false}` keeps the heading from being
 * orphaned alone at the bottom of a page, separated from its own content. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export interface ReportColumn<T> {
  header: string;
  /** Flex-basis width, e.g. "20%" — must add up to ~100% across all columns. */
  width: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => string;
}

/**
 * A plain data table — react-pdf has no native `<table>`, so this is
 * View/Text rows styled to look like one, with an alternating-row tint and
 * a repeating header (`fixed`) if the table spans a page break.
 */
export function DataTable<T>({
  columns,
  rows,
  emptyMessage = 'No data for this period.',
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <Text style={styles.emptyState}>{emptyMessage}</Text>;
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow} fixed>
        {columns.map((c) => (
          <Text
            key={c.header}
            style={[styles.tableHeaderCell, { width: c.width, textAlign: c.align ?? 'left' }]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}
          wrap={false}
        >
          {columns.map((c) => (
            <Text
              key={c.header}
              style={[styles.tableCell, { width: c.width, textAlign: c.align ?? 'left' }]}
            >
              {c.render(row)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

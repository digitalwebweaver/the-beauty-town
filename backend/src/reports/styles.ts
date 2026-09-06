import { StyleSheet } from '@react-pdf/renderer';

// Same brand accent already used for backend-generated HTML in
// utils/email.ts (#d63384) — the frontend's own brand-maroon token is
// defined in oklch() for the browser's CSS pipeline, which react-pdf can't
// consume, so this reuses the app's existing hex fallback for anything
// branded that's generated outside that pipeline.
export const BRAND = {
  accent: '#d63384',
  accentSoft: '#faf0f4',
  text: '#1f2023',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  rowAlt: '#f9fafb',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9.5,
    color: BRAND.text,
    // Registered in fonts.ts — not the default Helvetica, which can't
    // render the ₹ symbol (see assets/notoSansFont.ts).
    fontFamily: 'NotoSans',
  },

  // ---- Header ----
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: BRAND.accent,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    width: 44,
    height: 46,
    marginRight: 10,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonName: {
    fontSize: 15,
    fontWeight: 700,
    color: BRAND.accent,
  },
  salonMeta: {
    fontSize: 8,
    color: BRAND.textMuted,
    marginTop: 2,
    maxWidth: 300,
  },
  reportTitleBlock: {
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: 700,
  },
  reportRange: {
    fontSize: 8.5,
    color: BRAND.textMuted,
    marginTop: 3,
  },

  // ---- KPI band ----
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 8,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: BRAND.accentSoft,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  kpiLabel: {
    fontSize: 7.5,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: 700,
    color: BRAND.text,
    marginTop: 3,
  },

  // ---- Section ----
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: BRAND.accent,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },

  // ---- Table ----
  table: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BRAND.accent,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  tableRowAlt: {
    backgroundColor: BRAND.rowAlt,
  },
  tableCell: {
    fontSize: 8.5,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableCellMuted: {
    color: BRAND.textMuted,
  },

  // ---- Footer ----
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: BRAND.textMuted,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 6,
  },

  emptyState: {
    fontSize: 9,
    color: BRAND.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});

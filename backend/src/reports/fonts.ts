import { Font } from '@react-pdf/renderer';
import { NOTO_SANS_BOLD_DATA_URI, NOTO_SANS_REGULAR_DATA_URI } from './assets/notoSansFont';

// Registered once at module load (imported for its side effect by
// ReportLayout.tsx, which every report document renders through) — see
// assets/notoSansFont.ts for why a real Unicode font is required at all
// (the ₹ symbol isn't in the default PDF base-14 fonts' encoding).
let registered = false;

export function ensureReportFontsRegistered(): void {
  if (registered) return;
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: NOTO_SANS_REGULAR_DATA_URI, fontWeight: 400 },
      { src: NOTO_SANS_BOLD_DATA_URI, fontWeight: 700 },
    ],
  });
  // react-pdf hyphenates wrapped words by default (splitting mid-word with
  // a "-") — fine for prose, not for a business document header where it
  // can land on a name, phone number, or the "·" separator between fields
  // and read as a typo. Business documents shouldn't hyphenate at all.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

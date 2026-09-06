import type { ReactNode } from 'react';
import { Image, Page, Text, View } from '@react-pdf/renderer';
import type { SalonSettingsRow } from '@/api/settings/settings.repository';
import { LOGO_DATA_URI } from './assets/logo';
import { formatDate, formatDateTimeStamp } from './format';
import { styles } from './styles';
import { ensureReportFontsRegistered } from './fonts';

ensureReportFontsRegistered();

interface ReportPageProps {
  settings: SalonSettingsRow;
  title: string;
  from: string;
  to: string;
  children: ReactNode;
}

/**
 * The shared page shell every report document renders through: branded
 * header (logo + salon name/contact pulled from the live salon_settings
 * row, report title, requested date range) and a footer with page numbers
 * + a "generated at" timestamp. `fixed` on both header/footer would repeat
 * them on every page if a report ever spans multiple pages — only the
 * footer needs that here since the header renders once per Page element
 * (each Document below has exactly one Page; content overflow is handled
 * by react-pdf's automatic pagination within it).
 */
function ReportPage({ settings, title, from, to, children }: ReportPageProps) {
  const generatedAt = formatDateTimeStamp(new Date());

  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.headerRow} fixed>
        <View style={styles.brandBlock}>
          <Image src={LOGO_DATA_URI} style={styles.logo} />
          <View>
            <Text style={styles.salonName}>{settings.name}</Text>
            {settings.address && <Text style={styles.salonMeta}>{settings.address}</Text>}
            <Text style={styles.salonMeta}>
              {[settings.phone, settings.email, settings.gstin && `GSTIN: ${settings.gstin}`]
                .filter(Boolean)
                .join('   ·   ')}
            </Text>
          </View>
        </View>
        <View style={styles.reportTitleBlock}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportRange}>
            {formatDate(from)} – {formatDate(to)}
          </Text>
        </View>
      </View>

      {children}

      <View style={styles.footer} fixed>
        <Text>Generated on {generatedAt}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

export default ReportPage;

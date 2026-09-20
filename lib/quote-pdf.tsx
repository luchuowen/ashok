/**
 * Quote PDF — @react-pdf/renderer (pure JS, no native deps, works in the
 * Cloud Run/App Hosting Node runtime). Deliberately uses the built-in
 * Helvetica font rather than registering Fraunces/Work Sans: font
 * registration fetches the font file over the network at render time,
 * which is a fragile thing to depend on in a server route. Brand colors
 * and the ink header band carry the identity instead.
 */

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Quote } from "@/lib/db";
import { siteConfig } from "@/lib/content/site";

const INK = "#14120f";
const CREAM = "#f5f4ef";
const OXBLOOD = "#8a4432";
const MUTED = "#5b5648";
const LINE = "#ddd3c1";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  header: {
    backgroundColor: INK,
    color: CREAM,
    paddingVertical: 28,
    paddingHorizontal: 40,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 9,
    color: LINE,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 40,
  },
  eyebrow: {
    fontSize: 9,
    color: OXBLOOD,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaBlock: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 11,
    color: INK,
  },
  table: {
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: "#faf9f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  colItem: { flex: 3 },
  colAmount: { flex: 1, textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: OXBLOOD,
  },
  note: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
  },
});

export interface QuotePdfParams {
  quote: Quote;
  customerName: string;
  customerPhone: string;
}

function reference(quote: Quote): string {
  return `Q-${quote.id.slice(-8).toUpperCase()}`;
}

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-KE")}`;
}

function QuoteDocument({ quote, customerName, customerPhone }: QuotePdfParams) {
  return (
    <Document
      title={`Quotation ${reference(quote)} — ${siteConfig.fullName}`}
      author={siteConfig.fullName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{siteConfig.fullName.toUpperCase()}</Text>
          <Text style={styles.brandSub}>{siteConfig.address}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>QUOTATION</Text>
          <Text style={styles.title}>{reference(quote)}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Prepared for</Text>
              <Text style={styles.metaValue}>{customerName}</Text>
              <Text style={[styles.metaValue, { color: MUTED, fontSize: 9, marginTop: 2 }]}>
                {customerPhone}
              </Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Issued</Text>
              <Text style={styles.metaValue}>{quote.issuedAt}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Valid Until</Text>
              <Text style={styles.metaValue}>{quote.expiresAt}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colItem]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colItem}>{quote.item}</Text>
              <Text style={styles.colAmount}>{money(quote.amount, quote.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{money(quote.amount, quote.currency)}</Text>
            </View>
          </View>

          <Text style={styles.note}>
            This quotation is valid until {quote.expiresAt}. To proceed, reply to confirm and we&apos;ll
            get you booked in.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {siteConfig.address} · {siteConfig.phone}
          </Text>
          <Text style={styles.footerText}>{siteConfig.email}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(params: QuotePdfParams): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument {...params} />);
}

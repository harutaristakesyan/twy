import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  invoiceId: string;
  loadId: string;
  dueAt: string;
  amount: string;
  currency: string;
}

export default function BrokerOverdueEmail({ invoiceId, loadId, dueAt, amount, currency }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Broker invoice overdue — Invoice {invoiceId}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Heading style={styles.heading}>Broker Invoice Overdue</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.invoice}>Invoice</Text>
            <Text style={styles.value}>{invoiceId}</Text>
            <Text style={styles.label}>Load</Text>
            <Text style={styles.value}>{loadId}</Text>
            <Text style={styles.label}>Was Due</Text>
            <Text style={styles.overdue}>{dueAt}</Text>
            <Hr style={styles.divider} />
            <Text style={styles.amountLabel}>Outstanding Amount</Text>
            <Text style={styles.amount}>
              {currency} {amount}
            </Text>
            <Hr style={styles.divider} />
            <Text style={styles.footer}>TWY Accounting — automated reminder</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#f4f4f5", fontFamily: "sans-serif", margin: 0, padding: 0 },
  container: { maxWidth: "560px", margin: "40px auto", padding: "0 16px" },
  card: { backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px" },
  heading: { fontSize: "20px", color: "#111827", marginTop: 0, marginBottom: "8px" },
  divider: { borderColor: "#e5e7eb", margin: "16px 0" },
  invoice: { fontSize: "12px", color: "#6b7280", margin: "8px 0 2px" },
  label: { fontSize: "12px", color: "#6b7280", margin: "8px 0 2px" },
  value: { fontSize: "14px", color: "#111827", margin: "0 0 8px", fontWeight: "600" },
  overdue: { fontSize: "14px", color: "#dc2626", margin: "0 0 8px", fontWeight: "600" },
  amountLabel: { fontSize: "13px", color: "#6b7280", margin: "8px 0 4px" },
  amount: { fontSize: "24px", color: "#111827", fontWeight: "700", margin: "0 0 8px" },
  footer: { fontSize: "11px", color: "#9ca3af", margin: "8px 0 0" },
};

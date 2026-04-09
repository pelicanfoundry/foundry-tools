export const kpiData = [
  { label: "Total Spend (30d)", value: 847000, formatted: "$847K", trend: "+12%" },
  { label: "Vendor Payments (30d)", value: 412000, formatted: "$412K", trend: "+8%" },
  { label: "Payroll (30d)", value: 298000, formatted: "$298K", trend: "+3%" },
  { label: "Open Alerts", value: 23, formatted: "23", trend: null },
] as const;

export const riskSummary = [
  { severity: "critical" as const, label: "Critical", count: 4, color: "#ef4444" },
  { severity: "high" as const, label: "High", count: 8, color: "#fb923c" },
  { severity: "medium" as const, label: "Medium", count: 7, color: "#fbbf24" },
  { severity: "low" as const, label: "Low", count: 4, color: "#4ade80" },
] as const;

export const topVendors = [
  { name: "Kim Janowitz Consulting", spend: "$28,400", alerts: 5, risk: "critical" as const },
  { name: "Apex Mechanical", spend: "$67,200", alerts: 4, risk: "high" as const },
  { name: "Marcus Webb Services", spend: "$14,800", alerts: 3, risk: "high" as const },
  { name: "ABC Supply Co", spend: "$124,500", alerts: 0, risk: "low" as const },
  { name: "United Rentals", spend: "$89,300", alerts: 0, risk: "low" as const },
] as const;

export const alertListItems = [
  {
    id: 1,
    severity: "critical" as const,
    rule: "SHELL_VENDOR",
    ruleName: "Shell Vendor — No Tax ID",
    vendor: "Kim Janowitz Consulting",
    amount: "$28,400",
    date: "Mar 28, 2026",
    status: "open" as const,
    noteCount: 0,
  },
  {
    id: 2,
    severity: "critical" as const,
    rule: "GHOST_EMPLOYEE",
    ruleName: "Payment to Terminated Employee",
    vendor: "Nina Torres",
    amount: "$4,200",
    date: "Mar 27, 2026",
    status: "open" as const,
    noteCount: 2,
  },
  {
    id: 3,
    severity: "high" as const,
    rule: "DUPLICATE_INVOICE",
    ruleName: "Duplicate Invoice Detected",
    vendor: "Apex Mechanical",
    amount: "$9,800",
    date: "Mar 26, 2026",
    status: "investigating" as const,
    noteCount: 1,
  },
  {
    id: 4,
    severity: "high" as const,
    rule: "SPLIT_PAYMENT",
    ruleName: "Split Payment Structuring",
    vendor: "Marcus Webb Services",
    amount: "$9,400",
    date: "Mar 25, 2026",
    status: "open" as const,
    noteCount: 0,
  },
  {
    id: 5,
    severity: "medium" as const,
    rule: "ROUND_DOLLAR",
    ruleName: "Round-Dollar Amount",
    vendor: "ABC Supply Co",
    amount: "$50,000",
    date: "Mar 24, 2026",
    status: "open" as const,
    noteCount: 0,
  },
  {
    id: 6,
    severity: "medium" as const,
    rule: "LARGE_NO_MEMO",
    ruleName: "Large Payment, No Memo",
    vendor: "United Rentals",
    amount: "$18,500",
    date: "Mar 23, 2026",
    status: "open" as const,
    noteCount: 0,
  },
] as const;

export const selectedAlertDetail = {
  severity: "critical" as const,
  ruleCode: "SHELL_VENDOR",
  status: "open" as const,
  title: "Shell Vendor — No Tax ID on File",
  description:
    "Kim Janowitz Consulting received $28,400 with no tax ID on file. This vendor was created 18 days ago and has received 3 payments totaling $42,600. No EIN or W-9 has been provided.",
  vendor: "Kim Janowitz Consulting",
  amount: "$28,400",
  date: "Mar 28, 2026",
  method: "Check #4891",
  category: "Professional Services",
  riskScore: 87,
  aiAnalysis:
    "This vendor exhibits multiple fraud indicators. The billing address (142 Elm St, Unit B) matches the home address of Angela Mercer, a current employee in Accounts Payable. Combined with the absence of a tax ID and rapid payment escalation ($8,200 → $12,000 → $22,400), this pattern is consistent with a ghost vendor scheme. Recommended: Request W-9 immediately. Cross-reference vendor bank account with employee records.",
} as const;

export const graphNodes = [
  { id: "v1", label: "Kim Janowitz\nConsulting", x: 960, y: 400, risk: "critical" as const, type: "vendor" as const },
  { id: "v2", label: "Apex\nMechanical", x: 600, y: 300, risk: "high" as const, type: "vendor" as const },
  { id: "v3", label: "Marcus Webb\nServices", x: 1300, y: 350, risk: "high" as const, type: "vendor" as const },
  { id: "v4", label: "ABC Supply", x: 500, y: 550, risk: "low" as const, type: "vendor" as const },
  { id: "v5", label: "United\nRentals", x: 1400, y: 600, risk: "low" as const, type: "vendor" as const },
  { id: "e1", label: "Angela\nMercer", x: 820, y: 580, risk: "critical" as const, type: "employee" as const },
  { id: "e2", label: "Nina\nTorres", x: 1100, y: 250, risk: "high" as const, type: "employee" as const },
] as const;

export const graphEdges = [
  { from: "v1", to: "e1", color: "#ec4899", label: "Address match" },
  { from: "v2", to: "v3", color: "#fb923c", label: "Same-day payments" },
  { from: "v1", to: "v2", color: "#fbbf24", label: "Duplicate flag" },
  { from: "e2", to: "v3", color: "#818cf8", label: "Created by" },
  { from: "e1", to: "v4", color: "#818cf8", label: "Entered by" },
] as const;

export const reconciliationData = {
  bankWithdrawals: 342,
  withoutProof: 3,
  lookback: "90 days",
  minAmount: "$500",
  unreconciled: [
    {
      vendor: "Kim Janowitz Consulting",
      amount: "$18,500",
      dateRecorded: "Feb 12, 2026",
      paidVia: "Check #4891",
      daysUnverified: 47,
    },
    {
      vendor: "Marcus Webb Services",
      amount: "$9,400",
      dateRecorded: "Mar 1, 2026",
      paidVia: "Check #5012",
      daysUnverified: 30,
    },
    {
      vendor: "Kim Janowitz Consulting",
      amount: "$12,000",
      dateRecorded: "Mar 10, 2026",
      paidVia: "ACH",
      daysUnverified: 21,
    },
  ],
} as const;

export const problemStats = [
  "42% of fraud targets small businesses",
  "Average loss: $145,000",
  "Median time to detect: 12 months",
] as const;

export type BgjDashboardAlert = {
  customerCode: string;
  name: string;
  level: 'high' | 'medium';
  issue: string;
  daysSinceLastOrder: number | null;
};

export type BgjDashboardMonthlySales = {
  months: { month: string; label: string }[];
  overall: number[];
  byStaff: { staffId: string | null; staffName: string; values: number[] }[];
};

export type BgjDashboardRecentOrder = {
  customerCode: string;
  clinicName: string;
  staffName: string;
  amount: number;
  orderDate: string;
};

export type BgjDashboardRankingEntry = {
  customerCode: string;
  clinicName: string;
  staffName: string;
  currentMonthAmount: number;
  growthPct: number | null;
};

export type BgjDashboardOverview = {
  generatedAt: string;
  kpis: {
    totalClinicCount: number;
    totalClinicCountDelta: number;
    currentMonthSalesTotal: number;
    currentMonthSalesGrowthPct: number | null;
    followUpCount: number;
    dormantRiskCount: number;
  };
  alerts: BgjDashboardAlert[];
  monthlySales: BgjDashboardMonthlySales;
  recentOrders: BgjDashboardRecentOrder[];
  ranking: BgjDashboardRankingEntry[];
};

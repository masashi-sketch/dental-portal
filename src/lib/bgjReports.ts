export type BgjSalesReportMonthlyTrend = {
  month: string;
  label: string;
  salesAmount: number;
  orderCount: number;
};

export type BgjSalesReportStaffRow = {
  staffId: string | null;
  staffName: string;
  clinicCount: number;
  currentMonthSales: number;
  currentMonthVisitCount: number;
  salesPerClinic: number | null;
};

export type BgjSalesReportAreaRow = {
  area: string;
  clinicCount: number;
  currentMonthSales: number;
};

export type BgjSalesReportTopClinic = {
  customerCode: string;
  name: string;
  staffName: string;
  totalSales: number;
  monthlyAvgSales: number;
};

export type BgjSalesReport = {
  generatedAt: string;
  period: { start: string; end: string; label: string };
  summary: {
    totalSales: number;
    monthlyAvgSales: number;
    totalOrderCount: number;
    avgOrderValue: number | null;
    yoySalesGrowthPct: number | null;
  };
  monthlyTrend: BgjSalesReportMonthlyTrend[];
  byStaff: BgjSalesReportStaffRow[];
  byArea: BgjSalesReportAreaRow[];
  topClinics: BgjSalesReportTopClinic[];
};

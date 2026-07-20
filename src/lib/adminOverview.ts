import type {
  CommerceSource,
  FulfillmentMethod,
  PatientOrderStatus,
  PatientOrderType,
} from '@/lib/supabase/types';

export type AdminOverviewRecentOrder = {
  id: string;
  orderedAt: string;
  fulfillmentMethod: FulfillmentMethod;
  status: PatientOrderStatus;
  orderType: PatientOrderType;
  source: CommerceSource;
  patientName: string;
  productSummary: string;
};

export type AdminOverviewAnnouncement = {
  id: string;
  announcementDate: string;
  tag: '重要' | 'お知らせ' | 'キャンペーン';
  text: string;
};

export type AdminOverviewMonth = {
  month: string;
  label: string;
  internalOrderCount: number;
  internalOrderAmount: number;
  confirmedSales: null;
  confirmedCommission: null;
};

export type AdminOverviewProduct = {
  productName: string;
  quantity: number;
  internalOrderAmount: number;
  confirmedSales: null;
  confirmedCommission: null;
};

export type AdminOverview = {
  generatedAt: string;
  counts: {
    patientCount: number;
    publishedAnnouncementCount: number;
    activeOrderCount: number;
    visibleProductCount: number;
  };
  recentOrders: AdminOverviewRecentOrder[];
  recentAnnouncements: AdminOverviewAnnouncement[];
  commerce: {
    integrationStatus: 'awaiting_shopify';
    commissionRate: number | null;
    currentMonth: {
      internalOrderCount: number;
      internalOrderAmount: number;
      confirmedSales: null;
      confirmedCommission: null;
    };
    monthly: AdminOverviewMonth[];
    products: AdminOverviewProduct[];
  };
};

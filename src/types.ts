export interface QuotationFunction {
  date: string;
  name: string;
  time: string;
  services: string[];
}

export interface TrainingRule {
  trigger: string;
  deliverables: string[];
}

export interface CustomImage {
  id: string;
  url: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage or px
  page: number; // which page index
}

export interface DesignSettings {
  primaryFont: string;
  secondaryFont: string;
  accentColor: string;
  logoUrl?: string;
  fontScale?: number;
}

export interface QuotationState {
  id?: string;
  clientName: string;
  finalAmount: number;
  preWeddingDeliverables: string[];
  functions: QuotationFunction[];
  finalDeliverables: string[];
  userId: string;
  createdAt: string;
  coverImage?: string;
  customImages?: CustomImage[];
  designSettings?: DesignSettings;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: string;
    upiId: string;
  };
}

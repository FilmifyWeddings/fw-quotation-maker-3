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
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  rotation?: number;
  borderRadius?: string;
}

export interface CustomTextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right';
  page: number;
  rotation?: number;
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
  customTextBlocks?: CustomTextBlock[];
  designSettings?: DesignSettings;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: string;
    upiId: string;
  };
  paymentSchedule?: {
    date: string;
    step: string;
    amt: number;
    status: string;
  }[];
}

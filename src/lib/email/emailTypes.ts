export type MembershipConfirmationVariables = {
  memberName: string;
  memberEmail: string;
  membershipId: string;
  packageName: string;
  startDate: string;
  endDate: string;
  personalTrainer?: boolean;
  trainerName?: string;
  portalUrl: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  currentYear: string;
};

export type PaymentReceiptVariables = {
  memberName: string;
  memberEmail: string;
  receiptNumber: string;
  paymentDate: string;
  paymentStatus: string;
  statusClass: 'success' | 'pending';
  packageName: string;
  personalTrainer?: boolean;
  trainerName?: string;
  duration: string;
  paymentMethod: string;
  currency: string;
  subtotal?: number;
  discount?: number;
  totalAmount: number;
  pendingInstructions?: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  currentYear: string;
};

export type PasswordResetVariables = {
  name: string;
  email: string;
  resetUrl: string;
  expiryTime: number;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  currentYear: string;
};

export interface TemplateVariables {
  MEMBERSHIP_CONFIRMATION: MembershipConfirmationVariables;
  PAYMENT_RECEIPT: PaymentReceiptVariables;
  PASSWORD_RESET: PasswordResetVariables;
  SUBSCRIPTION_EXPIRY: {
    memberName: string;
    memberEmail: string;
    expiryDate: string;
    packageName: string;
    renewalUrl: string;
    logoUrl: string;
    supportPhone: string;
    supportEmail: string;
    address: string;
    currentYear: string;
  };
  TRAINER_SESSION_REMINDER: {
    memberName: string;
    memberEmail: string;
    trainerName: string;
    sessionDate: string;
    sessionTime: string;
    location: string;
    logoUrl: string;
    supportPhone: string;
    supportEmail: string;
    address: string;
    currentYear: string;
  };
}

export type EmailTemplateType = keyof TemplateVariables;
export type TemplateData<T extends EmailTemplateType> = TemplateVariables[T];

// Global variables available to all templates
export interface GlobalTemplateVariables {
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  currentYear: string;
}
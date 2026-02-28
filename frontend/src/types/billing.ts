import { Subscription } from './subscription'

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type PaymentMethodType = 'card' | 'bank_transfer'

export interface Invoice {
  id: string
  organizationId: string
  subscriptionId: string
  invoiceNumber: string
  amount: number
  currency: string
  status: InvoiceStatus
  billingPeriodStart: string
  billingPeriodEnd: string
  issuedAt: string
  dueDate?: string
  paidAt?: string
  stripeInvoiceId?: string
  payplusInvoiceId?: string
  pdfUrl?: string
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  subscription?: Subscription
}

export interface PaymentMethod {
  id: string
  organizationId: string
  type: PaymentMethodType
  cardBrand?: string
  cardLast4?: string
  cardExpMonth?: number
  cardExpYear?: number
  isDefault: boolean
  stripePaymentMethodId?: string
  payplusPaymentMethodId?: string
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface BillingHistory {
  id: string
  organizationId: string
  subscriptionId?: string
  eventType: string
  description?: string
  amount?: number
  currency?: string
  meta?: Record<string, unknown>
  createdAt: string
  subscription?: Subscription
}

export interface PaymentMethodCreate {
  organizationId: string
  type?: PaymentMethodType
  cardBrand?: string
  cardLast4?: string
  cardExpMonth?: number
  cardExpYear?: number
  isDefault?: boolean
  stripePaymentMethodId?: string
  payplusPaymentMethodId?: string
  meta?: Record<string, unknown>
}

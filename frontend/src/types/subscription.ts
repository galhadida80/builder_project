export type PlanTier = 'starter' | 'professional' | 'enterprise'

export type BillingCycle = 'monthly' | 'annual'

export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'past_due'

export interface SubscriptionPlan {
  id: string
  tier: string
  name: string
  description?: string
  monthlyPrice: number
  annualPrice: number
  maxUsers?: number
  maxProjects?: number
  maxStorageGb?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Subscription {
  id: string
  organizationId: string
  planId: string
  billingCycle: BillingCycle
  status: SubscriptionStatus
  trialEndsAt?: string
  currentPeriodStart: string
  currentPeriodEnd: string
  canceledAt?: string
  stripeSubscriptionId?: string
  payplusSubscriptionId?: string
  createdAt: string
  updatedAt: string
  plan?: SubscriptionPlan
}

export interface SubscriptionCreate {
  organizationId: string
  planId: string
  billingCycle?: BillingCycle
  trialDays?: number
}

export interface SubscriptionUpgrade {
  planId: string
  billingCycle?: BillingCycle
}

export interface SubscriptionCancel {
  immediate?: boolean
}

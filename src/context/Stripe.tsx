import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  stripeConfigSeed,
  webhookSeed,
  webhookDeliveriesSeed,
  priceMappingsSeed,
} from '@/data/stripe'
import type { StripeConfig, WebhookConfig, WebhookDelivery, PriceMapping } from '@/data/stripe'

/**
 * Editable, persisted Stripe integration settings for the admin portal.
 * Mirrors how a real integration is configured (connection, webhooks, price
 * mapping, invoicing defaults) while keeping secrets out of the front-end.
 */
interface StripeStore {
  config: StripeConfig
  webhook: WebhookConfig
  deliveries: WebhookDelivery[]
  mappings: PriceMapping[]
}

interface StripeValue extends StripeStore {
  updateConfig: (patch: Partial<StripeConfig>) => void
  updateWebhook: (patch: Partial<WebhookConfig>) => void
  updateMapping: (key: string, patch: Partial<PriceMapping>) => void
  sendTestEvent: (event: string) => void
}

const Ctx = createContext<StripeValue | null>(null)
const KEY = 'plcy.stripe.v1'

function seed(): StripeStore {
  return {
    config: stripeConfigSeed,
    webhook: webhookSeed,
    deliveries: webhookDeliveriesSeed,
    mappings: priceMappingsSeed,
  }
}

function load(): StripeStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StripeStore>
      const s = seed()
      // shallow-merge so newly-shipped fields/mappings appear for existing users
      return {
        config: { ...s.config, ...parsed.config },
        webhook: { ...s.webhook, ...parsed.webhook },
        deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : s.deliveries,
        mappings: Array.isArray(parsed.mappings) && parsed.mappings.length ? (parsed.mappings as PriceMapping[]) : s.mappings,
      }
    }
  } catch {
    /* ignore */
  }
  return seed()
}

function persist(s: StripeStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function StripeProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StripeStore>(load)

  const commit = useCallback((next: StripeStore) => {
    setStore(next)
    persist(next)
  }, [])

  const updateConfig = useCallback((patch: Partial<StripeConfig>) => commit({ ...store, config: { ...store.config, ...patch } }), [store, commit])
  const updateWebhook = useCallback((patch: Partial<WebhookConfig>) => commit({ ...store, webhook: { ...store.webhook, ...patch } }), [store, commit])
  const updateMapping = useCallback(
    (key: string, patch: Partial<PriceMapping>) => commit({ ...store, mappings: store.mappings.map((m) => (m.key === key ? { ...m, ...patch } : m)) }),
    [store, commit],
  )
  const sendTestEvent = useCallback(
    (event: string) => {
      const delivery: WebhookDelivery = { id: `evt_test_${store.deliveries.length + 1}`, event, status: 'Delivered', time: 'just now', attempts: 1 }
      commit({ ...store, deliveries: [delivery, ...store.deliveries].slice(0, 20) })
    },
    [store, commit],
  )

  return (
    <Ctx.Provider value={{ ...store, updateConfig, updateWebhook, updateMapping, sendTestEvent }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStripe(): StripeValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStripe must be used within StripeProvider')
  return ctx
}

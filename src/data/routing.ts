/**
 * Model-routing enforcement. Residency and sub-processor allow-lists decide
 * whether a client's inference request may be routed to a given model
 * provider — and, when blocked, whether it can be re-routed to an in-region
 * allowed provider. This is PLCY enforcing its own sovereignty rules.
 */
import { subprocessors } from './privacy'
import { regionByCode } from './fleet'

export interface ModelProvider {
  name: string
  home: string
  inRegion: boolean
}

/** Providers that can serve inference. In-house runs inside the client's region. */
export const modelProviders: ModelProvider[] = [
  { name: 'OpenAI', home: 'United States', inRegion: false },
  { name: 'Anthropic', home: 'United States', inRegion: false },
  { name: 'Aleph Alpha', home: 'European Union', inRegion: false },
  { name: 'In-house (in-region)', home: 'Client region', inRegion: true },
]

export type Decision = 'Allowed' | 'Rerouted' | 'Blocked'

export interface RouteResult {
  decision: Decision
  reason: string
  routedTo: string
}

/** Is a provider permitted to serve a given region? */
export function providerAllowed(providerName: string, regionCode: string): boolean {
  const mp = modelProviders.find((p) => p.name === providerName)
  if (mp?.inRegion) return true
  const sub = subprocessors.find((s) => s.name === providerName)
  if (!sub) return true
  return !sub.restrictedRegions.includes(regionCode)
}

/** Evaluate a routing request and, if blocked, attempt an in-region reroute. */
export function evaluateRoute(providerName: string, regionCode: string): RouteResult {
  const region = regionByCode(regionCode)
  const laws = region?.laws.join(', ') ?? ''
  if (providerAllowed(providerName, regionCode)) {
    return { decision: 'Allowed', reason: `${providerName} is permitted in ${region?.name ?? regionCode}`, routedTo: providerName }
  }
  // Blocked — find an in-region allowed alternative (prefer a sovereign model, then in-house).
  const alt = modelProviders.find((p) => p.name !== providerName && p.name !== 'In-house (in-region)' && providerAllowed(p.name, regionCode))
    ?? modelProviders.find((p) => p.inRegion)
  if (alt) {
    return { decision: 'Rerouted', reason: `${providerName} is not permitted in ${region?.name} (${laws}); re-routed in-region`, routedTo: alt.name }
  }
  return { decision: 'Blocked', reason: `${providerName} is not permitted in ${region?.name} (${laws}); no in-region alternative`, routedTo: '—' }
}

/* ------------------------------------------------------------------ */
/* Recent routing decisions (enforcement log)                          */
/* ------------------------------------------------------------------ */
export interface RouteEvent {
  id: string
  time: string
  customer: string
  regionCode: string
  requested: string
  decision: Decision
  routedTo: string
}

export const recentRoutes: RouteEvent[] = [
  { id: 'rt_1', time: '10:42:11', customer: 'Northwind Retail', regionCode: 'eu-central-1', requested: 'OpenAI', decision: 'Rerouted', routedTo: 'Aleph Alpha' },
  { id: 'rt_2', time: '10:41:58', customer: 'Meridian Bank', regionCode: 'us-east-1', requested: 'OpenAI', decision: 'Allowed', routedTo: 'OpenAI' },
  { id: 'rt_3', time: '10:41:40', customer: 'Helix Health', regionCode: 'de-sov-1', requested: 'Anthropic', decision: 'Rerouted', routedTo: 'In-house (in-region)' },
  { id: 'rt_4', time: '10:41:22', customer: 'Saffron Foods', regionCode: 'eu-west-1', requested: 'OpenAI', decision: 'Rerouted', routedTo: 'Aleph Alpha' },
  { id: 'rt_5', time: '10:40:55', customer: 'Vertex Capital', regionCode: 'ap-southeast-1', requested: 'Anthropic', decision: 'Allowed', routedTo: 'Anthropic' },
  { id: 'rt_6', time: '10:40:31', customer: 'Ferro Manufacturing', regionCode: 'de-sov-1', requested: 'OpenAI', decision: 'Rerouted', routedTo: 'In-house (in-region)' },
  { id: 'rt_7', time: '10:40:03', customer: 'Pinecrest Insurance', regionCode: 'us-east-1', requested: 'Anthropic', decision: 'Allowed', routedTo: 'Anthropic' },
  { id: 'rt_8', time: '10:39:48', customer: 'Helix Health', regionCode: 'de-sov-1', requested: 'Datadog', decision: 'Blocked', routedTo: '—' },
]

export const routingTotals = {
  evaluatedToday: 48210,
  allowed: 41180,
  rerouted: 6480,
  blocked: 550,
}

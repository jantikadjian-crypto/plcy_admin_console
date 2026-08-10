import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useCustomers } from '@/context/Customers'
import { useSession } from '@/context/Session'
import { makeCustomer, CUSTOMER_REGIONS } from '@/data/mock'
import type { Customer } from '@/data/mock'

const NEW = '__new__'

/**
 * Customer selector for the provisioning flows, with an inline create.
 *
 * Provisioning is where "we just signed them, stand up their sandbox" happens,
 * so the account frequently doesn't exist yet. A closed list dead-ends that;
 * free text is worse, because `Instance.customer` is a name that billing,
 * health, renewals, and residency all join against — an unrecognised string
 * produces a deployment nobody can bill or report on.
 *
 * So: pick from the real customer store, or create a real record here without
 * leaving the form. Either way what comes back is a customer that exists.
 */
export function CustomerPicker({
  value,
  onChange,
  onCreated,
  autoFocus,
  id,
}: {
  value: string
  onChange: (name: string) => void
  /** Fires only for an inline creation, so a caller can adopt the new record's plan. */
  onCreated?: (c: Customer) => void
  autoFocus?: boolean
  id?: string
}) {
  const { list, add } = useCustomers()
  const { logAction } = useSession()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [plan, setPlan] = useState<Customer['plan']>('Business')
  const [region, setRegion] = useState(CUSTOMER_REGIONS[0])

  const trimmed = name.trim()
  const clash = list.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())

  const cancel = () => {
    setCreating(false)
    setName('')
    setPlan('Business')
    setRegion(CUSTOMER_REGIONS[0])
  }

  const create = () => {
    if (!trimmed || clash) return
    const c = makeCustomer({ name: trimmed, plan, region })
    add(c)
    logAction({ action: 'customer.create', target: `${c.name} · created during provisioning`, category: 'customer' })
    onChange(c.name)
    onCreated?.(c)
    cancel()
  }

  if (creating) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">New customer</p>
          <button onClick={cancel} className="text-ink-400 hover:text-ink-700" aria-label="Cancel new customer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Company name"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        {clash && <p className="mt-1 text-xs text-rose-600">{trimmed} is already a customer — pick them from the list instead.</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Customer['plan'])} aria-label="Plan">
            {(['Enterprise', 'Business', 'Growth', 'Trial'] as Customer['plan'][]).map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            {CUSTOMER_REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button
          className="btn-primary mt-2 w-full px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={create}
          disabled={!trimmed || clash}
        >
          <Check className="h-3.5 w-3.5" />Create &amp; select
        </button>
        <p className="mt-1.5 text-[11px] text-ink-500">
          Creates the account now — seats, MRR and CSM can be filled in on the customer page afterwards.
        </p>
      </div>
    )
  }

  return (
    <select
      id={id}
      className="input"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => (e.target.value === NEW ? setCreating(true) : onChange(e.target.value))}
    >
      {!value && <option value="">Select a customer…</option>}
      {list.map((c) => <option key={c.id}>{c.name}</option>)}
      <option value={NEW}>+ New customer…</option>
    </select>
  )
}

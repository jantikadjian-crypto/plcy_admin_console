# PLCY — Admin Console

Internal admin console for the **PLCY** team to operate the *AI Governance &
Policy Enforcement Platform*. It provides a single place to manage customers,
their deployed instances, the AI models under governance, and the policy packs
that enforce controls across the fleet.

> This is a front-end prototype driven entirely by mock data (`src/data/mock.ts`).
> No backend is required to run it.

## Tech stack

- **React 18** + **TypeScript** (strict)
- **Vite** (dev server & build)
- **Tailwind CSS** (design system)
- **React Router v6** (routing)
- **Recharts** (charts)
- **lucide-react** (icons)

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## What's inside

The console is organized into the sidebar groups below. Every screen is a
route under `src/pages/`.

| Group        | Screens |
|--------------|---------|
| **Overview** | Dashboard — fleet-wide KPIs, usage trend, risk distribution, compliance scores, activity feed |
| **Customers**| Customers (accounts, plans, MRR, compliance), Instances (per-customer deployments & health) |
| **Governance**| AI Models (models under governance + shadow-AI detection), Model Registry (versions, lifecycle, approvals), Data Classification (sensitivity levels & detections) |
| **Policy**   | Policy Packs (reusable rule bundles), Policy Editor (IDE-style rule authoring), Enforcement Controls (Monitor / Warn / Block) |
| **Operations**| Observability (latency, throughput, errors), Compliance Reporting (SOC 2, GDPR, HIPAA, EU AI Act…), Incident Management, Risk Assessment |
| **Platform** | Audit Log, Admin Security (users, SSO, API keys), Developer Tools (API, webhooks, SDKs), Super Admin (platform-wide health & feature flags), Settings |

## Project structure

```
src/
  components/
    Layout.tsx        # app shell (sidebar + topbar)
    Sidebar.tsx       # navigation + customer switcher
    Topbar.tsx        # header, search, notifications
    ui.tsx            # shared UI kit (Card, StatCard, Badge, Table, …)
  config/
    navigation.ts     # sidebar route definitions
  data/
    mock.ts           # single source of mock data + formatters
  pages/              # one file per route
  App.tsx             # router
  main.tsx            # entry point
```

## Design system

Shared primitives live in `src/components/ui.tsx` and global component classes
(`.card`, `.btn-primary`, `.input`, …) in `src/index.css`. Brand color is the
blue `brand-*` scale defined in `tailwind.config.js`; emerald = healthy,
amber/orange = warning, rose = danger, slate = neutral.

import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Compass className="h-7 w-7" />
      </div>
      <p className="text-3xl font-bold text-ink-900">Page not found</p>
      <p className="mt-2 text-sm text-ink-500">That route doesn’t exist in the console yet.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to Dashboard
      </Link>
    </div>
  )
}

import type { Feedback } from './feedback'
import SupportDetails from './SupportDetails'

export default function ErrorNotice({ error, message }: { error: Feedback; message?: string }) {
  if (!error) return null
  const failure = typeof error === 'string' ? { message: error } : error
  return <div className="workspace-error">
    <p className="rep-action-error" role="alert">{message ?? failure.message}</p>
    {failure.requestId && <SupportDetails key={failure.requestId} requestId={failure.requestId} />}
  </div>
}

import NeuCard from './NeuCard'

export default function SetupNotice() {
  return (
    <NeuCard inset className="max-w-xl">
      <p className="font-medium">Supabase isn't configured yet</p>
      <p className="mt-2 text-sm text-ink-secondary">
        Copy <code>web/.env.example</code> to <code>web/.env.local</code> and fill in your project
        URL and anon key, then restart the dev server. See the project README for full setup steps.
      </p>
    </NeuCard>
  )
}

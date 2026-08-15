export function StewardNameField({
  value,
  onChange,
  onCommit,
}: {
  value: string
  onChange: (name: string) => void
  onCommit: (name: string) => void
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-text-muted">
      Steward:
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit(value)}
        placeholder="Your name"
        className="w-32 rounded-sm border border-border-strong bg-surface px-1 py-0.5 text-text"
        aria-label="Steward name"
      />
    </label>
  )
}

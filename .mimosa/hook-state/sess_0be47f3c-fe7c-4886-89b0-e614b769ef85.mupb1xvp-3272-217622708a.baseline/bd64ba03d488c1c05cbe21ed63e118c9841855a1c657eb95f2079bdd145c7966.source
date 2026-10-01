/** Render teks komentar dengan chip mention @nama (brand-100, design.md §7.3). */
export function renderBodyWithMentions(body: string) {
  const parts = body.split(/(@\w+)/g)
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="rounded-md bg-brand-100 px-1 font-medium text-brand-700">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

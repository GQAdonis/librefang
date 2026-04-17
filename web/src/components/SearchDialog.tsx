import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Sparkles } from 'lucide-react'
import { useRegistry, getLocalizedDesc } from '../useRegistry'
import type { RegistryCategory, Detail } from '../useRegistry'
import { translations, type Translation } from '../i18n'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

interface Hit {
  category: RegistryCategory
  item: Detail
}

const CATEGORIES: RegistryCategory[] = [
  'skills', 'hands', 'agents', 'providers', 'workflows', 'channels', 'plugins', 'mcp', 'integrations',
]

const PER_CATEGORY_CAP = 5

function isPopular(d: Detail) {
  return d.tags?.includes('popular') ?? false
}

function scoreHit(query: string, item: Detail, localizedDesc: string): number {
  const q = query.toLowerCase()
  const id = item.id.toLowerCase()
  const name = item.name.toLowerCase()
  const desc = localizedDesc.toLowerCase()
  const cat = (item.category || '').toLowerCase()
  // Exact id match dominates, then id prefix, then name substring, then desc,
  // then category/tag substring. Popular items get a small tiebreaker.
  if (id === q) return 1000
  if (id.startsWith(q)) return 500
  if (name.toLowerCase().startsWith(q)) return 400
  if (id.includes(q)) return 200
  if (name.includes(q)) return 150
  if (desc.includes(q)) return 50
  if (cat.includes(q)) return 40
  if (item.tags?.some(tag => tag.toLowerCase().includes(q))) return 30
  return 0
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const lang = useAppStore(s => s.lang)
  const t: Translation = translations[lang] || translations['en']!
  const { data } = useRegistry()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flatten all categories into a searchable list.
  const allHits = useMemo<Hit[]>(() => {
    if (!data) return []
    const out: Hit[] = []
    for (const cat of CATEGORIES) {
      for (const item of data[cat] ?? []) out.push({ category: cat, item })
    }
    return out
  }, [data])

  const filtered = useMemo<Hit[]>(() => {
    const q = query.trim()
    if (!q) {
      // No query — show a small sampling of popular items across categories.
      const perCat = new Map<RegistryCategory, number>()
      return allHits
        .filter(h => isPopular(h.item))
        .filter(h => {
          const n = perCat.get(h.category) ?? 0
          if (n >= 3) return false
          perCat.set(h.category, n + 1)
          return true
        })
        .slice(0, 12)
    }
    const scored: { hit: Hit; score: number }[] = []
    for (const h of allHits) {
      const desc = getLocalizedDesc(h.item, lang)
      const s = scoreHit(q, h.item, desc)
      if (s > 0) scored.push({ hit: h, score: s - (isPopular(h.item) ? -2 : 0) })
    }
    scored.sort((a, b) => b.score - a.score)
    // Cap per category so one huge category doesn't crowd out the others.
    const perCat = new Map<RegistryCategory, number>()
    const out: Hit[] = []
    for (const { hit } of scored) {
      const n = perCat.get(hit.category) ?? 0
      if (n >= PER_CATEGORY_CAP) continue
      perCat.set(hit.category, n + 1)
      out.push(hit)
      if (out.length >= 40) break
    }
    return out
  }, [allHits, query, lang])

  // Reset selection when results change.
  useEffect(() => { setActiveIndex(0) }, [query])

  // Focus input + trap Esc when open.
  useEffect(() => {
    if (!open) return
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        const hit = filtered[activeIndex]
        if (hit) {
          e.preventDefault()
          navigate(hit)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, activeIndex])

  const navigate = (hit: Hit) => {
    const prefix = lang === 'en' ? '' : `/${lang}`
    window.location.href = `${prefix}/${hit.category}/${hit.item.id}`
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.search?.title || 'Search registry'}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-black/10 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.search?.placeholder || 'Search skills, hands, agents, providers...'}
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-gray-400 text-sm"
          />
          <button
            onClick={onClose}
            aria-label={t.search?.close || 'Close'}
            className="p-1 text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              {query.trim()
                ? (t.search?.noResults?.replace('{query}', query) || `No matches for "${query}"`)
                : (t.search?.hint || 'Type to search across all registry entries.')}
            </div>
          )}
          {filtered.map((hit, i) => {
            const desc = getLocalizedDesc(hit.item, lang)
            const catLabel = t.registry?.categories[hit.category]?.title || hit.category
            const popular = isPopular(hit.item)
            return (
              <button
                key={`${hit.category}:${hit.item.id}`}
                onClick={() => navigate(hit)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors border-l-2',
                  i === activeIndex
                    ? 'bg-cyan-500/5 border-cyan-500'
                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                {hit.item.icon && (
                  <span className="text-xl leading-none shrink-0" aria-hidden>{hit.item.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {hit.item.name}
                    </span>
                    {popular && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span className="ml-auto text-[10px] font-mono text-gray-400 dark:text-gray-600 uppercase tracking-wider shrink-0">
                      {catLabel}
                    </span>
                  </div>
                  {desc && (
                    <p className="text-xs text-gray-500 line-clamp-1">{desc}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-2 text-[10px] font-mono text-gray-400 dark:text-gray-600 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
          <span>
            {t.search?.kbd || '↑↓ navigate · ↵ open · esc close'}
          </span>
          {data && (
            <span>
              {allHits.length} {t.registry?.total || 'items'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

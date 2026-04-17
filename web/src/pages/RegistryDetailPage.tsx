import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, AlertCircle, ExternalLink, Sparkles, Github, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useRegistry, getLocalizedDesc, getCategoryItems } from '../useRegistry'
import type { RegistryCategory, Detail } from '../useRegistry'
import { translations } from '../i18n'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

interface RegistryDetailPageProps {
  category: RegistryCategory
  id: string
}

const RAW_API = 'https://stats.librefang.ai/api/registry/raw'

// How to resolve a category + id to a file path inside librefang-registry.
// Directory-backed categories (hands/agents/skills) use <UPPER>.toml inside
// <id>/ ; file-backed categories just use <id>.toml at the top level.
function pathFor(category: RegistryCategory, id: string): string {
  switch (category) {
    case 'hands':  return `hands/${id}/HAND.toml`
    case 'agents': return `agents/${id}/AGENT.toml`
    case 'skills': return `skills/${id}/SKILL.toml`
    case 'mcp':    return `mcp/${id}.toml`
    default:       return `${category}/${id}.toml`
  }
}

async function fetchRaw(path: string): Promise<string> {
  const res = await fetch(`${RAW_API}?path=${encodeURIComponent(path)}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${body ? `: ${body}` : ''}`)
  }
  return res.text()
}

function isPopular(item: Detail | undefined) {
  return item?.tags?.includes('popular') ?? false
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors border border-black/10 dark:border-white/10 rounded"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label}
    </button>
  )
}

export default function RegistryDetailPage({ category, id }: RegistryDetailPageProps) {
  const lang = useAppStore(s => s.lang)
  const t = translations[lang] || translations['en']!
  const { data: registry } = useRegistry()

  const { items } = getCategoryItems(registry, category)
  const item = useMemo(() => items.find(x => x.id === id), [items, id])

  const rawPath = pathFor(category, id)
  const rawQuery = useQuery({
    queryKey: ['registry-raw', rawPath],
    queryFn: () => fetchRaw(rawPath),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })

  const baseHref = lang === 'en' ? '/' : `/${lang}/`
  const catHref = lang === 'en' ? `/${category}` : `/${lang}/${category}`
  const categoryLabel = t.registry?.categories[category]?.title || category
  const desc = item ? getLocalizedDesc(item, lang) : ''
  const popular = isPopular(item)

  return (
    <main className="min-h-screen bg-surface">
      <div className="border-b border-black/10 dark:border-white/5 bg-surface-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            <a href={baseHref} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.registry?.backHome || 'Home'}
            </a>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <a href={catHref} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
              {categoryLabel}
            </a>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[180px] md:max-w-none">{item?.name || id}</span>
          </nav>
          <a
            href={`https://github.com/librefang/librefang-registry/blob/main/${rawPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-mono"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <section className="max-w-4xl mx-auto px-6 py-12">
        {/* Header card */}
        <div className={cn(
          'border p-6 md:p-8 mb-8',
          popular ? 'border-amber-500/30 bg-amber-500/5' : 'border-black/10 dark:border-white/5 bg-surface-100'
        )}>
          <div className="flex items-start gap-4 mb-4">
            {item?.icon && (
              <div className="text-4xl leading-none shrink-0" aria-hidden>{item.icon}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {item?.name || id}
                </h1>
                {popular && <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <code className="text-gray-500 dark:text-gray-400">{id}</code>
                {item?.category && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-gray-400 dark:text-gray-600 uppercase tracking-wider">{item.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {desc && (
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-4">
              {desc}
            </p>
          )}

          {item?.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.filter(tag => tag !== 'popular').map(tag => (
                <span key={tag} className="text-xs font-mono text-gray-500 border border-black/10 dark:border-white/10 px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Manifest */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            {t.registry?.manifest || 'Manifest'}
          </h2>
          {rawQuery.data && (
            <CopyButton text={rawQuery.data} label={t.registry?.copy || 'Copy'} />
          )}
        </div>

        {rawQuery.isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">{t.registry?.loading || 'Loading…'}</span>
          </div>
        )}

        {rawQuery.error && !rawQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-5 h-5 text-red-400 mb-2" />
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t.registry?.manifestErrorTitle || 'Could not load manifest'}
            </div>
            <div className="text-xs text-gray-500 max-w-md">
              {(rawQuery.error as Error).message}
            </div>
          </div>
        )}

        {rawQuery.data && (
          <pre className="overflow-x-auto text-xs md:text-sm font-mono leading-relaxed p-5 bg-surface-100 border border-black/10 dark:border-white/5 text-gray-700 dark:text-gray-300 whitespace-pre">
            <code>{rawQuery.data}</code>
          </pre>
        )}

        {/* Back to category */}
        <div className="mt-10 pt-6 border-t border-black/10 dark:border-white/5">
          <a
            href={catHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.registry?.allIn?.replace('{category}', categoryLabel) || `All ${categoryLabel}`}
          </a>
        </div>
      </section>
    </main>
  )
}

import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  Eye,
  EyeOff,
  Save,
  ImagePlus,
  Loader2,
} from 'lucide-react'
import type { MenuCategory, MenuItem } from '../types'
import { createMenuItem, updateMenuItem, deleteMenuItem, uploadImage } from '../api'
import { getIcon } from '../icons'
import { money } from '../utils'
import { toast } from './Toasts'
import DishImage from './DishImage'

const ICON_CHOICES = [
  'Utensils',
  'Croissant',
  'Soup',
  'Salad',
  'Flame',
  'Beef',
  'Fish',
  'Drumstick',
  'Leaf',
  'Cake',
  'IceCream',
  'Cookie',
  'Pizza',
  'Coffee',
  'Martini',
  'Wine',
  'Beer',
  'GlassWater',
  'Egg',
  'Milk',
  'Wheat',
  'UtensilsCrossed',
]

interface Props {
  items: MenuItem[]
  categories: MenuCategory[]
  currency: string
  onChanged: (items: MenuItem[]) => void
}

interface FormState {
  id?: string
  name: string
  description: string
  price: string
  category: string
  icon: string
  image: string
  tags: string
}

const emptyForm = (categories: MenuCategory[]): FormState => ({
  name: '',
  description: '',
  price: '',
  category: categories[0]?.id ?? '',
  icon: 'Utensils',
  image: '',
  tags: '',
})

export default function MenuManager({ items, categories, currency, onChanged }: Props) {
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File | undefined) {
    if (!file || !form) return
    if (file.size > 5 * 1024 * 1024) return toast('Photo must be under 5 MB', 'error')
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => (f ? { ...f, image: url } : f))
      toast('Photo uploaded', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    )
  }, [items, query])

  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {}
    for (const c of categories) g[c.id] = []
    for (const i of filtered) {
      if (!g[i.category]) g[i.category] = []
      g[i.category].push(i)
    }
    return g
  }, [filtered, categories])

  async function save() {
    if (!form) return
    const price = Number(form.price)
    if (!form.name.trim()) return toast('Please enter a dish name', 'error')
    if (!Number.isFinite(price) || price < 0) return toast('Please enter a valid price', 'error')

    setBusy(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Math.round(price),
        category: form.category,
        icon: form.icon,
        image: form.image.trim(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }
      if ((form as any).sidesIncluded !== undefined && (form as any).sidesIncluded !== '' && (form as any).sidesIncluded !== null) {
        payload.sidesIncluded = Number((form as any).sidesIncluded)
      } else if ((form as any).sidesIncluded === null) {
        payload.sidesIncluded = null
      }

      if (form.id) {
        const updated = await updateMenuItem(form.id, payload)
        onChanged(items.map((i) => (i.id === updated.id ? updated : i)))
        toast(`${updated.name} updated`, 'success')
      } else {
        const created = await createMenuItem(payload)
        onChanged([...items, created])
        toast(`${created.name} added to the menu`, 'success')
      }
      setForm(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      const updated = await updateMenuItem(item.id, { available: !item.available })
      onChanged(items.map((i) => (i.id === updated.id ? updated : i)))
      toast(
        `${updated.name} is now ${updated.available ? 'available' : 'hidden'}`,
        'success'
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error')
    }
  }

  async function remove(item: MenuItem) {
    setBusy(true)
    try {
      await deleteMenuItem(item.id)
      onChanged(items.filter((i) => i.id !== item.id))
      toast(`${item.name} removed`, 'success')
      setConfirmDelete(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100 sm:max-w-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={() => setForm(emptyForm(categories))}
          className="btn-primary text-sm"
        >
          <Plus className="h-4 w-4" /> Add dish
        </button>
      </div>

      {/* Grouped list */}
      {categories.map((cat) => {
        const list = grouped[cat.id] ?? []
        if (list.length === 0) return null
        const CatIcon = getIcon(cat.icon)
        return (
          <section key={cat.id} className="mb-7">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <CatIcon className="h-4 w-4" /> {cat.name}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                {list.length}
              </span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((item) => {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={`flex gap-3 rounded-2xl border bg-white p-3 shadow-sm transition ${
                      item.available
                        ? 'border-slate-200 hover:border-slate-300'
                        : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <DishImage
                      src={item.image}
                      icon={item.icon}
                      gradient={item.gradient}
                      alt={item.name}
                      iconSize="h-6 w-6"
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-sm font-bold text-slate-900">{item.name}</h4>
                        <span className="shrink-0 text-sm font-extrabold text-brand-600">
                          {money(currency, item.price)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {item.description || 'No description'}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => setForm({
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            price: String(item.price),
                            category: item.category,
                            icon: item.icon,
                            image: item.image ?? '',
                            tags: item.tags.join(', '),
                            available: item.available,
                            sidesIncluded: (item as any).sidesIncluded,
                          } as any)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            item.available
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {item.available ? (
                            <>
                              <Eye className="h-3 w-3" /> Live
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Hidden
                            </>
                          )}
                        </button>
                        {confirmDelete === item.id ? (
                          <button
                            onClick={() => remove(item)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Check className="h-3 w-3" /> Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {confirmDelete === item.id && (
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Keep
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )
      })}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-500">No dishes match your search.</p>
        </div>
      )}

      {/* Add / Edit modal */}
      <AnimatePresence>
        {form && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForm(null)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForm(null)}
              className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-slate-900">
                      {form.id ? 'Edit dish' : 'Add a new dish'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {form.id ? 'Update the details below' : 'Fill in the details below'}
                    </p>
                  </div>
                  <button
                    onClick={() => setForm(null)}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-4">
                <Field label="Dish name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Chips Mayai"
                    className="input"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="A short, tasty description…"
                    className="input resize-none"
                  />
                </Field>

                <Field label="Included sides (platters)">
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={(form as any).sidesIncluded ?? ''}
                    onChange={(e) =>
                      setForm({ ...(form as any), sidesIncluded: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    placeholder="e.g. 2"
                    className="input"
                  />
                </Field>

                <Field label="Dish photo">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
                    <DishImage
                      src={form.image}
                      icon={form.icon}
                      gradient="from-brand-400 to-brand-600"
                      alt="Dish preview"
                      iconSize="h-6 w-6"
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 ${
                        uploading ? 'opacity-50' : ''
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {uploading ? 'Uploading…' : form.image ? 'Photo ready' : 'Upload a dish photo'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        JPG, PNG, WEBP or GIF · up to 5 MB
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-black active:scale-95 disabled:opacity-50"
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3.5 w-3.5" />
                          )}
                          {form.image ? 'Replace photo' : 'Upload photo'}
                        </button>
                        {form.image && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image: '' })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <Field label={`Price (${currency})`}>
                    <input
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      type="number"
                      min="0"
                      placeholder="e.g. 15000"
                      className="input"
                    />
                  </Field>
                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Icon">
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 sm:gap-2">
                    {ICON_CHOICES.map((name) => {
                      const Icon = getIcon(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setForm({ ...form, icon: name })}
                          title={name}
                          className={`flex aspect-square items-center justify-center rounded-xl border transition ${
                            form.icon === name
                              ? 'border-brand-400 bg-brand-50 text-brand-600 ring-2 ring-brand-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field label="Tags (comma separated)">
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="e.g. Spicy, Popular, Vegetarian"
                    className="input"
                  />
                </Field>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:pb-3.5">
                  <button onClick={() => setForm(null)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button onClick={save} disabled={busy} className="btn-primary flex-1">
                    {busy ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> {form.id ? 'Save changes' : 'Add dish'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

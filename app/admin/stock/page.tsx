'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { RARITIES, FX_EFFECTS, FRAGTRAK_TYPES } from '@/lib/constants'

interface StockItem {
  id: string
  name: string
  type: 'sniper' | 'knife' | 'crate'
  priceUsd: number
  stock: number
  imageUrl?: string
  rarity?: string
  fx?: string
  fragtrak?: string
  active: boolean
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/stock')
      const data = await res.json()
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch stock:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await fetch(`/api/admin/stock/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/admin/stock/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      fetchItems()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'Collectible': return 'text-pink-400'
      case 'Secret': return 'text-cyan-400'
      case 'Epic': return 'text-purple-400'
      case 'Legendary': return 'text-yellow-400'
      case 'Rare': return 'text-blue-400'
      case 'Uncommon': return 'text-green-400'
      case 'Knife': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Stock Management</h1>
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-dark-800/50 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No items yet</h3>
          <p className="text-gray-400 mb-6">Add your first stock item to get started.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Item
          </Button>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Item</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Type</th>
                <th className="hidden md:table-cell px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Rarity</th>
                <th className="hidden md:table-cell px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Extras</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Price</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Stock</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-3 md:px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-dark-600/50">
                  <td className="px-3 md:px-6 py-4">
                    <div className="text-white font-medium">{item.name}</div>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <span className="px-2 py-1 bg-dark-600 rounded text-xs text-gray-300 capitalize">
                      {item.type}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 md:px-6 py-4">
                    <span className={`font-medium ${getRarityColor(item.rarity)}`}>
                      {item.rarity || '-'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 md:px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {item.fx && (
                        <span className="text-xs text-purple-400">FX: {item.fx}</span>
                      )}
                      {item.fragtrak && (
                        <span className="text-xs text-cyan-400">Fragtrak: {item.fragtrak}</span>
                      )}
                      {!item.fx && !item.fragtrak && (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-white font-medium">
                    ${item.priceUsd?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <span className={item.stock > 0 ? 'text-green-500' : 'text-red-500'}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(item.id, item.active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true) }}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && (
        <StockModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
          onSave={() => { setShowModal(false); setEditingItem(null); fetchItems() }}
        />
      )}
    </div>
  )
}

function StockModal({
  item,
  onClose,
  onSave,
}: {
  item: StockItem | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    type: item?.type || 'sniper',
    imageUrl: item?.imageUrl || '',
    priceUsd: item?.priceUsd?.toString() || '',
    stock: item?.stock || 1,
    rarity: item?.rarity || '',
    fx: item?.fx || '',
    fragtrak: item?.fragtrak || '',
    active: item?.active ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = item ? `/api/admin/stock/${item.id}` : '/api/admin/stock'
      const method = item ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        priceUsd: parseFloat(formData.priceUsd) || 0,
        imageUrl: formData.imageUrl || undefined,
        rarity: formData.rarity || undefined,
        fx: formData.fx || undefined,
        fragtrak: formData.fragtrak || undefined,
      }

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      onSave()
    } catch (error) {
      console.error('Failed to save item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800/50 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">
          {item ? 'Edit Item' : 'Add New Item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="sniper">Sniper</option>
                <option value="knife">Knife</option>
                <option value="crate">Crate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Rarity</label>
              <select
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="">None</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Image URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.png"
              className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceUsd}
                  onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Stock *</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <div className="border-t border-dark-700 pt-4 mt-4">
            <p className="text-sm text-gray-400 mb-3">Optional Extras</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">FX Effect</label>
                <select
                  value={formData.fx}
                  onChange={(e) => setFormData({ ...formData, fx: e.target.value })}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                >
                  <option value="">None</option>
                  {FX_EFFECTS.map((fx) => (
                    <option key={fx} value={fx}>{fx}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Fragtrak</label>
                <select
                  value={formData.fragtrak}
                  onChange={(e) => setFormData({ ...formData, fragtrak: e.target.value })}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                >
                  <option value="">None</option>
                  {FRAGTRAK_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 rounded border-dark-500 bg-dark-600 text-accent focus:ring-accent"
            />
            <label htmlFor="active" className="text-gray-300">Active (visible in shop)</label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

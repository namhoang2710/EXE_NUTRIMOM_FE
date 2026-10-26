import { NutritionButton, NutritionLoading } from './NutritionUI'
import { useId, useState } from 'react'
import { useEffect } from 'react'
import { nutritionApi } from '../api/nutrition-api'
import type { IngredientOption } from '../model/nutrition-types'
import { NutritionError } from './NutritionShared'

export function IngredientPicker({
  label,
  selected,
  onChange,
  forbidden = [],
}: {
  label: string
  selected: string[]
  onChange: (ids: string[]) => void
  forbidden?: string[]
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<IngredientOption[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void nutritionApi
        .ingredients(query, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setOptions(items)
            setNames((current) => ({
              ...current,
              ...Object.fromEntries(
                items.map((item) => [item.id, item.canonical_name]),
              ),
            }))
          }
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) setError(reason)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])
  return (
    <fieldset className="nutrition-fieldset">
      <legend>{label}</legend>
      <label htmlFor={id}>Tìm nguyên liệu trong danh mục</label>
      <input
        id={id}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ví dụ: tôm, đậu…"
        maxLength={100}
      />
      <div className="nutrition-chips">
        {selected.map((value) => (
          <NutritionButton
            type="button"
            className="is-selected"
            key={value}
            onClick={() => onChange(selected.filter((item) => item !== value))}
          >
            {names[value] || 'Nguyên liệu đã lưu'} ×
            <span className="sr-only"> Bỏ chọn</span>
          </NutritionButton>
        ))}
      </div>
      {loading && <NutritionLoading label="Đang tìm nguyên liệu…" />}
      <NutritionError error={error} />
      <div className="nutrition-picker-options">
        {options
          .filter((option) => !selected.includes(option.id))
          .map((option) => (
            <NutritionButton
              type="button"
              key={option.id}
              disabled={forbidden.includes(option.id)}
              onClick={() => onChange([...selected, option.id])}
            >
              {option.canonical_name}
              {option.allergen_status === 'UNKNOWN' && (
                <small>Chưa rõ thành phần gây dị ứng</small>
              )}
            </NutritionButton>
          ))}
      </div>
    </fieldset>
  )
}

import type { ExerciseRow, SpringCounts } from './types'

const SPRING_COLORS = [
  { key: 'red', label: '红色' },
  { key: 'green', label: '绿色' },
  { key: 'yellow', label: '黄色' },
  { key: 'blue', label: '蓝色' },
] as const

export type SpringInput = Record<keyof SpringCounts, string>

export function springInputFrom(counts?: SpringCounts | null): SpringInput {
  return { red: counts ? String(counts.red) : '', green: counts ? String(counts.green) : '', yellow: counts ? String(counts.yellow) : '', blue: counts ? String(counts.blue) : '' }
}

export function parseSpringInput(input: SpringInput): SpringCounts | null {
  if (SPRING_COLORS.every(({ key }) => input[key].trim() === '')) return null
  const counts = { red: 0, green: 0, yellow: 0, blue: 0 }
  for (const { key, label } of SPRING_COLORS) {
    const count = Number(input[key])
    if (!Number.isInteger(count) || count < 0 || count > 20) throw new Error(`${label}弹簧组数请输入 0 至 20 的整数`)
    counts[key] = count
  }
  return counts
}

export function SpringSummary({ exercise }: { exercise: Pick<ExerciseRow, 'springCounts' | 'springSets'> }) {
  if (!exercise.springCounts) return <>{exercise.springSets?.length ? exercise.springSets.map(count => `${count} 组`).join('、') : '未配置'}</>
  const configured = SPRING_COLORS.filter(({ key }) => exercise.springCounts![key] > 0)
  return configured.length ? <span className="spring-summary">{configured.map(({ key, label }) => <span className="spring-summary-item" key={key}><i className={`spring-color-dot spring-color-${key}`} aria-hidden="true" />{label} {exercise.springCounts![key]} 组</span>)}</span> : <>无需弹簧</>
}

export function SpringCountsInput({ value, onChange, legacySets = [] }: { value: SpringInput; onChange: (next: SpringInput) => void; legacySets?: number[] }) {
  const hasValue = SPRING_COLORS.some(({ key }) => value[key] !== '') || legacySets.length > 0
  return <fieldset className="spring-counts-fieldset" aria-describedby="spring-counts-hint">
    <legend>建议弹簧组数</legend>
    <p id="spring-counts-hint" className="spring-counts-hint">按颜色填写 0 至 20 组，不使用填 0；全部留空为未配置。</p>
    <div className="spring-counts-grid">{SPRING_COLORS.map(({ key, label }) => <label className="field spring-count-field" key={key}>
      <span><span><i className={`spring-color-dot spring-color-${key}`} aria-hidden="true" />{label}</span></span>
      <span className="spring-count-control"><input aria-label={`${label}弹簧组数`} type="number" min={0} max={20} step={1} inputMode="numeric" placeholder="0" value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} /><span className="spring-count-unit" aria-hidden="true">组</span></span>
    </label>)}</div>
    {legacySets.length > 0 && <p className="spring-counts-hint spring-legacy-hint">原建议：{legacySets.map(count => `${count} 组`).join('、')}，尚未区分颜色。填写后将替换原建议。</p>}
    {hasValue && <button type="button" className="spring-clear-button" onClick={() => onChange(springInputFrom(null))}>清空弹簧配置</button>}
  </fieldset>
}

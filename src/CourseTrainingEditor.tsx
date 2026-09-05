import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react'
import { api } from './api'
import type { CourseExercise, ExerciseRow, PageResult, TrainingSet } from './types'

export function CourseTrainingEditor({ value, onChange }: { value: CourseExercise[]; onChange: (items: CourseExercise[]) => void }) {
  const [library, setLibrary] = useState<ExerciseRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      const items: ExerciseRow[] = []
      for (let page = 1; ; page++) {
        const result = await api<PageResult<ExerciseRow>>(`/exercises?page=${page}&pageSize=100`)
        items.push(...result.items)
        if (items.length >= result.total || !result.items.length) break
      }
      if (active) setLibrary(items)
    }
    load().catch(reason => { if (active) setError(reason.message || '动作库加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function changeSets(index: number, sets: TrainingSet[]) {
    onChange(value.map((item, i) => i === index ? { ...item, sets } : item))
  }
  function changeSet(index: number, setIndex: number, key: keyof TrainingSet, next: string | number) {
    changeSets(index, value[index].sets.map((set, i) => i === setIndex ? { ...set, [key]: next } : set))
  }
  function move(index: number, delta: number) {
    const items = [...value]
    ;[items[index], items[index + delta]] = [items[index + delta], items[index]]
    onChange(items)
  }
  const available = library.filter(item => !value.some(selected => selected.exerciseId === item.id) && `${item.name} ${item.bodyPart}`.includes(query.trim()))
  return <div className="course-training-editor">
    {value.map((item, index) => {
      const exercise = library.find(row => row.id === item.exerciseId)
      return <section className="course-training-action" key={item.exerciseId}>
        <div className="course-training-action-heading"><strong>{String(index + 1).padStart(2, '0')} {exercise?.name || `动作 #${item.exerciseId}`}</strong><span>{item.sets.length} 组</span><div className="row-actions">
          <button type="button" className="icon-button" title="上移动作" aria-label="上移动作" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
          <button type="button" className="icon-button" title="下移动作" aria-label="下移动作" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
          <button type="button" className="icon-button" title="移除动作" aria-label="移除动作" onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
        </div></div>
        {exercise?.status !== 'PUBLISHED' && exercise && <p className="form-error">该动作尚未发布，小程序暂不可见。</p>}
        <div className="course-training-sets">{item.sets.map((set, setIndex) => <div className="course-training-set" key={setIndex}>
          <span className="course-set-number">第 {setIndex + 1} 组</span>
          <label>侧别<select aria-label={`动作${index + 1}第${setIndex + 1}组侧别`} value={set.side} onChange={event => changeSet(index, setIndex, 'side', event.target.value)}>{['双侧', '左侧', '右侧'].map(side => <option key={side}>{side}</option>)}</select></label>
          <label>时长（秒）<input required type="number" min={1} max={3600} value={set.durationSeconds} onChange={event => changeSet(index, setIndex, 'durationSeconds', Number(event.target.value))} /></label>
          <label>推荐次数<input required type="number" min={0} max={999} value={set.repetitions} onChange={event => changeSet(index, setIndex, 'repetitions', Number(event.target.value))} /></label>
          <label>弹簧（组）<input required type="number" min={0} max={12} value={set.springCount} onChange={event => changeSet(index, setIndex, 'springCount', Number(event.target.value))} /></label>
          <button type="button" className="icon-button" title="删除本组" aria-label="删除本组" disabled={item.sets.length === 1} onClick={() => changeSets(index, item.sets.filter((_, i) => i !== setIndex))}><Trash2 size={16} /></button>
        </div>)}</div>
        <button type="button" className="button secondary small" disabled={item.sets.length >= 50} onClick={() => changeSets(index, [...item.sets, { ...(item.sets.at(-1) || { side: '双侧', durationSeconds: 60, repetitions: 0, springCount: 0 }) }])}><Plus size={15} />添加一组</button>
      </section>
    })}
    <div className="course-library-search"><Search size={17} /><input aria-label="搜索动作库" placeholder="搜索动作名称或部位" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="course-library-list">{available.map(item => <button type="button" key={item.id} disabled={value.length >= 100} onClick={() => onChange([...value, { exerciseId: item.id, sets: Array.from({ length: Math.max(1, Math.min(50, item.suggestedSets || 1)) }, () => ({ side: '双侧', durationSeconds: 60, repetitions: 0, springCount: item.springSets?.[0] || 0 })) }])}><span><strong>{item.name}</strong><small>{item.bodyPart} · {item.status === 'PUBLISHED' ? '已发布' : '未发布'}</small></span><Plus size={17} /></button>)}</div>
    {loading && <p className="muted">正在加载动作库…</p>}
    {!loading && !error && !available.length && <p className="muted">没有可添加的匹配动作</p>}
  </div>
}

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, Dumbbell, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { api, mediaUrl } from './api'
import { exerciseCategoryLabel } from './exerciseCategories'
import type { CourseExercise, ExerciseRow, PageResult, TrainingSet } from './types'

function ActionCover({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <span className="course-action-cover">
    {src && !failed ? <img src={mediaUrl(src)} alt={`${name}封面`} onError={() => setFailed(true)} /> : <span className="course-action-cover-empty"><Dumbbell size={20} /><small>{failed ? '加载失败' : '暂无封面'}</small></span>}
  </span>
}

export function CourseTrainingEditor({ value, onChange }: { value: CourseExercise[]; onChange: (items: CourseExercise[]) => void }) {
  const [library, setLibrary] = useState<ExerciseRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [attempt, setAttempt] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
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
  }, [attempt])
  useEffect(() => { if (open) searchRef.current?.focus() }, [open])
  useEffect(() => { if (open) pickerRef.current?.scrollIntoView({ block: 'nearest' }) }, [open, loading])
  useEffect(() => { if (activeIndex >= 0) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' }) }, [activeIndex, listId])
  function changeSets(index: number, sets: TrainingSet[]) {
    onChange(value.map((item, i) => i === index ? { ...item, sets } : item))
  }
  function changeSet(index: number, setIndex: number, key: keyof TrainingSet, next: string | number | null) {
    changeSets(index, value[index].sets.map((set, i) => i === setIndex ? { ...set, [key]: next } : set))
  }
  function move(index: number, delta: number) {
    const items = [...value]
    ;[items[index], items[index + delta]] = [items[index + delta], items[index]]
    onChange(items)
  }
  const matches = library.filter(item => `${item.name} ${exerciseCategoryLabel(item.bodyPart)} ${item.bodyPart} ${item.level}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = (id: number) => value.some(item => item.exerciseId === id)
  const close = () => { setOpen(false); setQuery(''); setActiveIndex(-1) }
  function add(item: ExerciseRow) {
    if (selected(item.id) || value.length >= 100) return
    onChange([...value, { exerciseId: item.id, sets: Array.from({ length: Math.max(1, Math.min(50, item.suggestedSets || 1)) }, () => ({ side: '双侧', repetitions: null, springCount: item.springSets?.[0] || 0 })) }])
    close(); triggerRef.current?.focus()
  }
  return <div className="course-training-editor">
    {value.map((item, index) => {
      const exercise = library.find(row => row.id === item.exerciseId)
      return <section className="course-training-action" key={item.exerciseId}>
        <div className="course-training-action-heading"><div className="course-training-action-identity"><ActionCover src={exercise?.coverImage} name={exercise?.name || `动作 #${item.exerciseId}`} /><strong>{String(index + 1).padStart(2, '0')} {exercise?.name || `动作 #${item.exerciseId}`}</strong></div><span>{item.sets.length} 组</span><div className="row-actions">
          <button type="button" className="icon-button" title="上移动作" aria-label="上移动作" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
          <button type="button" className="icon-button" title="下移动作" aria-label="下移动作" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
          <button type="button" className="icon-button" title="移除动作" aria-label="移除动作" onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
        </div></div>
        {exercise?.status !== 'PUBLISHED' && exercise && <p className="form-error">该动作尚未发布，小程序暂不可见。</p>}
        {exercise && !exercise.videoUrl && <p className="form-error">该动作缺少示范视频，请在动作管理中配置后再发布课程。</p>}
        <label className="course-recommended-plays">建议次数<input aria-label={`动作${index + 1}建议次数`} type="number" min={1} max={999} step={1} value={item.recommendedPlays ?? ''} onChange={event => onChange(value.map((entry, i) => i === index ? { ...entry, recommendedPlays: event.target.value === '' ? null : Number(event.target.value) } : entry))} /><small>仅作建议展示，不改变下方训练组数。</small></label>
        <div className="course-training-sets">{item.sets.map((set, setIndex) => <div className="course-training-set" key={setIndex}>
          <span className="course-set-number">第 {setIndex + 1} 组</span>
          <label>侧别<select aria-label={`动作${index + 1}第${setIndex + 1}组侧别`} value={set.side} onChange={event => changeSet(index, setIndex, 'side', event.target.value)}>{['双侧', '左侧', '右侧'].map(side => <option key={side}>{side}</option>)}</select></label>
          <label>次数<input aria-label={`动作${index + 1}第${setIndex + 1}组次数`} required type="number" min={1} max={999} step={1} value={set.repetitions || ''} onChange={event => changeSet(index, setIndex, 'repetitions', event.target.value === '' ? null : Number(event.target.value))} /></label>
          <label>弹簧（组）<input required type="number" min={0} max={12} value={set.springCount} onChange={event => changeSet(index, setIndex, 'springCount', Number(event.target.value))} /></label>
          <button type="button" className="icon-button" title="删除本组" aria-label="删除本组" disabled={item.sets.length === 1} onClick={() => changeSets(index, item.sets.filter((_, i) => i !== setIndex))}><Trash2 size={16} /></button>
        </div>)}</div>
        <button type="button" className="button secondary small" disabled={item.sets.length >= 50} onClick={() => changeSets(index, [...item.sets, { ...(item.sets.at(-1) || { side: '双侧', repetitions: null, springCount: 0 }) }])}><Plus size={15} />添加一组</button>
      </section>
    })}
    <div ref={pickerRef} className="course-exercise-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close() }}>
      <div className="course-picker-heading"><strong>添加动作</strong><span>{value.length} / 100</span></div>
      <button ref={triggerRef} type="button" className={`course-picker-trigger${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" disabled={value.length >= 100} onClick={() => { if (open) close(); else setOpen(true) }}><Plus size={18} /><span>{value.length >= 100 ? '已达到动作数量上限' : '选择动作'}</span><ChevronDown size={17} /></button>
      {open && <div className="course-picker-dropdown">
        <div className="course-library-search"><Search size={17} /><input ref={searchRef} role="combobox" aria-label="搜索动作库" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} placeholder="搜索名称、类型或难度" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(-1) }} onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus() }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const indexes = matches.map((item, index) => selected(item.id) ? -1 : index).filter(index => index >= 0)
            if (indexes.length) { const position = indexes.indexOf(activeIndex), next = event.key === 'ArrowDown' ? (position + 1) % indexes.length : (position <= 0 ? indexes.length - 1 : position - 1); setActiveIndex(indexes[next]) }
          }
          if (event.key === 'Enter') { event.preventDefault(); if (activeIndex >= 0 && matches[activeIndex]) add(matches[activeIndex]) }
        }} /></div>
        <div className="course-library-list" id={listId} role="listbox" aria-label="动作库" aria-busy={loading}>
          {!loading && !error && matches.map((item, index) => <button type="button" role="option" aria-selected={selected(item.id)} aria-disabled={selected(item.id)} tabIndex={-1} id={`${listId}-${index}`} key={item.id} className={activeIndex === index ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => add(item)}>
            <span className="course-option-image">{item.coverImage ? <img src={mediaUrl(item.coverImage)} alt="" onError={event => { event.currentTarget.style.display = 'none' }} /> : null}<Dumbbell size={20} /></span>
            <span className="course-option-copy"><strong>{item.name}</strong><small>{[exerciseCategoryLabel(item.bodyPart), item.level].filter(Boolean).join(' · ')}</small></span>
            <span className={`course-option-status${item.status === 'PUBLISHED' ? '' : ' is-draft'}`}>{selected(item.id) ? <><Check size={14} />已添加</> : item.status === 'PUBLISHED' ? '已发布' : item.status === 'ARCHIVED' ? '已下架' : '草稿'}</span>
          </button>)}
        </div>
        {loading && <div className="course-picker-state" role="status"><LoaderCircle className="spin" size={18} />正在加载动作库</div>}
        {error && <div className="course-picker-state" role="alert"><span>{error}</span><button type="button" className="button secondary small" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={14} />重试</button></div>}
        {!loading && !error && !matches.length && <div className="course-picker-state">{query ? '没有匹配的动作' : '动作库暂无动作'}</div>}
      </div>}
    </div>
  </div>
}

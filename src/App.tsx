import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight,
  ClipboardList, Dumbbell, FileClock, Flag, Image as ImageIcon, LayoutDashboard, LoaderCircle,
  Download, LogOut, Menu, MessageSquareText, MoreHorizontal, Pencil, Plus, QrCode, RefreshCw, Search,
  ShieldCheck, Tags, Trash2, Upload, UserRound, UsersRound, Video, X,
} from 'lucide-react'
import { api, apiBlob, downloadMedia, getToken, json, mediaUrl, setToken, uploadMedia } from './api'
import type {
  AuditRow, CampaignRow, CourseRow, Dashboard, DeviceModelRow, DeviceRow, ExerciseRow, FeedbackRow, PageResult,
  PlanItem, PlanRow, Status, UserRow, WorkoutRow,
} from './types'

type RouteKey = 'dashboard' | 'users' | 'courses' | 'exercises' | 'plans' | 'campaigns' | 'devices' | 'device-models' | 'workouts' | 'feedback' | 'audits'

const ROUTES: { key: RouteKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: '数据概览', icon: LayoutDashboard },
  { key: 'users', label: '用户管理', icon: UsersRound },
  { key: 'courses', label: '课程管理', icon: BookOpen },
  { key: 'exercises', label: '动作管理', icon: Dumbbell },
  { key: 'plans', label: '训练计划', icon: CalendarDays },
  { key: 'campaigns', label: '训练营', icon: Flag },
  { key: 'devices', label: '设备管理', icon: Activity },
  { key: 'device-models', label: '设备型号', icon: Tags },
  { key: 'workouts', label: '训练记录', icon: ClipboardList },
  { key: 'feedback', label: '问题反馈', icon: MessageSquareText },
  { key: 'audits', label: '操作日志', icon: FileClock },
]

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已下架',
  ACTIVE: '正常', INACTIVE: '停用', SUBMITTED: '待处理', PROCESSING: '处理中', RESOLVED: '已解决',
  BOUND: '已绑定', UNBOUND: '未绑定',
}

const formatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

function formatDate(value?: string) {
  return value ? formatter.format(new Date(value)) : '未记录'
}

function routeFromHash(): RouteKey {
  const hash = window.location.hash.replace('#/', '') as RouteKey
  return ROUTES.some((item) => item.key === hash) ? hash : 'dashboard'
}

export default function App() {
  const [token, setAuthToken] = useState(getToken())
  const [route, setRoute] = useState<RouteKey>(routeFromHash())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [username, setUsername] = useState('管理员')

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); setSidebarOpen(false) }
    const onExpired = () => setAuthToken(null)
    window.addEventListener('hashchange', onHash)
    window.addEventListener('admin-session-expired', onExpired)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('admin-session-expired', onExpired)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    api<{ username: string }>('/me').then((profile) => setUsername(profile.username)).catch(() => undefined)
  }, [token])

  if (!token) return <LoginPage onLogin={(next) => { setToken(next); setAuthToken(next) }} />

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* local logout still succeeds */ }
    setToken(null)
    setAuthToken(null)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="后台导航">
        <div className="brand">
          <span className="brand-mark"><Activity size={18} strokeWidth={2.4} /></span>
          <span><strong>ARVELLO</strong><small>管理后台</small></span>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="关闭导航"><X size={20} /></button>
        </div>
        <nav className="nav-list">
          {ROUTES.map((item) => {
            const Icon = item.icon
            return <a key={item.key} className={route === item.key ? 'nav-item active' : 'nav-item'} href={`#/${item.key}`}>
              <Icon size={19} /><span>{item.label}</span>
              {item.key === 'feedback' && <span className="nav-dot" aria-label="可能有待处理反馈" />}
            </a>
          })}
        </nav>
        <div className="sidebar-profile">
          <span className="avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
          <span className="profile-copy"><strong>{username}</strong><small>管理员</small></span>
          <button className="icon-button dark" onClick={logout} aria-label="退出登录" title="退出登录"><LogOut size={18} /></button>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭导航" />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="打开导航"><Menu size={21} /></button>
          <div className="topbar-context"><span>ARVELLO</span><ChevronRight size={14} /><strong>{ROUTES.find((item) => item.key === route)?.label}</strong></div>
          <div className="system-status"><span />系统运行正常</div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {route === 'dashboard' && <DashboardPage />}
          {route === 'users' && <UsersPage />}
          {route === 'courses' && <CoursesPage />}
          {route === 'exercises' && <ExercisesPage />}
          {route === 'plans' && <PlansPage />}
          {route === 'campaigns' && <CampaignsPage />}
          {route === 'devices' && <DevicesPage />}
          {route === 'device-models' && <DeviceModelsPage />}
          {route === 'workouts' && <WorkoutsPage />}
          {route === 'feedback' && <FeedbackPage />}
          {route === 'audits' && <AuditsPage />}
        </main>
      </div>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api<{ token: string }>('/auth/login', json('POST', { username, password }))
      onLogin(result.token)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法登录，请稍后重试')
    } finally { setBusy(false) }
  }

  return <main className="login-page">
    <section className="login-brand" aria-label="ARVELLO 管理后台介绍">
      <div className="login-brand-inner">
        <span className="brand-mark large"><Activity size={28} /></span>
        <p className="eyebrow">ARVELLO 管理后台</p>
        <h1>让每一节训练内容，都清楚而可靠。</h1>
        <p>统一维护课程、动作、计划和训练营，所有发布内容都会同步服务于小程序用户。</p>
        <div className="login-proof"><ShieldCheck size={20} /><span><strong>独立后台身份</strong><small>管理员会话与小程序用户完全隔离</small></span></div>
      </div>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={submit}>
        <div><p className="eyebrow">欢迎回来</p><h2>登录管理后台</h2><p className="muted">使用服务器配置的管理员账号。</p></div>
        <label>管理员账号<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
        <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button primary wide" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={18} />正在登录</> : '登录后台'}</button>
        <p className="login-help">无法登录时，请检查服务器中的 ADMIN_USERNAME 与 ADMIN_PASSWORD 配置。</p>
      </form>
    </section>
  </main>
}

function DashboardPage() {
  const { data, loading, error, reload } = useResource<Dashboard>('/dashboard')
  const max = Math.max(...(data?.workoutTrend.map((item) => item.count) || [1]), 1)
  const metrics = [
    ['用户总数', data?.userCount ?? 0, `本周新增 ${data?.weeklyNewUsers ?? 0}`],
    ['本周训练次数', data?.weeklyWorkoutCount ?? 0, '过去 7 天'],
    ['课程总数', data?.courseCount ?? 0, '包含草稿和下架'],
    ['待处理反馈', data?.pendingFeedbackCount ?? 0, '需要管理员关注'],
  ]

  return <Page title="数据概览" description="查看内容与用户的最新运行状态。" action={<RefreshButton onClick={reload} loading={loading} />}>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    {loading && !data ? <DashboardSkeleton /> : data && <>
      <section className="status-strip" aria-label="核心数据">
        <div className="health-cell"><span className="health-icon"><Check size={18} /></span><span><strong>系统运行正常</strong><small>数据刚刚更新</small></span></div>
        {metrics.map(([label, value, note]) => <div className="metric-cell" key={String(label)}>
          <small>{label}</small><strong>{Number(value).toLocaleString('zh-CN')}</strong><span>{note}</span>
        </div>)}
      </section>
      <div className="dashboard-grid">
        <section className="surface trend-panel">
          <div className="section-heading"><div><p className="eyebrow">过去 7 天</p><h2>训练趋势</h2></div><BarChart3 size={20} /></div>
          <div className="bar-chart" role="img" aria-label="最近七天训练次数柱状图">
            {data.workoutTrend.map((item) => <div className="bar-column" key={item.date}>
              <span className="bar-value">{item.count}</span>
              <span className="bar-track"><span className="bar-fill" style={{ height: `${Math.max(6, item.count / max * 100)}%` }} /></span>
              <small>{new Date(`${item.date}T00:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' })}</small>
            </div>)}
          </div>
        </section>
        <section className="surface attention-panel">
          <div className="section-heading"><div><p className="eyebrow">现在</p><h2>待处理事项</h2></div><ClipboardList size={20} /></div>
          <a className="attention-row" href="#/feedback"><span className="attention-icon warning"><MessageSquareText size={18} /></span><span><strong>问题反馈</strong><small>待处理或处理中</small></span><b>{data.pendingFeedbackCount}</b><ChevronRight size={17} /></a>
          <a className="attention-row" href="#/courses"><span className="attention-icon"><BookOpen size={18} /></span><span><strong>课程内容</strong><small>检查草稿与发布状态</small></span><b>{data.recentContent.filter((item) => item.kind === 'COURSE' && item.status === 'DRAFT').length}</b><ChevronRight size={17} /></a>
          <a className="attention-row" href="#/campaigns"><span className="attention-icon"><Flag size={18} /></span><span><strong>训练营</strong><small>维护活动日期与规则</small></span><ChevronRight size={17} /></a>
        </section>
      </div>
      <section className="surface recent-panel">
        <div className="section-heading"><div><p className="eyebrow">内容动态</p><h2>最近更新</h2></div><a className="text-link" href="#/courses">管理课程 <ChevronRight size={15} /></a></div>
        <Table>
          <thead><tr><th>内容</th><th>类型</th><th>状态</th><th>更新时间</th></tr></thead>
          <tbody>{data.recentContent.map((item) => <tr key={`${item.kind}-${item.id}`}><td className="cell-title">{item.title}</td><td>{item.kind === 'COURSE' ? '课程' : '动作'}</td><td><Badge status={item.status} /></td><td>{formatDate(item.updatedAt)}</td></tr>)}</tbody>
        </Table>
      </section>
    </>}
  </Page>
}

function UsersPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const path = `/users?query=${encodeURIComponent(search)}&page=${page}&pageSize=20`
  const { data, loading, error, reload } = useResource<PageResult<UserRow>>(path)
  return <Page title="用户管理" description="用户数据仅供查询，后台不会代替用户修改训练内容。">
    <Toolbar onSubmit={() => { setSearch(query); setPage(1) }} query={query} setQuery={setQuery} placeholder="搜索昵称或手机号" onRefresh={reload} loading={loading} />
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有用户" emptyHint="用户完成小程序登录后会出现在这里。">
      <Table><thead><tr><th>用户</th><th>手机号</th><th>训练次数</th><th>累计时长</th><th>状态</th><th>注册时间</th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td><div className="user-cell">{item.avatarUrl ? <img src={mediaUrl(item.avatarUrl)} alt="" /> : <span className="mini-avatar">{(item.nickname || '用').slice(0, 1)}</span>}<span><strong>{item.nickname || `用户 ${item.id}`}</strong><small>ID {item.id}</small></span></div></td><td>{item.phone || '未绑定'}</td><td>{item.workoutCount}</td><td>{item.totalMinutes} 分钟</td><td><Badge status={item.status} /></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
  </Page>
}

function CoursesPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<CourseRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CourseRow | null>(null)
  const path = `/courses?query=${encodeURIComponent(search)}&status=${status}&page=${page}&pageSize=20`
  const { data, loading, error, reload } = useResource<PageResult<CourseRow>>(path)
  const remove = async () => {
    if (!deleting) return
    await api(`/courses/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null); reload()
  }
  return <Page title="课程管理" description="创建课程、编排动作，并上传课程封面与训练视频。" action={<button className="button primary" onClick={() => setEditing('new')}><Plus size={17} />新增课程</button>}>
    <Toolbar onSubmit={() => { setSearch(query); setPage(1) }} query={query} setQuery={setQuery} placeholder="搜索课程" onRefresh={reload} loading={loading}>
      <StatusSelect value={status} onChange={(value) => { setStatus(value); setPage(1) }} />
    </Toolbar>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有课程" emptyHint="创建第一节课程，上传封面和视频后即可发布。">
      <Table><thead><tr><th>课程</th><th>类型</th><th>难度</th><th>时长</th><th>动作数</th><th>状态</th><th>更新时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td><div className="content-cell"><MediaThumbnail src={item.coverImage} label={item.title} icon="image" /><span><strong>{item.title}</strong><small>{item.equipment}</small></span></div></td><td>{item.type}</td><td>{item.level}</td><td>{item.durationMinutes} 分钟</td><td>{item.exerciseIds.length}</td><td><Badge status={item.status} /></td><td>{formatDate(item.updatedAt)}</td><td><RowActions onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} /></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
    {editing && <CourseEditor value={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <ConfirmDialog open={!!deleting} title="删除课程？" message={deleting ? `“${deleting.title}”删除后无法恢复。已被训练记录或计划使用的课程不会被删除。` : ''} confirmLabel="删除课程" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ExerciseRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ExerciseRow | null>(null)
  const path = `/exercises?query=${encodeURIComponent(search)}&status=${status}&page=${page}&pageSize=20`
  const { data, loading, error, reload } = useResource<PageResult<ExerciseRow>>(path)
  const remove = async () => {
    if (!deleting) return
    await api(`/exercises/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null); reload()
  }
  return <Page title="动作管理" description="维护动作要领、安全提示和训练媒体。" action={<button className="button primary" onClick={() => setEditing('new')}><Plus size={17} />新增动作</button>}>
    <Toolbar onSubmit={() => { setSearch(query); setPage(1) }} query={query} setQuery={setQuery} placeholder="搜索动作" onRefresh={reload} loading={loading}><StatusSelect value={status} onChange={setStatus} /></Toolbar>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有动作" emptyHint="创建动作后，可以把它编排到课程中。">
      <Table><thead><tr><th>动作</th><th>部位</th><th>难度</th><th>建议组数</th><th>目标</th><th>状态</th><th>更新时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td><div className="content-cell"><MediaThumbnail src={item.coverImage} label={item.name} icon="exercise" /><span><strong>{item.name}</strong><small>{item.equipment}</small></span></div></td><td>{item.bodyPart}</td><td>{item.level}</td><td>{item.suggestedSets}</td><td>{item.target}</td><td><Badge status={item.status} /></td><td>{formatDate(item.updatedAt)}</td><td><RowActions onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} /></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
    {editing && <ExerciseEditor value={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <ConfirmDialog open={!!deleting} title="删除动作？" message={deleting ? `“${deleting.name}”删除后无法恢复。已被课程使用的动作不会被删除。` : ''} confirmLabel="删除动作" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function PlansPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<PlanRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<PlanRow | null>(null)
  const { data, loading, error, reload } = useResource<PageResult<PlanRow>>(`/plans?query=${encodeURIComponent(search)}&page=1&pageSize=50`)
  const remove = async () => { if (deleting) { await api(`/plans/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); reload() } }
  return <Page title="训练计划" description="组合课程并安排训练日，停用计划不会影响历史记录。" action={<button className="button primary" onClick={() => setEditing('new')}><Plus size={17} />新增计划</button>}>
    <Toolbar onSubmit={() => setSearch(query)} query={query} setQuery={setQuery} placeholder="搜索训练计划" onRefresh={reload} loading={loading} />
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有训练计划" emptyHint="创建计划并安排每周课程。">
      <Table><thead><tr><th>计划</th><th>周期</th><th>每周训练</th><th>课程安排</th><th>状态</th><th>更新时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td className="cell-title">{item.title}</td><td>第 {item.weekNumber} 周</td><td>{item.sessionsPerWeek} 次</td><td>{item.items.length} 节</td><td><Badge status={item.active ? 'PUBLISHED' : 'ARCHIVED'} /></td><td>{formatDate(item.updatedAt)}</td><td><RowActions onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} /></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {editing && <PlanEditor value={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <ConfirmDialog open={!!deleting} title="删除训练计划？" message={deleting ? `“${deleting.title}”删除后无法恢复，已有用户选择时将无法删除。` : ''} confirmLabel="删除计划" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function CampaignsPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CampaignRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CampaignRow | null>(null)
  const { data, loading, error, reload } = useResource<PageResult<CampaignRow>>(`/campaigns?query=${encodeURIComponent(search)}&page=1&pageSize=50`)
  const remove = async () => { if (deleting) { await api(`/campaigns/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); reload() } }
  return <Page title="训练营" description="维护活动名称、开放日期、规则和发布状态。" action={<button className="button primary" onClick={() => setEditing('new')}><Plus size={17} />新增训练营</button>}>
    <Toolbar onSubmit={() => setSearch(query)} query={query} setQuery={setQuery} placeholder="搜索名称或活动代码" onRefresh={reload} loading={loading} />
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有训练营" emptyHint="创建训练营，发布后用户即可查看和打卡。">
      <Table><thead><tr><th>训练营</th><th>活动代码</th><th>开放日期</th><th>累计打卡</th><th>状态</th><th>更新时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td className="cell-title">{item.title}</td><td><code>{item.code}</code></td><td>{item.startDate || '不限'} 至 {item.endDate || '不限'}</td><td>{item.checkinCount}</td><td><Badge status={item.status} /></td><td>{formatDate(item.updatedAt)}</td><td><RowActions onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} /></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {editing && <CampaignEditor value={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <ConfirmDialog open={!!deleting} title="删除训练营？" message={deleting ? `“${deleting.title}”已有打卡记录时无法删除，可以改为下架。` : ''} confirmLabel="删除训练营" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function DevicesPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [deviceModel, setDeviceModel] = useState('ALL')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<DeviceRow | null>(null)
  const [qrDevice, setQrDevice] = useState<DeviceRow | null>(null)
  const path = `/devices?query=${encodeURIComponent(search)}&deviceModel=${encodeURIComponent(deviceModel)}&page=${page}&pageSize=20`
  const { data, loading, error, reload } = useResource<PageResult<DeviceRow>>(path)
  const models = useResource<DeviceModelRow[]>('/device-models')
  const reloadAll = () => { reload(); models.reload() }
  const remove = async () => {
    if (!deleting) return
    await api(`/devices/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null); reload()
  }
  return <Page title="设备管理" description="按型号创建设备，用户扫描二维码后完成账号绑定。"
    action={<button className="button primary" onClick={() => setCreating(true)}><Plus size={17} />新增设备</button>}>
    <Toolbar onSubmit={() => { setSearch(query); setPage(1) }} query={query} setQuery={setQuery} placeholder="搜索型号或序列号" onRefresh={reloadAll} loading={loading || models.loading}>
      <label className="select-field"><span className="sr-only">设备型号</span><select value={deviceModel} onChange={(event) => { setDeviceModel(event.target.value); setPage(1) }}><option value="ALL">全部型号</option>{models.data?.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
    </Toolbar>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    {models.error && <ErrorBanner message={models.error} onRetry={models.reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有设备" emptyHint="选择设备类型后，系统会生成 SN 和绑定二维码。">
      <Table><thead><tr><th>序列号</th><th>型号</th><th>状态</th><th>创建时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td><code>{item.serialNumber}</code></td><td>{item.deviceModel}</td><td><Badge status={item.bound ? 'BOUND' : 'UNBOUND'} /></td><td>{formatDate(item.createdAt)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => setQrDevice(item)} aria-label="查看二维码" title="查看二维码"><QrCode size={17} /></button><button className="icon-button danger" onClick={() => setDeleting(item)} aria-label="删除" title="删除"><Trash2 size={17} /></button></div></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
    {creating && <DeviceCreator models={models.data || []} onClose={() => setCreating(false)} onCreated={(created) => { setCreating(false); reload(); setQrDevice(created) }} />}
    {qrDevice && <DeviceQrDialog device={qrDevice} onClose={() => setQrDevice(null)} />}
    <ConfirmDialog open={!!deleting} title="删除设备？" message={deleting ? `序列号“${deleting.serialNumber}”删除后无法恢复。已绑定设备不能删除。` : ''} confirmLabel="删除设备" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function DeviceModelsPage() {
  const { data, loading, error, reload } = useResource<DeviceModelRow[]>('/device-models')
  const [editing, setEditing] = useState<DeviceModelRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DeviceModelRow | null>(null)
  const remove = async () => {
    if (!deleting) return
    await api(`/device-models/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null); reload()
  }
  return <Page title="设备型号" description="维护新建设备时可选择的型号及其 SN 生成前缀。"
    action={<button className="button primary" onClick={() => setEditing('new')}><Plus size={17} />新增型号</button>}>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.length} emptyText="还没有设备型号" emptyHint="先创建型号，再新增设备。">
      <Table><thead><tr><th>型号名称</th><th>SN 前缀</th><th>设备数量</th><th>更新时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.map((item) => <tr key={item.id}><td className="cell-title">{item.name}</td><td><code>{item.snPrefix}</code></td><td>{item.deviceCount}</td><td>{formatDate(item.updatedAt)}</td><td><RowActions onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} /></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {editing && <DeviceModelEditor value={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    <ConfirmDialog open={!!deleting} title="删除设备型号？" message={deleting ? `“${deleting.name}”下有 ${deleting.deviceCount} 台设备时无法删除。` : ''} confirmLabel="删除型号" onCancel={() => setDeleting(null)} onConfirm={remove} />
  </Page>
}

function WorkoutsPage() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useResource<PageResult<WorkoutRow>>(`/workouts?query=${encodeURIComponent(search)}&page=${page}&pageSize=20`)
  return <Page title="训练记录" description="训练记录来自用户实际训练，只提供查询，不允许后台修改。">
    <Toolbar onSubmit={() => { setSearch(query); setPage(1) }} query={query} setQuery={setQuery} placeholder="搜索用户或课程" onRefresh={reload} loading={loading} />
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有训练记录" emptyHint="用户完成训练后，记录会自动出现在这里。">
      <Table><thead><tr><th>用户</th><th>课程</th><th>训练时长</th><th>完成度</th><th>开始时间</th><th>完成时间</th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td className="cell-title">{item.userName}</td><td>{item.courseTitle}</td><td>{item.durationMinutes} 分钟</td><td><span className="progress-value"><span style={{ width: `${item.completionPercent}%` }} />{item.completionPercent}%</span></td><td>{formatDate(item.startedAt)}</td><td>{formatDate(item.completedAt)}</td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
  </Page>
}

function FeedbackPage() {
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<FeedbackRow | null>(null)
  const { data, loading, error, reload } = useResource<PageResult<FeedbackRow>>(`/feedback?status=${status}&page=${page}&pageSize=20`)
  const updateStatus = async (next: string) => {
    if (!selected) return
    const updated = await api<FeedbackRow>(`/feedback/${selected.id}/status`, json('PUT', { status: next }))
    setSelected(updated); reload()
  }
  return <Page title="问题反馈" description="查看用户问题并跟进处理状态。">
    <div className="filter-tabs" role="tablist" aria-label="反馈状态">
      {[['ALL', '全部'], ['SUBMITTED', '待处理'], ['PROCESSING', '处理中'], ['RESOLVED', '已解决']].map(([value, label]) => <button key={value} role="tab" aria-selected={status === value} className={status === value ? 'active' : ''} onClick={() => { setStatus(value); setPage(1) }}>{label}</button>)}
    </div>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="没有符合条件的反馈" emptyHint="新的用户反馈会显示在这里。">
      <Table><thead><tr><th>用户</th><th>分类</th><th>反馈摘要</th><th>联系方式</th><th>状态</th><th>提交时间</th><th><span className="sr-only">操作</span></th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td className="cell-title">{item.userName}</td><td>{item.category}</td><td className="truncate-cell">{item.content}</td><td>{item.contact || '未提供'}</td><td><Badge status={item.status} /></td><td>{formatDate(item.createdAt)}</td><td><button className="button ghost small" onClick={() => setSelected(item)}>查看详情</button></td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
    {selected && <SidePanel title="反馈详情" subtitle={`来自 ${selected.userName}`} onClose={() => setSelected(null)} footer={<div className="panel-actions"><button className="button secondary" onClick={() => updateStatus('PROCESSING')} disabled={selected.status === 'PROCESSING'}>标记处理中</button><button className="button primary" onClick={() => updateStatus('RESOLVED')} disabled={selected.status === 'RESOLVED'}><Check size={17} />标记已解决</button></div>}>
      <dl className="detail-list"><div><dt>分类</dt><dd>{selected.category}</dd></div><div><dt>提交时间</dt><dd>{formatDate(selected.createdAt)}</dd></div><div><dt>联系方式</dt><dd>{selected.contact || '用户未提供'}</dd></div><div><dt>当前状态</dt><dd><Badge status={selected.status} /></dd></div></dl>
      <section className="feedback-content"><h3>反馈内容</h3><p>{selected.content}</p></section>
    </SidePanel>}
  </Page>
}

function AuditsPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useResource<PageResult<AuditRow>>(`/audit-logs?page=${page}&pageSize=20`)
  return <Page title="操作日志" description="记录管理员登录、上传和内容变更，便于回溯。" action={<RefreshButton onClick={reload} loading={loading} />}>
    {error && <ErrorBanner message={error} onRetry={reload} />}
    <TableSurface loading={loading} empty={!data?.items.length} emptyText="还没有操作记录" emptyHint="登录与内容操作会自动记录。">
      <Table><thead><tr><th>操作</th><th>对象</th><th>说明</th><th>管理员</th><th>IP 地址</th><th>时间</th></tr></thead>
        <tbody>{data?.items.map((item) => <tr key={item.id}><td><ActionBadge action={item.action} /></td><td>{item.targetType}{item.targetId ? ` #${item.targetId}` : ''}</td><td className="cell-title">{item.summary}</td><td>{item.username}</td><td><code>{item.ipAddress || '未记录'}</code></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody>
      </Table>
    </TableSurface>
    {data && <Pagination data={data} onPage={setPage} />}
  </Page>
}

function CourseEditor({ value, onClose, onSaved }: { value: CourseRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: value?.title || '', type: value?.type || '全身', durationMinutes: value?.durationMinutes || 20,
    level: value?.level || '初级', equipment: value?.equipment || '无器械', summary: value?.summary || '',
    coverImage: value?.coverImage || '', videoUrl: value?.videoUrl || '', videoCoverImage: value?.videoCoverImage || '',
    videoDurationSeconds: value?.videoDurationSeconds || 0, status: value?.status || 'DRAFT' as Status,
    sortOrder: value?.sortOrder || 0, exerciseIds: value?.exerciseIds || [] as number[],
  })
  const [errors, setErrors] = useState('')
  const [busy, setBusy] = useState(false)
  const exercises = useResource<PageResult<ExerciseRow>>('/exercises?page=1&pageSize=100').data?.items || []
  const update = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setErrors('')
    try {
      await api(value ? `/courses/${value.id}` : '/courses', json(value ? 'PUT' : 'POST', form)); onSaved()
    } catch (reason) { setErrors(reason instanceof Error ? reason.message : '课程保存失败') } finally { setBusy(false) }
  }
  return <SidePanel title={value ? '编辑课程' : '新增课程'} subtitle="课程发布后会在小程序中显示" onClose={onClose} wide footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>继续编辑后再说</button><button className="button primary" type="submit" form="course-form" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} />正在保存</> : '保存课程'}</button></div>}>
    <form id="course-form" className="editor-form" onSubmit={submit}>
      {errors && <div className="form-error" role="alert">{errors}</div>}
      <FormSection title="基本信息"><div className="form-grid"><Field label="课程名称" required><input value={form.title} maxLength={80} onChange={(event) => update('title', event.target.value)} required /></Field><Field label="课程类型" required><input value={form.type} maxLength={30} onChange={(event) => update('type', event.target.value)} required /></Field><Field label="难度" required><input value={form.level} maxLength={30} onChange={(event) => update('level', event.target.value)} required /></Field><Field label="所需器械" required><input value={form.equipment} maxLength={80} onChange={(event) => update('equipment', event.target.value)} required /></Field><Field label="课程时长（分钟）" required><input type="number" min="1" max="600" value={form.durationMinutes} onChange={(event) => update('durationMinutes', Number(event.target.value))} required /></Field><Field label="排序"><input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} /></Field></div><Field label="课程简介" required hint={`${form.summary.length}/300`}><textarea rows={4} value={form.summary} maxLength={300} onChange={(event) => update('summary', event.target.value)} required /></Field></FormSection>
      <FormSection title="课程媒体"><div className="media-grid"><MediaUploader label="课程封面" kind="image" value={form.coverImage} onChange={(next) => update('coverImage', next)} /><MediaUploader label="训练视频" kind="video" value={form.videoUrl} onChange={(next) => update('videoUrl', next)} /></div></FormSection>
      <FormSection title="动作编排" description="按勾选顺序保存到课程中。"><div className="check-list">{exercises.length ? exercises.map((item) => <label className="check-row" key={item.id}><input type="checkbox" checked={form.exerciseIds.includes(item.id)} onChange={(event) => update('exerciseIds', event.target.checked ? [...form.exerciseIds, item.id] : form.exerciseIds.filter((id) => id !== item.id))} /><span><strong>{item.name}</strong><small>{item.bodyPart} · {item.target}</small></span></label>) : <p className="muted">请先创建动作，再进行课程编排。</p>}</div></FormSection>
      <FormSection title="发布设置"><div className="form-grid"><Field label="状态"><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="DRAFT">草稿</option><option value="PUBLISHED">发布</option><option value="ARCHIVED">下架</option></select></Field></div></FormSection>
    </form>
  </SidePanel>
}

function ExerciseEditor({ value, onClose, onSaved }: { value: ExerciseRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: value?.name || '', bodyPart: value?.bodyPart || '核心', level: value?.level || '基础',
    equipment: value?.equipment || '无器械', suggestedSets: value?.suggestedSets || 2,
    target: value?.target || '', cue: value?.cue || '', safetyTip: value?.safetyTip || '',
    coverImage: value?.coverImage || '', videoUrl: value?.videoUrl || '', videoCoverImage: value?.videoCoverImage || '',
    videoDurationSeconds: value?.videoDurationSeconds || 0, status: value?.status || 'DRAFT' as Status, sortOrder: value?.sortOrder || 0,
  })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const update = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }))
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api(value ? `/exercises/${value.id}` : '/exercises', json(value ? 'PUT' : 'POST', form)); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : '动作保存失败') } finally { setBusy(false) } }
  return <SidePanel title={value ? '编辑动作' : '新增动作'} subtitle="动作可被多个课程重复使用" onClose={onClose} footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>继续编辑后再说</button><button className="button primary" type="submit" form="exercise-form" disabled={busy}>{busy ? '正在保存' : '保存动作'}</button></div>}>
    <form id="exercise-form" className="editor-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}
      <FormSection title="基本信息"><div className="form-grid"><Field label="动作名称" required><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></Field><Field label="训练部位" required><input value={form.bodyPart} onChange={(event) => update('bodyPart', event.target.value)} required /></Field><Field label="难度" required><input value={form.level} onChange={(event) => update('level', event.target.value)} required /></Field><Field label="所需器械" required><input value={form.equipment} onChange={(event) => update('equipment', event.target.value)} required /></Field><Field label="建议组数"><input type="number" min="1" max="20" value={form.suggestedSets} onChange={(event) => update('suggestedSets', Number(event.target.value))} /></Field><Field label="训练目标" required><input value={form.target} onChange={(event) => update('target', event.target.value)} placeholder="例如 30 秒" required /></Field></div><Field label="动作要领" required><textarea rows={3} value={form.cue} onChange={(event) => update('cue', event.target.value)} required /></Field><Field label="安全提示" required><textarea rows={3} value={form.safetyTip} onChange={(event) => update('safetyTip', event.target.value)} required /></Field></FormSection>
      <FormSection title="动作媒体"><div className="media-grid"><MediaUploader label="动作封面" kind="image" value={form.coverImage} onChange={(next) => update('coverImage', next)} /><MediaUploader label="示范视频" kind="video" value={form.videoUrl} onChange={(next) => update('videoUrl', next)} /></div></FormSection>
      <FormSection title="发布设置"><div className="form-grid"><Field label="状态"><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="DRAFT">草稿</option><option value="PUBLISHED">发布</option><option value="ARCHIVED">下架</option></select></Field><Field label="排序"><input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} /></Field></div></FormSection>
    </form>
  </SidePanel>
}

function PlanEditor({ value, onClose, onSaved }: { value: PlanRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: value?.title || '', weekNumber: value?.weekNumber || 1, sessionsPerWeek: value?.sessionsPerWeek || 3, description: value?.description || '', active: value?.active ?? true, sortOrder: value?.sortOrder || 0, items: value?.items || [] as PlanItem[] })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const courses = useResource<PageResult<CourseRow>>('/courses?status=PUBLISHED&page=1&pageSize=100').data?.items || []
  const update = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }))
  const addItem = () => { if (courses[0]) update('items', [...form.items, { courseId: courses[0].id, courseTitle: courses[0].title, dayOffset: form.items.length + 1, sortOrder: (form.items.length + 1) * 10 }]) }
  const setItem = (index: number, patch: Partial<PlanItem>) => update('items', form.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api(value ? `/plans/${value.id}` : '/plans', json(value ? 'PUT' : 'POST', form)); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : '计划保存失败') } finally { setBusy(false) } }
  return <SidePanel title={value ? '编辑训练计划' : '新增训练计划'} subtitle="课程按训练日顺序展示给用户" onClose={onClose} footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>继续编辑后再说</button><button className="button primary" form="plan-form" disabled={busy}>{busy ? '正在保存' : '保存计划'}</button></div>}>
    <form id="plan-form" className="editor-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<FormSection title="计划信息"><Field label="计划名称" required><input value={form.title} onChange={(event) => update('title', event.target.value)} required /></Field><div className="form-grid"><Field label="当前周数"><input type="number" min="1" max="52" value={form.weekNumber} onChange={(event) => update('weekNumber', Number(event.target.value))} /></Field><Field label="每周训练次数"><input type="number" min="1" max="14" value={form.sessionsPerWeek} onChange={(event) => update('sessionsPerWeek', Number(event.target.value))} /></Field></div><Field label="计划说明"><textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} /></Field></FormSection>
      <FormSection title="课程安排" description="day 0 表示本周第一天。"><div className="item-list">{form.items.map((item, index) => <div className="plan-item" key={`${item.courseId}-${index}`}><span className="item-index">{index + 1}</span><select value={item.courseId} onChange={(event) => setItem(index, { courseId: Number(event.target.value) })}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><label><span>第几天</span><input type="number" min="0" max="30" value={item.dayOffset} onChange={(event) => setItem(index, { dayOffset: Number(event.target.value) })} /></label><button type="button" className="icon-button danger" onClick={() => update('items', form.items.filter((_, itemIndex) => itemIndex !== index))} aria-label="移除课程"><Trash2 size={17} /></button></div>)}{courses.length ? <button type="button" className="button dashed" onClick={addItem}><Plus size={17} />添加课程</button> : <p className="muted">请先发布至少一节课程。</p>}</div></FormSection>
      <FormSection title="启用设置"><label className="switch-row"><input type="checkbox" checked={form.active} onChange={(event) => update('active', event.target.checked)} /><span><strong>向用户开放此计划</strong><small>关闭后不再出现在可选计划中</small></span></label></FormSection>
    </form>
  </SidePanel>
}

function CampaignEditor({ value, onClose, onSaved }: { value: CampaignRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ code: value?.code || '', title: value?.title || '', rulesText: value?.rulesText || '', startDate: value?.startDate || '', endDate: value?.endDate || '', status: value?.status || 'DRAFT' as Status, sortOrder: value?.sortOrder || 0 })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const update = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }))
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await api(value ? `/campaigns/${value.id}` : '/campaigns', json(value ? 'PUT' : 'POST', { ...form, startDate: form.startDate || null, endDate: form.endDate || null })); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : '训练营保存失败') } finally { setBusy(false) } }
  return <SidePanel title={value ? '编辑训练营' : '新增训练营'} subtitle="发布且处于开放日期内时，用户可以查看与打卡" onClose={onClose} footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>继续编辑后再说</button><button className="button primary" form="campaign-form" disabled={busy}>{busy ? '正在保存' : '保存训练营'}</button></div>}>
    <form id="campaign-form" className="editor-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<FormSection title="活动信息"><Field label="训练营名称" required><input value={form.title} onChange={(event) => update('title', event.target.value)} required /></Field><Field label="活动代码" required hint="保存后建议不要修改"><input value={form.code} onChange={(event) => update('code', event.target.value.toUpperCase().replace(/\s/g, '_'))} placeholder="例如 AUGUST_ABS" required /></Field><div className="form-grid"><Field label="开始日期"><input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></Field><Field label="结束日期"><input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /></Field></div><Field label="活动规则" required hint="每行一条规则"><textarea rows={7} value={form.rulesText} onChange={(event) => update('rulesText', event.target.value)} required /></Field></FormSection><FormSection title="发布设置"><div className="form-grid"><Field label="状态"><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="DRAFT">草稿</option><option value="PUBLISHED">发布</option><option value="ARCHIVED">下架</option></select></Field><Field label="排序"><input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} /></Field></div></FormSection></form>
  </SidePanel>
}

function DeviceModelEditor({ value, onClose, onSaved }: { value: DeviceModelRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: value?.name || '', snPrefix: value?.snPrefix || '' })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await api(value ? `/device-models/${value.id}` : '/device-models', json(value ? 'PUT' : 'POST', form))
      onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '型号保存失败') } finally { setBusy(false) }
  }
  return <SidePanel title={value ? '编辑设备型号' : '新增设备型号'} subtitle="型号用于新建设备和生成序列号" onClose={onClose} footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" form="device-model-form" disabled={busy}>{busy ? '正在保存' : '保存型号'}</button></div>}>
    <form id="device-model-form" className="editor-form" onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}
      <FormSection title="型号信息"><Field label="型号名称" required hint="最多 100 个字符"><input value={form.name} maxLength={100} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如 Arvello Rehab Pro" required /></Field><Field label="SN 前缀" required hint="2 至 12 位字母或数字，同型号保持一致"><input value={form.snPrefix} minLength={2} maxLength={12} pattern="[A-Za-z0-9]+" onChange={(event) => setForm((current) => ({ ...current, snPrefix: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="例如 REHAB" required /></Field></FormSection>
    </form>
  </SidePanel>
}

function DeviceCreator({ models, onClose, onCreated }: { models: DeviceModelRow[]; onClose: () => void; onCreated: (created: DeviceRow) => void }) {
  const [deviceModel, setDeviceModel] = useState(models[0]?.name || '')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const created = await api<DeviceRow>('/devices', json('POST', { deviceModel }))
      onCreated(created)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '设备保存失败') } finally { setBusy(false) }
  }
  return <SidePanel title="新增设备" subtitle="选择型号后生成绑定二维码" onClose={onClose} footer={<div className="panel-actions"><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" form="device-form" disabled={busy || models.length === 0}>{busy ? '正在生成' : <><QrCode size={17} />生成二维码</>}</button></div>}>
    <form id="device-form" className="editor-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}{models.length === 0 && <div className="form-error" role="alert">请先在“设备型号”中创建至少一个型号。</div>}
      <FormSection title="设备型号"><Field label="设备型号" required><select value={deviceModel} onChange={(event) => setDeviceModel(event.target.value)} required disabled={models.length === 0}>{models.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field></FormSection>
    </form>
  </SidePanel>
}

function MediaUploader({ label, kind, value, onChange }: { label: string; kind: 'image' | 'video'; value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  useEffect(() => setPreviewFailed(false), [value])
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setError('')
    try { const result = await uploadMedia(file, kind); onChange(result.url) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '上传失败，请重新选择文件') }
    finally { setBusy(false) }
  }
  const download = async () => {
    if (!value || downloading) return
    setDownloading(true); setError('')
    try { await downloadMedia(value, label) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '下载失败，请稍后重试') }
    finally { setDownloading(false) }
  }
  return <div className="uploader"><div className="uploader-label"><strong>{label}</strong><small>{kind === 'image' ? 'JPG、PNG 或 WebP' : 'MP4、WebM 或 MOV'}</small></div>
    {value ? <div className="media-preview">{kind === 'image' ? previewFailed ? <div className="media-preview-fallback"><ImageIcon size={25} /><span>图片暂不可预览</span></div> : <img src={mediaUrl(value)} alt={`${label}预览`} onError={() => setPreviewFailed(true)} /> : <div className="video-preview"><Video size={28} /><span>{value.split('/').pop()}</span></div>}<div className="media-preview-actions"><button type="button" className="icon-button" onClick={download} disabled={downloading} aria-label={`下载${label}`} title={`下载${label}`}>{downloading ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}</button><div className="media-preview-edit-actions"><button type="button" className="button secondary small" onClick={() => inputRef.current?.click()}>更换{kind === 'image' ? '图片' : '视频'}</button><button type="button" className="button ghost small danger-text" onClick={() => onChange('')}>移除</button></div></div></div> : <button type="button" className="upload-drop" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={24} /> : <Upload size={24} />}<strong>{busy ? '正在上传' : `选择${kind === 'image' ? '图片' : '视频'}`}</strong><span>{kind === 'image' ? '建议使用 16:9 横图' : '文件大小由服务器配置限制'}</span></button>}
    <input ref={inputRef} className="sr-only" type="file" accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm,video/quicktime'} onChange={(event) => upload(event.target.files?.[0])} />{error && <p className="field-error">{error}</p>}</div>
}

function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    api<T>(path).then((result) => { if (active) setData(result) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '数据加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path, version])
  return { data, loading, error, reload: () => setVersion((current) => current + 1) }
}

function Page({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <div className="page"><header className="page-header"><div><p className="eyebrow">ARVELLO 内容运营</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</header>{children}</div>
}

function Toolbar({ query, setQuery, placeholder, onSubmit, onRefresh, loading, children }: { query: string; setQuery: (value: string) => void; placeholder: string; onSubmit: () => void; onRefresh: () => void; loading: boolean; children?: ReactNode }) {
  return <form className="toolbar" onSubmit={(event) => { event.preventDefault(); onSubmit() }}><label className="search-field"><Search size={18} /><span className="sr-only">{placeholder}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label>{children}<button className="button secondary" type="submit">搜索</button><button className="icon-button" type="button" onClick={onRefresh} aria-label="刷新列表" title="刷新列表"><RefreshCw className={loading ? 'spin' : ''} size={18} /></button></form>
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="select-field"><span className="sr-only">内容状态</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">全部状态</option><option value="PUBLISHED">已发布</option><option value="DRAFT">草稿</option><option value="ARCHIVED">已下架</option></select></label>
}

function Table({ children }: { children: ReactNode }) { return <div className="table-scroll"><table>{children}</table></div> }

function TableSurface({ loading, empty, emptyText, emptyHint, children }: { loading: boolean; empty: boolean; emptyText: string; emptyHint: string; children: ReactNode }) {
  return <section className="table-surface">{loading ? <TableSkeleton /> : empty ? <EmptyState title={emptyText} description={emptyHint} /> : children}</section>
}

function Pagination<T>({ data, onPage }: { data: PageResult<T>; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return <nav className="pagination" aria-label="分页"><span>共 {data.total} 条</span><div><button className="icon-button" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} aria-label="上一页"><ChevronLeft size={18} /></button><span>第 {data.page} / {pages} 页</span><button className="icon-button" disabled={data.page >= pages} onClick={() => onPage(data.page + 1)} aria-label="下一页"><ChevronRight size={18} /></button></div></nav>
}

function SidePanel({ title, subtitle, onClose, children, footer, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.classList.add('panel-open'); window.addEventListener('keydown', onKey)
    return () => { document.body.classList.remove('panel-open'); window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return <div className="panel-layer" role="presentation"><button className="panel-scrim" onClick={onClose} aria-label="关闭编辑面板" /><aside className={`side-panel ${wide ? 'wide' : ''}`} aria-modal="true" role="dialog" aria-labelledby="panel-title"><header><div><h2 id="panel-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button></header><div className="panel-body">{children}</div>{footer && <footer>{footer}</footer>}</aside></div>
}

function DeviceQrDialog({ device, onClose }: { device: DeviceRow; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let objectUrl = ''
    let active = true
    apiBlob(`/devices/${device.id}/qr-code`).then((blob) => {
      objectUrl = URL.createObjectURL(blob)
      if (active) setUrl(objectUrl)
      else URL.revokeObjectURL(objectUrl)
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '二维码加载失败') })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [device.id])
  const download = () => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url; link.download = `${device.serialNumber}-qr.png`; link.click()
  }
  return <div className="dialog-layer" role="presentation"><div className="dialog qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-title">
    <div className="qr-dialog-heading"><span><QrCode size={22} /></span><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button></div>
    <h2 id="qr-title">{device.deviceModel}</h2><p>打印或贴附此二维码。用户登录小程序后扫码，即可将设备绑定到当前账号。</p>
    <div className="qr-preview">{error ? <div className="form-error" role="alert">{error}</div> : url ? <img src={url} alt={`${device.deviceModel}绑定二维码`} /> : <LoaderCircle className="spin" size={28} />}</div>
    <div className="qr-device-meta"><span>序列号</span><code>{device.serialNumber}</code></div>
    <div className="dialog-actions"><button className="button secondary" onClick={onClose}>关闭</button><button className="button primary" onClick={download} disabled={!url}><Download size={17} />下载二维码</button></div>
  </div></div>
}

function ConfirmDialog({ open, title, message, confirmLabel, onCancel, onConfirm }: { open: boolean; title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!open) { setBusy(false); setError('') } }, [open])
  if (!open) return null
  const confirm = async () => { setBusy(true); setError(''); try { await onConfirm() } catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败') } finally { setBusy(false) } }
  return <div className="dialog-layer" role="presentation"><div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span className="dialog-icon"><Trash2 size={22} /></span><h2 id="confirm-title">{title}</h2><p>{message}</p>{error && <div className="form-error">{error}</div>}<div className="dialog-actions"><button className="button secondary" onClick={onCancel}>保留内容</button><button className="button destructive" onClick={confirm} disabled={busy}>{busy ? '正在删除' : confirmLabel}</button></div></div></div>
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) { return <section className="form-section"><div className="form-section-heading"><h3>{title}</h3>{description && <p>{description}</p>}</div><div className="form-section-content">{children}</div></section> }
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) { return <label className="field"><span><span>{label}{required && <b aria-hidden="true"> *</b>}</span>{hint && <small>{hint}</small>}</span>{children}</label> }
function MediaThumbnail({ src, label, icon }: { src?: string; label: string; icon: 'image' | 'exercise' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return src && !failed ? <img src={mediaUrl(src)} alt={`${label}封面`} onError={() => setFailed(true)} /> : <span className="media-placeholder" aria-hidden="true">{icon === 'image' ? <ImageIcon size={18} /> : <Dumbbell size={18} />}</span>
}
function Badge({ status }: { status: string }) { return <span className={`badge status-${status.toLowerCase()}`}><span />{STATUS_LABEL[status] || status}</span> }
function ActionBadge({ action }: { action: string }) { return <span className={`action-badge action-${action.toLowerCase()}`}>{({ LOGIN: '登录', LOGOUT: '退出', CREATE: '新增', UPDATE: '修改', DELETE: '删除', UPLOAD: '上传' } as Record<string, string>)[action] || action}</span> }
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="row-actions"><button className="icon-button" onClick={onEdit} aria-label="编辑" title="编辑"><Pencil size={17} /></button><button className="icon-button danger" onClick={onDelete} aria-label="删除" title="删除"><Trash2 size={17} /></button></div> }
function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) { return <button className="button secondary" onClick={onClick}><RefreshCw className={loading ? 'spin' : ''} size={17} />刷新数据</button> }
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="error-banner" role="alert"><span><strong>数据加载失败</strong><small>{message}</small></span><button className="button secondary small" onClick={onRetry}>重新加载</button></div> }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><span><ClipboardList size={24} /></span><h3>{title}</h3><p>{description}</p></div> }
function TableSkeleton() { return <div className="table-skeleton" aria-label="正在加载列表">{Array.from({ length: 7 }).map((_, index) => <span key={index} style={{ width: `${90 - index * 3}%` }} />)}</div> }
function DashboardSkeleton() { return <div className="dashboard-skeleton"><span /><div><span /><span /></div><span /></div> }

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, ClipboardList, Eye, Pause, Play, RefreshCw, RotateCcw, Search, Unlink, X } from 'lucide-react'
import { api, json } from './api'
import type { PageResult } from './types'

type Sensor = { id:number; deviceId:string; deviceCode:string; state:string; status:string; bedId?:number; bedSn?:string; userId?:number; userName?:string; userPhone?:string; bindingId?:number; boundAt?:string; createdAt:string; receivedAt?:string; lastSeenAt?:string; bootId?:string; sequence?:number; repetitionCount?:number; sensorOk?:boolean; moving?:boolean; standby?:boolean; firmwareVersion?:string; model?:string; serialNumber?:string; trainingState?:string; activeDurationMs?:number; batteryAvailable?:boolean; batteryPercent?:number|null; charging?:boolean; batteryFull?:boolean; faultMask?:number; telemetry?:Record<string,unknown> }
type Session = { id:number; sensorId:number; deviceId:string; deviceCode:string; bedId?:number|null; bedSn?:string; userId?:number|null; userName?:string; userPhone?:string; startedAt?:string; lastMotionAt?:string; endedAt?:string; durationMs:number; repetitionCount:number; startCount:number; endCount:number; status:string; endReason?:string; schemaVersion?:number; deviceSessionId?:string; trainingState?:string; timeValid?:boolean; timeQuality?:string; ownershipStatus?:string; averagePeriodMs?:number; minPeriodMs?:number; maxPeriodMs?:number; summaryReceived?:boolean }
type Binding = { id:number; bedId:number; bedSn?:string; userId:number; userName?:string; boundAt:string; unboundAt?:string }
type Sessions = PageResult<Session> & {summary:{durationMs:number; repetitions:number; activeSessions:number}}
const states:Record<string,string> = {WAITING:'等待上报',MOVING:'运动中',PAUSED:'已暂停',STILL:'在线静止',STANDBY:'上次状态：待机',OFFLINE:'离线',ERROR:'传感器异常',DISABLED:'已停用',ACTIVE:'进行中',COMPLETED:'已结束'}
const reasons:Record<string,string> = {IDLE:'静止超时',STANDBY:'设备待机',INTERRUPTED:'设备重启或归属变更',UNBOUND:'用户解除绑定',ADMIN_UNBOUND:'管理员解除绑定',DISABLED:'管理员停用',idle_timeout:'静止满 5 分钟',manual:'手动结束',ble:'蓝牙结束',standby:'设备待机',factory_reset:'恢复出厂设置',button:'按键结束',inactive_5min:'静止满 5 分钟',ble_command:'蓝牙结束',serial_command:'调试指令结束',power_off:'设备关机',counter_reset:'设备计数重置',DEVICE_IDLE:'设备已结束训练',sensor_error:'传感器异常'}
const time = (value?:string)=>value ? new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}) : '未记录'
const duration = (ms:number=0)=> { const seconds=Math.floor(ms/1000); return `${Math.floor(seconds/3600) ? Math.floor(seconds/3600)+'时' : ''}${Math.floor(seconds/60)%60}分${String(seconds%60).padStart(2,'0')}秒` }
const stateBadge = (state:string)=><span className={`sensor-state sensor-state-${state.toLowerCase()}`}>{states[state] || state}</span>
const trainingState = (value?:string)=>({active:'训练中',paused:'已暂停',idle:'未训练'} as Record<string,string>)[value || ''] || '未上报'
const sessionState = (item:Session)=>item.status==='ACTIVE' && item.trainingState==='paused' ? 'PAUSED' : item.status
const period = (value?:number)=>typeof value==='number' && Number.isFinite(value) && value>0 ? `${(value/1000).toFixed(2)} 秒/次` : '暂无节奏数据'
const timeQuality = (item:Session)=>item.timeQuality==='ESTIMATED' ? '估算时间' : item.timeQuality==='UNKNOWN' || item.timeValid===false || !item.startedAt ? '设备未校时，日期待确认' : '设备时间'
const sessionTime = (value:string|undefined,item:Session)=><div className="cell-stack"><span>{time(value)}</span>{timeQuality(item)!=='设备时间' && <small>{timeQuality(item)}</small>}</div>
const battery = (item:Sensor)=>{if((item.batteryAvailable ?? item.telemetry?.batteryAvailable)===false)return '电量未知';const value=item.batteryPercent ?? item.telemetry?.batteryPercent;return typeof value==='number' && Number.isFinite(value) && value>=0 && value<=100 ? `${value}%${(item.batteryFull ?? item.telemetry?.batteryFull)===true?' · 已充满':(item.charging ?? item.telemetry?.charging)===true?' · 充电中':''}`:'电量未知'}
const faults = (value:unknown)=>{if(typeof value!=='number')return '故障状态未知';if(value===0)return '无故障';const result=([[1,'传感器异常'],[2,'网络异常'],[4,'电量不足'],[8,'存储异常']] as const).filter(([bit])=>value&bit).map(([,name])=>String(name));if(value&~15)result.push('其他故障');return result.join('、')}

export function useSensorLocation() {
  const [hash,setHash]=useState(window.location.hash)
  useEffect(()=> { const change=()=>setHash(window.location.hash); window.addEventListener('hashchange',change); return ()=>window.removeEventListener('hashchange',change) },[])
  return new URLSearchParams(hash.split('?')[1] || '')
}
function useData<T>(path:string,refresh:boolean,version:number=0) {
  const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=> {
    let active=true, timer:ReturnType<typeof setTimeout> | undefined, busy=false
    const controller=new AbortController()
    setData(null); setLoading(true); setError('')
    const load=async()=> {
      if (busy || !active) return
      busy=true
      try { const result=await api<T>(path,{signal:controller.signal}); if(active) {setData(result);setError('')} }
      catch(e) {if(active) setError(e instanceof Error ? e.message : '加载失败')}
      finally {busy=false; if(active) {setLoading(false); if(refresh && !document.hidden) timer=setTimeout(load,5000)} }
    }
    const visibility=()=> {clearTimeout(timer); if(!document.hidden) void load()}
    void load(); document.addEventListener('visibilitychange',visibility)
    return ()=> {active=false;controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visibility)}
  },[path,refresh,version])
  return {data,loading,error}
}
function Pager({data,onPage}:{data:{total:number;page:number;pageSize:number};onPage:(page:number)=>void}) {
  const pages=Math.max(1,Math.ceil(data.total/data.pageSize))
  return <nav className="pagination" aria-label="分页"><span>共 {data.total} 条</span><div><button className="icon-button" title="上一页" aria-label="上一页" disabled={data.page<=1} onClick={()=>onPage(data.page-1)}><ChevronLeft size={18}/></button><span>第 {data.page} / {pages} 页</span><button className="icon-button" title="下一页" aria-label="下一页" disabled={data.page>=pages} onClick={()=>onPage(data.page+1)}><ChevronRight size={18}/></button></div></nav>
}
function Result({loading,error,empty,children,retry}:{loading:boolean;error:string;empty:boolean;children:ReactNode;retry:()=>void}) {
  if(error) return <div className="error-banner" role="alert"><span>{error}</span><button className="button secondary" onClick={retry}>重新加载</button></div>
  if(loading) return <div className="table-skeleton" role="status" aria-label="正在加载">{[1,2,3,4].map(n=><span key={n}/>)}</div>
  if(empty) return <div className="empty-state"><Activity size={24}/><h3>暂无符合条件的记录</h3></div>
  return <>{children}</>
}
function Drawer({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}) {
  const panel=useRef<HTMLElement>(null)
  const close=useRef(onClose); close.current=onClose
  useEffect(()=> {
    const before=document.activeElement as HTMLElement|null
    panel.current?.focus(); document.body.classList.add('panel-open')
    const key=(e:KeyboardEvent)=> {
      if(e.key==='Escape') close.current()
      if(e.key==='Tab') {
        const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,[tabindex="0"]') || [])
        const first=items[0],last=items[items.length-1]
        if(e.shiftKey && (document.activeElement===first || document.activeElement===panel.current)) {e.preventDefault();last?.focus()}
        else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first?.focus()}
      }
    }
    window.addEventListener('keydown',key)
    return ()=>{document.body.classList.remove('panel-open');window.removeEventListener('keydown',key);before?.focus()}
  },[])
  return <div className="panel-layer"><button className="panel-scrim" aria-label="关闭详情" onClick={onClose}/><aside ref={panel} tabIndex={-1} className="side-panel wide sensor-detail" role="dialog" aria-modal="true" aria-labelledby="sensor-dialog-title"><header><div><h2 id="sensor-dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭" title="关闭" onClick={onClose}><X size={20}/></button></header><div className="panel-body">{children}</div></aside></div>
}
function Refresh({auto,setAuto,reload,loading}:{auto:boolean;setAuto:(v:boolean)=>void;reload:()=>void;loading:boolean}) {
  return <div className="sensor-refresh"><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>自动刷新</label><button className="icon-button" aria-label="刷新列表" title="刷新列表" onClick={reload} disabled={loading}><RefreshCw size={18} className={loading?'spin':''}/></button></div>
}
function ContextFilter({params}:{params:URLSearchParams}) {
  const value=params.get('bedId') || params.get('userId') || params.get('sensorId')
  if(!value) return null
  return <div className="sensor-context"><span>{params.get('label') || `${params.has('bedId')?'核心床':params.has('userId')?'用户':'传感器'} ID ${value}`}</span><a className="button ghost small" href={window.location.hash.split('?')[0]+(window.location.hash.startsWith('#/workouts')?'?type=sensor':'')}><X size={14}/>清除限定</a></div>
}
export function SensorsPage() {
  const params=useSensorLocation(), context=params.toString()
  const [query,setQuery]=useState(params.get('query') || ''),[search,setSearch]=useState(params.get('query') || ''),[state,setState]=useState('ALL'),[binding,setBinding]=useState('ALL'),[page,setPage]=useState(1)
  const [auto,setAuto]=useState(true),[version,setVersion]=useState(0),[selected,setSelected]=useState<number|null>(null)
  useEffect(()=>{setPage(1);setSelected(null)},[context])
  const p=new URLSearchParams({query:search,state,binding,page:String(page),pageSize:'20'})
  for(const key of ['bedId','userId']) if(params.has(key)) p.set(key,params.get(key)!)
  const {data,loading,error}=useData<PageResult<Sensor>>('/sensors?'+p,auto,version),reload=()=>setVersion(v=>v+1)
  return <div className="page sensor-admin"><header className="page-header"><div><p className="eyebrow">设备运营</p><h1>传感器管理</h1></div><Refresh auto={auto} setAuto={setAuto} reload={reload} loading={loading}/></header><ContextFilter params={params}/>
    <form className="toolbar sensor-toolbar" onSubmit={e=>{e.preventDefault();setSearch(query);setPage(1)}}><label className="search-field"><Search size={18}/><input aria-label="搜索传感器" placeholder="编号、核心床 SN、用户或手机号" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="传感器状态" value={state} onChange={e=>{setState(e.target.value);setPage(1)}}><option value="ALL">全部设备状态</option>{['MOVING','PAUSED','STILL','STANDBY','OFFLINE','ERROR','WAITING','DISABLED'].map(s=><option key={s} value={s}>{states[s]}</option>)}</select><select aria-label="传感器绑定状态" value={binding} onChange={e=>{setBinding(e.target.value);setPage(1)}}><option value="ALL">全部绑定状态</option><option value="BOUND">已绑定核心床</option><option value="UNBOUND">未绑定核心床</option></select><button className="button secondary" type="submit">搜索</button></form>
    <Result loading={loading} error={error} empty={!data?.items.length} retry={reload}><section className="table-surface"><div className="table-scroll"><table><thead><tr><th>传感器</th><th>状态</th><th>核心床 SN</th><th>当前用户</th><th>设备累计次数</th><th>最后上报（北京时间）</th><th>操作</th></tr></thead><tbody>{data?.items.map(item=><tr key={item.id}><td><div className="cell-stack"><strong>{item.deviceCode}</strong><small>{item.deviceId}</small></div></td><td>{stateBadge(item.state)}</td><td>{item.bedSn || '未绑定核心床'}</td><td>{item.userId ? <div className="cell-stack"><span>{item.userName || `用户 ${item.userId}`}</span><small>{item.userPhone || `ID ${item.userId}`}</small></div>:'未绑定用户'}</td><td>{item.repetitionCount ?? '未上报'}</td><td>{time(item.receivedAt)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`查看传感器 ${item.deviceCode}`} title="传感器详情" onClick={()=>setSelected(item.id)}><Eye size={17}/></button><a className="icon-button" aria-label={`查看 ${item.deviceCode} 训练记录`} title="设备训练记录" href={`#/workouts?type=sensor&sensorId=${item.id}&label=${encodeURIComponent(item.deviceCode)}`}><ClipboardList size={17}/></a></div></td></tr>)}</tbody></table></div></section></Result>
    {data && !error && <Pager data={data} onPage={setPage}/>}{selected!==null && <SensorDetail id={selected} onClose={()=>setSelected(null)} onChange={reload}/>}</div>
}
function SensorDetail({id,onClose,onChange}:{id:number;onClose:()=>void;onChange:()=>void}) {
  const [version,setVersion]=useState(0),[page,setPage]=useState(1),[action,setAction]=useState<'unbind'|'ACTIVE'|'DISABLED'|null>(null),[busy,setBusy]=useState(false),[failure,setFailure]=useState('')
  const expectedBinding=useRef<number|undefined>(undefined)
  const detail=useData<Sensor>(`/sensors/${id}`,true,version),history=useData<PageResult<Binding>>(`/sensors/${id}/bindings?page=${page}&pageSize=10`,true,version)
  const item=detail.data
  const mutate=async()=> {
    if(!item || !action) return
    setBusy(true);setFailure('')
    try {await api(action==='unbind'?`/sensors/${id}/bindings/${expectedBinding.current}`:`/sensors/${id}/status`,action==='unbind'?{method:'DELETE'}:json('PUT',{status:action}));setAction(null);setVersion(v=>v+1);onChange()}
    catch(e) {setFailure(e instanceof Error?e.message:'操作失败')}
    finally {setBusy(false)}
  }
  return <Drawer title="传感器详情" subtitle={item?.deviceCode} onClose={onClose}><Result loading={detail.loading} error={detail.error} empty={!item} retry={()=>setVersion(v=>v+1)}>{item && <>
    <div className="sensor-detail-heading">{stateBadge(item.state)}<a className="button secondary small" href={`#/workouts?type=sensor&sensorId=${id}&label=${encodeURIComponent(item.deviceCode)}`}><ClipboardList size={16}/>设备训练记录</a></div>
    <dl className="detail-list"><div><dt>设备编号</dt><dd>{item.deviceId}</dd></div><div><dt>核心床 SN</dt><dd>{item.bedSn || '未绑定'}</dd></div><div><dt>当前用户</dt><dd>{item.userId ? `${item.userName || '用户'} · ID ${item.userId}`:'无'}</dd></div><div><dt>绑定时间</dt><dd>{time(item.boundAt)}</dd></div><div><dt>登记时间</dt><dd>{time(item.createdAt)}</dd></div><div><dt>最后上报</dt><dd>{time(item.receivedAt)}</dd></div><div><dt>累计次数</dt><dd>{item.repetitionCount ?? '未上报'}</dd></div><div><dt>上报序号</dt><dd>{item.sequence ?? '未上报'}</dd></div><div><dt>开机周期</dt><dd>{item.bootId || '未上报'}</dd></div></dl>
    <h3 className="sensor-section-title">设备与训练状态</h3><dl className="detail-list">
      <div><dt>传感器 SN</dt><dd>{item.serialNumber || '未上报'}</dd></div><div><dt>传感器型号</dt><dd>{item.model || '未上报'}</dd></div><div><dt>固件版本</dt><dd>{item.firmwareVersion || '未上报'}</dd></div>
      <div><dt>训练状态</dt><dd>{trainingState(item.trainingState || item.telemetry?.trainingState as string)}</dd></div><div><dt>本次有效时长</dt><dd>{duration(item.activeDurationMs ?? item.telemetry?.activeDurationMs as number)}</dd></div><div><dt>电量</dt><dd>{battery(item)}</dd></div><div><dt>设备检查</dt><dd>{faults(item.faultMask ?? item.telemetry?.faultMask)}</dd></div>
    </dl>
    <details className="sensor-telemetry"><summary>最新采集数据</summary><dl className="detail-list">{Object.entries(item.telemetry || {}).map(([key,value])=><div key={key}><dt>{({uptimeMs:'运行毫秒',countType:'计次类型',motionAxis:'运动轴',motionAxisG:'运动轴加速度 g',accelG:'三轴加速度 g',gyroDps:'角速度 °/s',activityG:'活动强度 g'} as Record<string,string>)[key] || key}</dt><dd>{Array.isArray(value)?value.join(', '):String(value ?? '无')}</dd></div>)}</dl>{!item.telemetry && <p>尚无采集数据</p>}</details>
    <div className="sensor-management"><button className="button secondary" disabled={busy} onClick={()=>{setAction(item.status==='ACTIVE'?'DISABLED':'ACTIVE');setFailure('')}}>{item.status==='ACTIVE'?<Pause size={16}/>:<Play size={16}/>} {item.status==='ACTIVE'?'停用传感器':'启用传感器'}</button><button className="button secondary" disabled={!item.bindingId || busy} onClick={()=>{expectedBinding.current=item.bindingId;setAction('unbind');setFailure('')}}><Unlink size={16}/>解除绑定</button></div>
    {action && <div className="sensor-confirm" role="group" aria-label="确认管理操作"><strong>{action==='unbind'?'解除与当前核心床的绑定？':action==='DISABLED'?'停用此传感器？':'启用此传感器？'}</strong><p>{action==='unbind'?'进行中的训练将结束，历史记录保留。':action==='DISABLED'?'停止接收该设备上报并结束当前训练，现有绑定保留。':'恢复接收该设备的运动数据。'}</p>{failure && <p className="form-error" role="alert">{failure}</p>}<div className="row-actions"><button className="button secondary" disabled={busy} onClick={()=>setAction(null)}>取消</button><button className="button primary" disabled={busy || (action==='unbind'&&!item.bindingId)} onClick={mutate}>{busy?'处理中':'确认操作'}</button></div></div>}
    <h3 className="sensor-section-title">绑定历史</h3><Result loading={history.loading} error={history.error} empty={!history.data?.items.length} retry={()=>setVersion(v=>v+1)}><div className="table-scroll"><table><thead><tr><th>核心床 / 绑定人</th><th>绑定时间</th><th>解绑时间</th></tr></thead><tbody>{history.data?.items.map(b=><tr key={b.id}><td><div className="cell-stack"><span>{b.bedSn || `核心床 ${b.bedId}`}</span><small>{b.userName || `用户 ${b.userId}`}</small></div></td><td>{time(b.boundAt)}</td><td>{b.unboundAt?time(b.unboundAt):'当前有效绑定'}</td></tr>)}</tbody></table></div></Result>{history.data && <Pager data={history.data} onPage={setPage}/>}</>}</Result></Drawer>
}
export function SensorWorkouts() {
  const context=useSensorLocation(),scope=context.toString()
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState('ALL'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1)
  const [auto,setAuto]=useState(true),[version,setVersion]=useState(0),[selected,setSelected]=useState<Session|null>(null)
  useEffect(()=>{setPage(1);setSelected(null)},[scope])
  const p=new URLSearchParams({query:search,status,page:String(page),pageSize:'20'})
  for(const key of ['sensorId','bedId','userId']) if(context.has(key)) p.set(key,context.get(key)!)
  if(from)p.set('from',from); if(to)p.set('to',to)
  const {data,loading,error}=useData<Sessions>('/sensor-workouts?'+p,auto,version),reload=()=>setVersion(v=>v+1)
  const submit=(e:FormEvent)=>{e.preventDefault();setSearch(query);setPage(1)}
  const reset=()=>{setQuery('');setSearch('');setStatus('ALL');setFrom('');setTo('');setPage(1)}
  const filtered=!!(search || status!=='ALL' || from || to)
  return <div className="page sensor-admin device-workouts"><header className="page-header"><div><h1>设备训练记录</h1></div><Refresh auto={auto} setAuto={setAuto} reload={reload} loading={loading}/></header><ContextFilter params={context}/>
    <form className="workout-filters" onSubmit={submit}>
      <label className="workout-field workout-search"><span>关键词</span><div className="search-field"><Search size={17}/><input aria-label="搜索设备训练记录" placeholder="用户 / 手机号 / 核心床 SN / 传感器" value={query} onChange={e=>setQuery(e.target.value)}/></div></label>
      <label className="workout-field"><span>训练状态</span><select aria-label="训练状态" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="ALL">全部状态</option><option value="ACTIVE">进行中</option><option value="COMPLETED">已结束</option></select></label>
      <label className="workout-field"><span>开始日期</span><input aria-label="开始日期" type="date" value={from} max={to || undefined} onChange={e=>{setFrom(e.target.value);setPage(1)}}/></label>
      <label className="workout-field"><span>结束日期</span><input aria-label="结束日期" type="date" value={to} min={from || undefined} onChange={e=>{setTo(e.target.value);setPage(1)}}/></label>
      <div className="workout-filter-actions"><button className="button primary" type="submit"><Search size={16}/>搜索</button><button className="icon-button" title="重置筛选" aria-label="重置筛选" type="button" onClick={reset}><RotateCcw size={17}/></button></div>
    </form>
    {data && !error && <div className="sensor-summary" aria-label="筛选结果汇总"><span>训练记录 <strong>{data.total}</strong></span><span>进行中 <strong>{data.summary.activeSessions}</strong></span><span>有效时长 <strong>{duration(data.summary.durationMs)}</strong></span><span>往返次数 <strong>{data.summary.repetitions}</strong></span><small>北京时间</small></div>}
    <Result loading={loading} error={error} empty={false} retry={reload}><section className="workout-results" aria-label="设备训练列表"><div className="table-scroll"><table><thead><tr><th>用户</th><th>核心床 / 传感器</th><th>开始时间</th><th>最后动作时间</th><th>有效时长</th><th>往返次数</th><th>状态</th><th>结束原因</th><th>详情</th></tr></thead><tbody>{data?.items.map(item=><tr key={item.id}><td><div className="cell-stack"><strong>{item.userName || (item.userId ? `用户 ${item.userId}` : '归属待确认')}</strong><small>{item.userPhone || (item.userId ? `ID ${item.userId}` : '离线记录待核对')}</small></div></td><td><div className="cell-stack"><span>{item.bedSn || (item.bedId ? `核心床 ${item.bedId}` : '核心床待确认')}</span><small>{item.deviceCode}</small></div></td><td>{sessionTime(item.startedAt,item)}</td><td>{time(item.lastMotionAt)}</td><td>{duration(item.durationMs)}</td><td>{item.repetitionCount}</td><td>{stateBadge(sessionState(item))}</td><td>{item.endReason ? reasons[item.endReason] || item.endReason : '未结束'}</td><td><button className="icon-button" title="训练详情" aria-label={`查看训练 ${item.id}`} onClick={()=>setSelected(item)}><Eye size={17}/></button></td></tr>)}</tbody></table></div>
      {!data?.items.length && <div className="workout-empty" role="status"><ClipboardList size={30} strokeWidth={1.5}/><h3>{filtered?'暂无符合条件的记录':'暂无设备训练记录'}</h3>{filtered && <button className="button secondary small" onClick={reset}><RotateCcw size={14}/>清除筛选</button>}</div>}
      {data && <Pager data={data} onPage={setPage}/>}</section></Result>
    {selected && <SessionDetail id={selected.id} onClose={()=>setSelected(null)}/>}
    </div>
}


function SessionDetail({id,onClose}:{id:number;onClose:()=>void}) {
  const [version,setVersion]=useState(0)
  const {data:current,loading,error}=useData<Session>('/sensor-workouts/'+id,true,version)
  return <Drawer title={`设备训练 #${id}`} subtitle={current?.deviceCode} onClose={onClose}><Result loading={loading} error={error} empty={!current} retry={()=>setVersion(v=>v+1)}>{current && <><dl className="detail-list">{[['用户',current.userId ? `${current.userName || '用户'} · ID ${current.userId}` : '归属待确认'],['核心床',current.bedSn || (current.bedId ? String(current.bedId) : '待确认')],['传感器',current.deviceId],['首次动作',time(current.startedAt)],['最后动作',time(current.lastMotionAt)],['结束时间',time(current.endedAt)],['有效时长',duration(current.durationMs)],['平均节奏',period(current.averagePeriodMs)],['最快节奏',period(current.minPeriodMs)],['最慢节奏',period(current.maxPeriodMs)],['时间来源',timeQuality(current)],['设备会话',current.deviceSessionId || '旧版训练记录'],['数据状态',current.schemaVersion===4 ? (current.summaryReceived ? '设备摘要已接收' : '等待设备摘要') : '实时记录'],['往返次数',String(current.repetitionCount)],['起始累计计数',String(current.startCount)],['结束累计计数',String(current.endCount)],['状态',states[sessionState(current)] || current.status],['结束原因',current.endReason ? reasons[current.endReason] || current.endReason : '未结束']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><a className="button secondary" href={`#/sensors?${current.bedId ? 'bedId='+current.bedId : 'query='+encodeURIComponent(current.deviceCode)}&label=${encodeURIComponent(current.bedSn || current.deviceCode)}`}><Activity size={16}/>查看传感器</a></>}</Result></Drawer>
}

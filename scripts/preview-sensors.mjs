import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Isolated admin fixtures. No request is forwarded to the business server.
const stamp=()=>new Date().toISOString()
const states=['MOVING','STILL','STANDBY','OFFLINE','ERROR','WAITING','DISABLED']
const sensors=Array.from({length:26},(_,i)=>({id:i+1,deviceId:'ARVELLO-'+(i+1).toString(16).toUpperCase().padStart(12,'0'),deviceCode:'AVS-0000-0000-'+(i+1).toString(16).toUpperCase().padStart(4,'0'),state:states[i%7],status:i%7===6?'DISABLED':'ACTIVE',bedId:i%3!==2?100+i:null,bedSn:i%3!==2?`AVA02K37A000${String(i+1).padStart(3,'0')}X8M`:null,userId:i%3!==2?900+i:null,userName:i%3!==2?['陈女士','林先生','王女士'][i%3]:null,userPhone:i%3!==2?'13800000000':null,bindingId:i%3!==2?200+i:null,boundAt:stamp(),createdAt:stamp(),receivedAt:i%7===5?null:stamp(),bootId:'66cb62365e2f4757b4c4117a8c759e2c',sequence:321,repetitionCount:120+i,telemetry:{uptimeMs:321000,countType:'continuous_cycle',motionAxis:'X',motionAxisG:0.023,accelG:[0.02,0.01,1.01],gyroDps:[0.1,0.03,0.01],activityG:0.018}}))
const bindings=sensors.filter(s=>s.bindingId).map(s=>({id:s.bindingId,sensorId:s.id,bedId:s.bedId,bedSn:s.bedSn,userId:s.userId,userName:s.userName,boundAt:s.boundAt,unboundAt:null}))
const workouts=Array.from({length:27},(_,i)=>({id:300+i,sensorId:1,deviceId:sensors[0].deviceId,deviceCode:sensors[0].deviceCode,bedId:100,bedSn:sensors[0].bedSn,userId:900,userName:'陈女士',userPhone:'13800000000',startedAt:'2026-09-08T11:00:00Z',lastMotionAt:'2026-09-08T11:08:40Z',endedAt:i===0?null:'2026-09-08T11:08:40Z',durationMs:520000,repetitionCount:24,startCount:10,endCount:34,status:i===0?'ACTIVE':'COMPLETED',endReason:i===0?null:'IDLE'}))
const audits=[]
const initial=structuredClone({sensors,bindings,workouts})
function paged(items,params) {const page=Number(params.get('page')||1),pageSize=Number(params.get('pageSize')||20);return {items:items.slice((page-1)*pageSize,page*pageSize),total:items.length,page,pageSize}}
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),plugins:[react(),{
  name:'sensor-admin-preview',
  transformIndexHtml(html){return html.replace('<head>','<head><script>localStorage.setItem("arvello_admin_token","sensor-preview-only")</script>')},
  configureServer(vite){vite.middlewares.use(async(req,res,next)=> {
    const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname,p=url.searchParams
    if(!path.startsWith('/api/'))return next()
    res.setHeader('Content-Type','application/json; charset=utf-8')
    const send=(value,status=200)=>{res.statusCode=status;res.end(JSON.stringify(value))}
    if(path==='/api/admin/__preview/reset'&&req.method==='POST') {
      sensors.splice(0,sensors.length,...structuredClone(initial.sensors));bindings.splice(0,bindings.length,...structuredClone(initial.bindings));workouts.splice(0,workouts.length,...structuredClone(initial.workouts));audits.length=0;return send({ok:true})
    }
    if(path==='/api/admin/me')return send({username:'联调预览'})
    if(path==='/api/admin/device-models')return send([])
    if(path==='/api/admin/devices')return send(paged([{id:100,serialNumber:sensors[0].bedSn,deviceModel:'核心床',brand:'ARVELLO',deviceSource:'OWN',bound:true,boundUserId:900,boundUserName:'陈女士',createdAt:stamp()}],p))
    if(path==='/api/admin/users')return send(paged([{id:900,nickname:'陈女士',phone:'13800000000',status:'ACTIVE',workoutCount:10,totalMinutes:160,createdAt:stamp(),presence:{online:true}}],p))
    if(path==='/api/admin/workouts')return send(paged([{id:1,userId:900,userName:'陈女士',courseTitle:'全身基础训练',durationMinutes:12,completionPercent:100,startedAt:stamp(),completedAt:stamp()}],p))
    if(path==='/api/admin/audits')return send(paged(audits,p))
    if(path==='/api/admin/sensors') {
      let items=sensors.filter(s=>!p.get('query')||[s.deviceId,s.deviceCode,s.bedSn,s.userName,s.userPhone].join(' ').includes(p.get('query')))
      for(const key of ['bedId','userId'])if(p.has(key))items=items.filter(s=>String(s[key])===p.get(key))
      if(p.get('state') && p.get('state')!=='ALL')items=items.filter(s=>s.state===p.get('state'))
      if(p.get('binding')==='BOUND')items=items.filter(s=>s.bindingId)
      if(p.get('binding')==='UNBOUND')items=items.filter(s=>!s.bindingId)
      return send(paged(items,p))
    }
    if(path==='/api/admin/sensor-workouts') {
      let items=workouts.filter(w=>!p.get('query')||[w.deviceId,w.bedSn,w.userName,w.userPhone].join(' ').includes(p.get('query')))
      for(const key of ['sensorId','bedId','userId'])if(p.has(key))items=items.filter(w=>String(w[key])===p.get(key))
      if(p.get('status')&&p.get('status')!=='ALL')items=items.filter(w=>w.status===p.get('status'))
      if(p.get('from'))items=items.filter(w=>w.startedAt.slice(0,10)>=p.get('from'))
      if(p.get('to'))items=items.filter(w=>w.startedAt.slice(0,10)<=p.get('to'))
      return send({...paged(items,p),summary:{durationMs:items.reduce((n,w)=>n+w.durationMs,0),repetitions:items.reduce((n,w)=>n+w.repetitionCount,0),activeSessions:items.filter(w=>w.status==='ACTIVE').length}})
    }
    const workout=path.match(/^\/api\/admin\/sensor-workouts\/(\d+)$/)
    if(workout)return send(workouts.find(w=>w.id===Number(workout[1]))||{message:'训练记录不存在'})
    const match=path.match(/^\/api\/admin\/sensors\/(\d+)(?:\/(bindings|status)(?:\/(\d+))?)?$/)
    if(match) {
      const sensor=sensors.find(s=>s.id===Number(match[1]));if(!sensor)return send({message:'传感器不存在'},404)
      if(match[2]==='bindings'&&req.method==='GET')return send(paged(bindings.filter(b=>b.sensorId===sensor.id),p))
      if(req.method==='PUT'||req.method==='DELETE') {
        if(match[2]==='bindings') {
          if(sensor.bindingId!==Number(match[3]))return send({message:'绑定已变化，请刷新'},409)
          bindings.find(b=>b.id===sensor.bindingId).unboundAt=stamp()
          sensor.bindingId=null;sensor.bedId=null;sensor.bedSn=null;sensor.userId=null;sensor.userName=null;sensor.userPhone=null
        } else {let body='';for await(const chunk of req)body+=chunk;sensor.status=JSON.parse(body).status;sensor.state=sensor.status==='DISABLED'?'DISABLED':'STILL'}
        if(match[2]==='bindings'||sensor.status==='DISABLED')for(const w of workouts.filter(w=>w.sensorId===sensor.id&&w.status==='ACTIVE')){w.status='COMPLETED';w.endedAt=w.lastMotionAt;w.endReason=match[2]==='bindings'?'ADMIN_UNBOUND':'DISABLED'}
        audits.unshift({id:audits.length+1,username:'联调预览',action:'UPDATE',targetType:'SENSOR',targetId:sensor.id,summary:match[2]==='bindings'?'解除传感器绑定':'更新传感器状态',createdAt:stamp()})
      }
      return send(sensor)
    }
    return send({message:'此预览没有对应数据'},404)
  })}
}],server:{host:'127.0.0.1',port:5195,strictPort:true}})
await server.listen();server.printUrls()

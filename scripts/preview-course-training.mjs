import { createServer as createViteServer } from 'vite'
import { createServer } from 'node:http'
import { createReadStream, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Shared, isolated fixtures let the editor and mini-app exercise the same contract.
const root = fileURLToPath(new URL('../../', import.meta.url))
const webRoot = path.join(root, 'we-plt/unpackage/dist/build/web')
const mediaRoot = path.join(root, 'server/data/media')
const stamp = new Date().toISOString()
const webPort = Number(process.env.TRAINING_PREVIEW_PORT) || 5190
const adminPort = Number(process.env.TRAINING_ADMIN_PORT) || 5191
const video = '/api/media/files/videos/2026/09/3c7e50fe-669a-4ba7-b7c8-2d95aeaf23a8.mp4'
const exercises = ['动态弓步', '站姿提膝', '肩背放松'].map((name, index) => ({ id: index + 1, name, bodyPart: '全身', level: '基础', equipment: '核心床', suggestedSets: 4, target: '8次', cue: ['吸气，收回滑床，双手抓侧把手，背部伸展', '提升髋部灵活性，唤醒核心肌群。', '舒缓肩背紧张，改善体态。'][index], safetyTip: '保持呼吸平稳，注意控制动作幅度。', coverImage: `/static/flex-air/${['catalog-forward-fold', 'catalog-kneeling', 'catalog-backbend'][index]}.jpg`, videoUrl: video, springSets: [2, 3], status: 'PUBLISHED', sortOrder: index, createdAt: stamp, updatedAt: stamp }))
let course = { id: 1, title: '全身激活', type: '基础', durationMinutes: 12, level: '初级', equipment: '核心床', summary: '唤醒身体，从这一刻开始\n\n3 个基础动作，帮助你活动全身，提升身体感知，为训练做好准备。', introduction: '通过三组基础动作，逐步唤醒身体。\n\n在训练中建立核心控制与身体稳定性，保持自然呼吸，循序渐进地完成每组练习。', audience: '适合刚开始核心床训练的人群，以及希望进行全身激活和日常轻度训练的用户。', coverImage: '/static/flex-air/catalog-reformer.jpg', status: 'PUBLISHED', sortOrder: 0, viewCount: 14000, createdAt: stamp, updatedAt: stamp, exercises: exercises.map((item, i) => ({ exerciseId: item.id, sets: Array.from({ length: i === 0 ? 5 : 2 }, (_, index) => ({ side: index % 2 ? '右侧' : '左侧', durationSeconds: 60, repetitions: 8, springCount: i === 2 ? 3 : 2 })) })) }
const records = []
const designFixtures = process.env.TRAINING_DESIGN_FIXTURES === '1'
let settings = { reminderEnabled: false, soundEnabled: true }
let currentPlan = null
const plans = designFixtures ? [{ id: 1, title: '全身基础训练', subtitle: '建立稳定的核心控制', description: '从基础动作开始，循序渐进地练习身体控制与协调。', coverImage: '/static/flex-air/catalog-reformer.jpg', level: '初级', trainingScene: '核心床', sessionMinutes: 12, sessionsPerWeek: 3, weekNumber: 1, courseCount: 3, active: true, sortOrder: 0, createdAt: stamp, updatedAt: stamp, items: [1, 2, 3].map(id => ({ id, courseId: 1, courseTitle: '全身激活', durationMinutes: 12, dayNumber: id, status: 'PENDING' })) }] : []
const activities = new Map()
const trainingDate = time => new Date(time + 8 * 3600000).toISOString().slice(0, 10)
function workoutStats() {
  const live = [...activities.values()]
  const legacy = records.filter(record => !live.some(activity => activity.activityType === (record.customCourseId ? 'CUSTOM_COURSE' : 'COURSE') && activity.itemId === (record.customCourseId || record.courseId) && activity.startedAt === record.startedAt))
  const days = new Set([...live.map(row => row.trainingDate), ...legacy.map(row => trainingDate(Date.parse(row.completedAt)))])
  let cursor = Date.now(), consecutiveDays = 0
  if (!days.has(trainingDate(cursor))) cursor -= 86400000
  while (days.has(trainingDate(cursor))) { consecutiveDays++; cursor -= 86400000 }
  return { completedCount: records.filter(row => row.completionPercent >= 80).length, trainingDays: days.size, consecutiveDays, totalMinutes: Math.floor((live.reduce((sum, row) => sum + row.activeSeconds, 0) + legacy.reduce((sum, row) => sum + row.durationMinutes * 60, 0)) / 60) }
}
const row = () => ({ ...course, exerciseIds: course.exercises.map(item => item.exerciseId) })
const detail = () => ({ ...course, exercises: course.exercises.map(item => ({ ...exercises.find(exercise => exercise.id === item.exerciseId), sets: item.sets, recommendedPlays: item.recommendedPlays, durationSeconds: item.sets[0]?.durationSeconds })) })
async function api(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1'), pathname = url.pathname
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/media/')) return false
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (req.method === 'OPTIONS') { res.end(); return true }
  let value = {}; if (['POST', 'PUT'].includes(req.method)) { let body = ''; for await (const part of req) body += part; value = body ? JSON.parse(body) : {} }
  let data = []
  if (pathname === '/api/admin/me') data = { username: '课程预览' }
  else if (pathname.endsWith('/auth/login')) data = { token: 'course-preview-only', username: '课程预览' }
  else if (pathname === '/api/admin/courses/1' && req.method === 'PUT') { course = { ...course, ...value, updatedAt: new Date().toISOString() }; data = row() }
  else if (pathname === '/api/admin/courses') data = { items: [row()], total: 1, page: 1, pageSize: 20 }
  else if (pathname === '/api/admin/exercises') data = { items: exercises, total: exercises.length, page: 1, pageSize: 100 }
  else if (pathname === '/api/admin/plans') data = { items: plans, total: plans.length, page: 1, pageSize: 20 }
  else if (pathname === '/api/plans/catalog') data = plans
  else if (pathname === '/api/plans/detail/1') data = plans[0] || null
  else if (pathname === '/api/plans/1/select' && req.method === 'PUT') { currentPlan = plans[0] ? { ...plans[0], planId: 1 } : null; data = currentPlan }
  else if (pathname === '/api/courses') data = [{ ...row(), exerciseCount: course.exercises.length }]
  else if (pathname === '/api/courses/1') data = detail()
  else if (pathname === '/api/exercises') data = exercises
  else if (pathname === '/api/me') data = { user: { id: 99001, nickname: '训练预览', phoneBound: true }, settings }
  else if (pathname === '/api/me/settings' && req.method === 'PUT') { settings = { ...settings, ...value }; data = settings }
  else if (pathname === '/api/workout-records/stats') data = workoutStats()
  else if (pathname === '/api/workout-records/activity' && req.method === 'POST') { const key = `${value.activityType}_${value.itemId}_${value.startedAt}_${value.trainingDate}`; activities.set(key, { ...value, activeSeconds: Math.max(value.activeSeconds, activities.get(key)?.activeSeconds || 0) }); data = null }
  else if (pathname === '/api/workout-records') { if (req.method === 'POST') { data = { ...value, id: records.length + 1, courseTitle: course.title, completedAt: new Date().toISOString() }; records.push(data) } else data = records }
  else if (pathname === '/api/campaigns/catalog') data = []
  else if (pathname.startsWith('/api/campaigns')) data = { rules: [], checkedInToday: false, totalCheckins: 0 }
  else if (pathname === '/api/plans/current') data = currentPlan
  else if (pathname === '/api/devices/current') data = null
  res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); return true
}
function staticFile(req, res, file, directory) {
  const resolved = path.resolve(directory, '.' + file)
  if (!resolved.startsWith(path.resolve(directory) + path.sep)) { res.writeHead(403); res.end(); return }
  try {
    const size = statSync(resolved).size, extension = path.extname(resolved)
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' })[extension] || 'application/octet-stream')
    if (extension === '.html') {
      const setup = `<script>localStorage.setItem('arvello_api_url_production', JSON.stringify({type:'string',data:'http://127.0.0.1:${webPort}'}));localStorage.setItem('arvello_token',JSON.stringify({type:'string',data:'course-preview-only'}));</script>`
      res.end(readFileSync(resolved, 'utf8').replace('<head>', '<head>' + setup)); return
    }
    const range = req.headers.range && /^bytes=(\d+)-(\d*)$/.exec(req.headers.range)
    if (range) { const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1; res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 }); createReadStream(resolved, { start, end }).pipe(res) }
    else { res.setHeader('Content-Length', size); createReadStream(resolved).pipe(res) }
  } catch { res.writeHead(404); res.end() }
}
const web = createServer(async (req, res) => {
  try {
    if (await api(req, res)) return
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname
    if (pathname.startsWith('/api/media/files/')) return staticFile(req, res, pathname.slice('/api/media/files'.length), mediaRoot)
    staticFile(req, res, pathname === '/' ? '/index.html' : pathname, webRoot)
  } catch { res.writeHead(500); res.end() }
})
web.listen(webPort, '127.0.0.1', () => console.log(`Course preview: http://127.0.0.1:${webPort}/?tab=course`))
const admin = await createViteServer({ root: path.join(root, 'admin'), server: { host: '127.0.0.1', port: adminPort, strictPort: true, proxy: {} }, plugins: [{ name: 'course-training-preview', configureServer(server) { server.middlewares.use(async (req, res, next) => { if (req.url.startsWith('/static/')) return staticFile(req, res, req.url, webRoot); try { if (!await api(req, res)) next() } catch { res.writeHead(500); res.end() } }) } }] })
await admin.listen(); admin.printUrls()

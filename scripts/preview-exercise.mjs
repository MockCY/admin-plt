import { createServer } from 'vite'

// Isolated visual QA: no requests are forwarded to the real admin API.
let exercise = { id: 1, name: '徒手深蹲', bodyPart: '下肢', level: '基础', equipment: '核心床（Reformer）', suggestedSets: 2, target: '', cue: '双脚与肩同宽，髋部向后下方坐，起身时脚掌稳定踩地。\n保持核心收紧，膝盖与脚尖方向一致。', safetyTip: '打开锁紧装置，注意控制速度。', springSets: [2, 3], keyPoints: '肩胛下沉\n手肘不超伸', commonMistakes: '塌腰代偿\n膝盖内扣', status: 'DRAFT', sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
const server = await createServer({ server: { host: '127.0.0.1', port: 5178, strictPort: true }, plugins: [{ name: 'exercise-preview', configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname
    if (!path.startsWith('/api/')) return next()
    res.setHeader('Content-Type', 'application/json')
    if (path.endsWith('/auth/login')) return res.end(JSON.stringify({ token: 'exercise-preview-only', username: '预览' }))
    if (path.endsWith('/me')) return res.end(JSON.stringify({ username: '预览' }))
    if (path === '/api/admin/exercises/1' && req.method === 'PUT') {
      let body = ''; for await (const chunk of req) body += chunk
      exercise = { ...exercise, ...JSON.parse(body) }
      return res.end(JSON.stringify(exercise))
    }
    if (path === '/api/admin/exercises') return res.end(JSON.stringify({ items: [exercise], total: 1, page: 1, pageSize: 20 }))
    res.end(JSON.stringify({}))
  })
} }] })
await server.listen()
server.printUrls()

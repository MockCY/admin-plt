import { createServer } from 'vite'

// Local visual QA fixtures only. This server never forwards admin API calls.
const now = Date.now()
const iso = seconds => new Date(now + seconds * 1000).toISOString()
const users = [
  { id: 91001, nickname: '测试用户 · 在线', status: 'ACTIVE', workoutCount: 12, totalMinutes: 180, createdAt: iso(-864000), updatedAt: iso(-100), presence: { online: true, lastOnlineAt: iso(-480), lastOfflineAt: iso(-3600) } },
  { id: 91002, nickname: '测试用户 · 离线', status: 'ACTIVE', workoutCount: 5, totalMinutes: 75, createdAt: iso(-432000), updatedAt: iso(-100), presence: { online: false, lastOnlineAt: iso(-7200), lastOfflineAt: iso(-6000) } },
  { id: 91003, nickname: '测试用户 · 无记录', status: 'ACTIVE', workoutCount: 0, totalMinutes: 0, createdAt: iso(-3600), updatedAt: iso(-100), presence: { online: false } },
]
const server = await createServer({
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
  plugins: [{ name: 'presence-preview', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, 'http://127.0.0.1:5176')
      if (!url.pathname.startsWith('/api/')) return next()
      res.setHeader('Content-Type', 'application/json')
      const send = value => res.end(JSON.stringify(value))
      const page = Number(url.searchParams.get('page') || 1)
      const paged = items => ({ items: items.slice((page - 1) * 20, page * 20), total: items.length, page, pageSize: 20 })
      if (url.pathname === '/api/admin/auth/login') return send({ token: 'local-preview-only', username: '预览管理员' })
      if (url.pathname === '/api/admin/me') return send({ username: '预览管理员' })
      if (url.pathname === '/api/admin/device-models') return send([])
      if (url.pathname === '/api/admin/devices') {
        const devices = [
          { id: 1, serialNumber: 'TEST-BOUND', deviceModel: '测试设备', brand: 'ARVELLO', deviceSource: 'OWN', bound: true, boundUserId: 91001, boundUserName: '测试用户', boundAt: iso(-3600), createdAt: iso(-86400) },
          { id: 2, serialNumber: 'TEST-RELEASED', deviceModel: '测试设备', brand: 'ARVELLO', deviceSource: 'OWN', bound: false, boundAt: iso(-7200), unboundAt: iso(-1800), createdAt: iso(-86400) },
          { id: 3, serialNumber: 'TEST-NEW', deviceModel: '测试设备', brand: 'ARVELLO', deviceSource: 'OWN', bound: false, createdAt: iso(-86400) },
        ]
        const status = url.searchParams.get('bindingStatus') || 'ALL'
        return send(paged(devices.filter(item => status === 'ALL' || status === (item.bound ? 'BOUND' : item.unboundAt ? 'RELEASED' : 'UNBOUND'))))
      }
      if (url.pathname === '/api/admin/users') {
        const query = url.searchParams.get('query') || ''
        const presence = url.searchParams.get('presence') || 'ALL'
        return send(paged(users.filter(user => user.nickname.includes(query) && (presence === 'ALL' || user.presence.online === (presence === 'ONLINE')))))
      }
      const match = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/presence$/)
      if (match) {
        const user = users.find(item => item.id === Number(match[1]))
        if (!user?.presence.lastOnlineAt) return send(paged([]))
        const visits = Array.from({ length: 24 }, (_, index) => ({ id: index + 1, onlineAt: iso(-480 - index * 7200), offlineAt: index === 0 && user.presence.online ? null : iso(-60 - index * 7200), endReason: index === 0 && user.presence.online ? null : index % 2 ? 'TIMEOUT' : 'CLOSED' }))
        return send(paged(visits))
      }
      res.statusCode = 405
      send({ message: '此预览仅提供用户在线状态与历史记录' })
    })
  } }],
})
await server.listen()
server.printUrls()

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'arvello_admin_token'

export type ApiError = { code?: string; message?: string }

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && !response.url.endsWith('/auth/login')) {
      setToken(null)
      window.dispatchEvent(new Event('admin-session-expired'))
    }
    throw new Error((data as ApiError).message || '请求失败，请稍后重试')
  }
  return data as T
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE}/api/admin${path}`, { ...options, headers })
  return parseResponse<T>(response)
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE}/api/admin${path}`, { headers })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as ApiError
    if (response.status === 401) {
      setToken(null)
      window.dispatchEvent(new Event('admin-session-expired'))
    }
    throw new Error(data.message || '文件获取失败，请稍后重试')
  }
  return response.blob()
}

export function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}

export async function uploadMedia(file: File, kind: 'image' | 'video') {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  return api<{ url: string; size: number; originalName: string }>('/media/upload', { method: 'POST', body: form })
}

const MEDIA_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

export async function downloadMedia(path: string, preferredName?: string) {
  const response = await fetch(mediaUrl(path))
  if (!response.ok) throw new Error('媒体文件下载失败，请稍后重试')

  const blob = await response.blob()
  const sourceName = path.split(/[?#]/)[0].split('/').pop() || 'media'
  const sourceExtension = sourceName.match(/\.[a-z0-9]+$/i)?.[0] || MEDIA_EXTENSIONS[blob.type] || ''
  const baseName = (preferredName || sourceName.replace(/\.[a-z0-9]+$/i, '') || 'media')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .trim() || 'media'
  const filename = /\.[a-z0-9]+$/i.test(baseName) ? baseName : `${baseName}${sourceExtension}`
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export function mediaUrl(path?: string | null) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const apiPath = path.replace(/^\/media\//, '/api/media/files/')
  return `${API_BASE}${apiPath}`
}

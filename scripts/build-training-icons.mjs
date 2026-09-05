import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Clock3, ChartNoAxesColumnIncreasing, Flame, Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Music2, Check, Pause, RotateCcw, Maximize } from 'lucide-react'
import { writeFileSync, mkdirSync } from 'node:fs'
const directory = new URL('../../we-plt/static/training/', import.meta.url)
mkdirSync(directory, { recursive: true })
for (const [name, icon] of Object.entries({ clock: Clock3, level: ChartNoAxesColumnIncreasing, flame: Flame, play: Play, back: ChevronLeft, next: ChevronRight, volume: Volume2, muted: VolumeX, music: Music2, check: Check, pause: Pause, replay: RotateCcw, fullscreen: Maximize })) {
  writeFileSync(new URL(`${name}.svg`, directory), renderToStaticMarkup(createElement(icon, { size: 24, color: name === 'play' || name === 'pause' ? '#ffffff' : '#6e8e60', strokeWidth: 1.8 })))
}

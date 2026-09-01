import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const html = fs.readFileSync(path.join(root, 'maquette/apercu-pc-3d.html'), 'utf8')
const match = html.match(/<style>([\s\S]*?)<\/style>/)
if (!match) {
  throw new Error('style block not found')
}

let css = match[1]
const cut = css.indexOf('/* ============================================================\n   UI 2D')
if (cut > 0) {
  css = css.slice(0, cut)
}

css = css.replace(/:root \{[\s\S]*?\}\n\n\*[\s\S]*?body::after \{[\s\S]*?\}\n\n/, '')

const processed = await postcss([
  (rootNode) => {
    rootNode.walkRules((rule) => {
      const parent = rule.parent
      if (parent?.type === 'atrule' && parent.name === 'keyframes') {
        return
      }

      rule.selectors = rule.selectors.map((selector) => {
        const trimmed = selector.trim()
        if (trimmed.startsWith(':root')) {
          return '.dp-pc-preview'
        }
        if (trimmed.startsWith('[data-fx=') || trimmed.startsWith('[data-power=')) {
          return `.dp-pc-preview${trimmed}`
        }
        return `.dp-pc-preview ${trimmed}`
      })
    })
  },
]).process(css, { from: undefined })

let body = processed.css
body = body.replace(/position:\s*fixed/g, 'position: absolute')
body = body.replace(/inset:\s*0 250px 0 0/g, 'inset: 0')
body = body.replace(/\.stage\.dragging/g, '.stage.stage--dragging')
body = body.replace(/@keyframes drift1/g, '@keyframes dp-pv-drift1-old')

const header = `/* Ported from maquette/apercu-pc-3d.html */
.dp-pc-preview {
  --mono: var(--app-font-mono);
  --disp: var(--app-font-display);
  --c1: var(--scene-a);
  --c2: var(--scene-b);
  --c3: var(--scene-c);
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  overflow: hidden;
  padding: 0;
  background: #07050d;
  user-select: none;
  -webkit-user-select: none;
}

.dp-pc-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.dp-pc-preview .aurora {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.dp-pc-preview .aurora span {
  position: absolute;
  width: 44%;
  height: 44%;
  border-radius: 50%;
  filter: blur(90px);
  mix-blend-mode: screen;
  opacity: 0.5;
  transition: background 0.8s ease;
}

.dp-pc-preview .aurora .a1 { left: -12%; top: -16%; background: radial-gradient(circle, var(--c1), transparent 65%); animation: dp-pv-drift1 14s ease-in-out infinite; }
.dp-pc-preview .aurora .a2 { right: -14%; top: 4%; background: radial-gradient(circle, var(--c2), transparent 65%); animation: dp-pv-drift2 17s ease-in-out infinite; }
.dp-pc-preview .aurora .a3 { left: 28%; bottom: -26%; background: radial-gradient(circle, var(--c3), transparent 65%); animation: dp-pv-drift3 15s ease-in-out infinite; }

@keyframes dp-pv-drift1 { 50% { transform: translate(6%, 4%) scale(1.15); } }
@keyframes dp-pv-drift2 { 50% { transform: translate(-5%, 6%) scale(1.12); } }
@keyframes dp-pv-drift3 { 50% { transform: translate(4%, -5%) scale(1.18); } }

.dp-pc-preview .hud {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 18px;
}

.dp-pc-preview .hud-top {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.dp-pc-preview .live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--app-font-mono);
  font-size: 10.5px;
  color: rgb(255 255 255 / 0.75);
}

.dp-pc-preview .live i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c1);
  box-shadow: 0 0 8px var(--c1);
  animation: bleed 2s ease-in-out infinite;
}

.dp-pc-preview .live--hw i {
  background: var(--app-ok);
  box-shadow: 0 0 8px var(--app-ok);
}

.dp-pc-preview .hud-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.dp-pc-preview .scene-meta h2 {
  margin-top: 4px;
  font-family: var(--app-font-display);
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 0.95;
  text-shadow: 0 0 30px color-mix(in srgb, var(--c2) 45%, transparent);
}

.dp-pc-preview .scene-meta p {
  margin-top: 8px;
  font-family: var(--app-font-mono);
  font-size: 11px;
  color: var(--app-ink-soft);
}

.dp-pc-preview .scene-meta p b { color: var(--app-ink); font-weight: 600; }

.dp-pc-preview .hint {
  font-family: var(--app-font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: rgb(255 255 255 / 0.38);
  text-align: right;
}

.dp-pc-preview .part.part--off .sk:not(.fan),
.dp-pc-preview .part.part--off .fan > * {
  filter: brightness(0.14) saturate(0.3);
}

`

const out = path.join(root, 'web/app/assets/css/pc-preview-3d.css')
fs.writeFileSync(out, header + body)
console.log('Wrote', out, (header + body).split('\n').length, 'lines')

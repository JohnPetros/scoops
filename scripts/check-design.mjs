#!/usr/bin/env node
// Checks the Scoops Doop canvas against the design rules: contrast, tokens,
// typography, spacing and radius, and canvas hygiene.
//
// Doop is only reachable through its MCP, so the script reads a snapshot that an agent
// saved with the Doop MCP (default directory .design-snapshot, see --snapshot):
//   frames.json     { "canvasId", "pages": { "<pageId>": "<name>" }, "frames": [
//                     { "id", "name", "pageId", "x", "y", "width", "height", "updatedAt" } ] }
//                   (copy those fields from each get_frame response)
//   <frameId>.html  the html of get_frame with expand_components: true
//   tokens.json     the output of get_tokens (format json)
//   components.json optional { "<componentId>": "<name>" } from list_components
// Each frame is rendered with Playwright (Chromium) and measured in the browser.
//
// Usage: node scripts/check-design.mjs [--snapshot <dir>] [--page <name>]
//   [--frame <name>] [--rule <rule|category>] [--all] [--json]
//   [--update-baseline] [--digest]
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_PATH = path.join(ROOT_DIRECTORY, '.design-check.json')
const BASELINE_PATH = path.join(ROOT_DIRECTORY, '.design-check-baseline.json')
const DEFAULT_SNAPSHOT_DIRECTORY = '.design-snapshot'

const RULE_CATEGORIES = {
  contrast: 'contrast',
  'icon-contrast': 'contrast',
  'color-unbound': 'tokens',
  'color-near-token': 'tokens',
  'color-off-palette': 'tokens',
  'token-missing': 'tokens',
  'type-min-size': 'typography',
  'type-scale': 'typography',
  'type-family': 'typography',
  'type-weight': 'typography',
  'text-overflow': 'typography',
  'text-clipped': 'typography',
  spacing: 'spacing',
  radius: 'spacing',
  'section-overlap': 'hygiene',
  'default-name': 'hygiene',
  'empty-frame': 'hygiene',
  'hidden-layer': 'hygiene',
  'broken-component': 'hygiene',
}

const DEFAULT_FRAME_NAME =
  /^(frame|untitled|new frame|artboard|frame sem título|sem título)( \d+)?$/i

// ---------------------------------------------------------------- colors

function clampChannel(value) {
  return Math.min(255, Math.max(0, value))
}

export function parseHex(value) {
  let hex = String(value ?? '')
    .trim()
    .replace(/^#/, '')
  if (hex.length === 4) hex = [...hex.slice(0, 3)].map((char) => char + char).join('')
  if (hex.length === 3) hex = [...hex].map((char) => char + char).join('')
  if (hex.length === 8) hex = hex.slice(0, 6)
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
}

function toHex(rgb) {
  return `#${rgb
    .map((channel) => Math.round(clampChannel(channel)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

// Reads the colors a browser reports: hex, rgb()/rgba(), color(srgb …) and transparent.
export function parseCssColor(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!text || text === 'none') return null
  if (text === 'transparent') return { rgb: [0, 0, 0], alpha: 0 }
  if (text.startsWith('#')) {
    const rgb = parseHex(text)
    if (!rgb) return null
    const digits = text.slice(1)
    const alpha =
      digits.length === 8
        ? Number.parseInt(digits.slice(6, 8), 16) / 255
        : digits.length === 4
          ? Number.parseInt(digits[3] + digits[3], 16) / 255
          : 1
    return { rgb, alpha }
  }
  const functional = text.match(/^(rgba?|color)\((.*)\)$/)
  if (!functional) return null
  const [channelsText, alphaText] = functional[2].split('/')
  const numbers = channelsText
    .replace(/^srgb\s+/, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  if (numbers.length < 3 || numbers.some((number) => Number.isNaN(number))) return null
  const scale = functional[1] === 'color' ? 255 : 1
  let alpha = alphaText === undefined ? (numbers[3] ?? 1) : Number(alphaText.trim())
  if (alphaText?.trim().endsWith('%')) alpha = Number.parseFloat(alphaText) / 100
  return {
    rgb: numbers.slice(0, 3).map((number) => clampChannel(number * scale)),
    alpha: Number.isFinite(alpha) ? alpha : 1,
  }
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(first, second) {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function blend(top, alpha, bottom) {
  return top.map((channel, index) => channel * alpha + bottom[index] * (1 - alpha))
}

function toLab(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const x = (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  const z = (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883
  const f = (value) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

export function deltaE(first, second) {
  const a = toLab(first)
  const b = toLab(second)
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

// ---------------------------------------------------------------- tokens

function pixelValue(value) {
  const match = String(value)
    .trim()
    .match(/^(-?\d*\.?\d+)px$/)
  return match ? Number(match[1]) : null
}

// Resolves the get_tokens json into colors and spacing/radius scales. `var(--other)`
// aliases are followed and, for any theme but the default dark one, the token's
// per-theme value wins.
export function resolveTokens(tokensJson, theme = 'dark') {
  const list = Array.isArray(tokensJson) ? tokensJson : (tokensJson?.tokens ?? [])
  const raw = new Map()
  for (const token of list) {
    const themed = theme === 'dark' ? undefined : token.themes?.[theme]
    raw.set(token.name, { type: token.type, value: String(themed ?? token.value) })
  }
  const resolved = new Map()
  const resolve = (name, seen = new Set()) => {
    if (resolved.has(name)) return resolved.get(name)
    const token = raw.get(name)
    if (!token || seen.has(name)) return null
    seen.add(name)
    let value = token.value
    const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)
    if (alias) value = resolve(alias[1], seen)?.value ?? null
    const result = value === null ? null : { type: token.type, value }
    resolved.set(name, result)
    return result
  }
  for (const name of raw.keys()) resolve(name)

  const colors = new Map()
  const colorsByHex = new Map()
  const numbersByType = new Map()
  for (const [name, token] of resolved) {
    if (!token) continue
    if (token.type === 'color') {
      const parsed = parseCssColor(token.value)
      if (!parsed || parsed.alpha < 1) continue
      const hex = toHex(parsed.rgb)
      colors.set(name, { hex, rgb: parsed.rgb })
      colorsByHex.set(hex, [...(colorsByHex.get(hex) ?? []), name])
    } else {
      const number = pixelValue(token.value)
      if (number !== null) {
        numbersByType.set(
          token.type,
          new Set([...(numbersByType.get(token.type) ?? []), number]),
        )
      }
    }
  }
  return { colors, colorsByHex, numbersByType, names: new Set(raw.keys()) }
}

// ---------------------------------------------------------------- snapshot

export function loadSnapshot(directory, readFile = readFileSync, exists = existsSync) {
  const resolvedDirectory = path.resolve(directory)
  const read = (name) => path.join(resolvedDirectory, name)
  if (!exists(read('frames.json'))) {
    throw new Error(
      `No snapshot in ${resolvedDirectory}: frames.json is missing. Save the frames with the Doop MCP first (see documentation/tooling.md).`,
    )
  }
  const index = JSON.parse(readFile(read('frames.json'), 'utf8'))
  const listed = Array.isArray(index) ? index : (index.frames ?? [])
  const pages = Array.isArray(index) ? {} : (index.pages ?? {})
  const tokens = exists(read('tokens.json'))
    ? JSON.parse(readFile(read('tokens.json'), 'utf8'))
    : { tokens: [] }
  const components = exists(read('components.json'))
    ? JSON.parse(readFile(read('components.json'), 'utf8'))
    : {}
  const frames = listed.map((item) => {
    if (!item.id || !item.name) {
      throw new Error(
        `Every frame in frames.json needs an id and a name: ${JSON.stringify(item)}`,
      )
    }
    const htmlPath = read(`${item.id}.html`)
    return {
      id: item.id,
      name: item.name,
      page: item.page ?? pages[item.pageId] ?? item.pageId ?? 'Canvas',
      x: item.x,
      y: item.y,
      width: item.width ?? 1440,
      height: item.height ?? 900,
      updatedAt: item.updatedAt,
      html: exists(htmlPath) ? readFile(htmlPath, 'utf8') : null,
    }
  })
  const updates = frames.map((frame) => frame.updatedAt).filter(Boolean)
  return {
    canvasId: index.canvasId,
    tokens,
    components,
    frames,
    updatedAt: updates.sort().at(-1) ?? null,
  }
}

function matchesFilters(frame, section, filters) {
  if (filters.page && !frame.page.toLowerCase().includes(filters.page.toLowerCase()))
    return false
  if (
    filters.frame &&
    !`${section} ${frame.name}`.toLowerCase().includes(filters.frame.toLowerCase())
  )
    return false
  return true
}

function isExcluded(frame, config) {
  return config.excludeFrames.some((part) =>
    frame.name.toLowerCase().includes(part.toLowerCase()),
  )
}

function frameBox(frame) {
  return {
    x1: frame.x,
    y1: frame.y,
    x2: frame.x + frame.width,
    y2: frame.y + frame.height,
  }
}

function contains(outer, inner, tolerance = 0.5) {
  return (
    inner.x1 >= outer.x1 - tolerance &&
    inner.y1 >= outer.y1 - tolerance &&
    inner.x2 <= outer.x2 + tolerance &&
    inner.y2 <= outer.y2 + tolerance
  )
}

function intersects(first, second) {
  return (
    first.x1 < second.x2 &&
    second.x1 < first.x2 &&
    first.y1 < second.y2 &&
    second.y1 < first.y2
  )
}

function hasPosition(frame) {
  return Number.isFinite(frame.x) && Number.isFinite(frame.y)
}

// The section of a screen is the smallest other frame of its page that contains it.
export function sectionOf(frame, frames) {
  if (!hasPosition(frame)) return frame.name
  const box = frameBox(frame)
  let best = null
  for (const other of frames) {
    if (other.id === frame.id || other.page !== frame.page || !hasPosition(other))
      continue
    const otherBox = frameBox(other)
    const area = other.width * other.height
    if (area <= frame.width * frame.height || !contains(otherBox, box)) continue
    if (!best || area < best.area) best = { name: other.name, area }
  }
  return best?.name ?? frame.name
}

// ---------------------------------------------------------------- collector

// Runs inside the browser: measures every rendered element of one frame. It must not use
// anything from the surrounding module.
function collectInPage() {
  const SKIPPED = new Set([
    'HEAD',
    'STYLE',
    'SCRIPT',
    'LINK',
    'META',
    'TITLE',
    'TEMPLATE',
  ])
  const result = {
    elements: [],
    styleBlocks: [],
    componentStyles: [],
    tokenStyles: [],
    unexpanded: document.querySelectorAll('doop-use').length,
  }
  for (const style of document.querySelectorAll('style')) {
    const componentId =
      style.getAttribute('data-doop-component-source') ??
      style.getAttribute('data-doop-component-css')
    if (style.hasAttribute('data-doop-tokens')) result.tokenStyles.push(style.textContent)
    else if (componentId !== null)
      result.componentStyles.push({ id: componentId, css: style.textContent })
    else result.styleBlocks.push(style.textContent)
  }

  const nth = (element) => {
    let index = 1
    for (
      let node = element.previousElementSibling;
      node;
      node = node.previousElementSibling
    )
      index++
    return index
  }
  const selectorOf = (element) => {
    const parts = []
    for (
      let node = element;
      node && node !== document.documentElement;
      node = node.parentElement
    )
      parts.unshift(`${node.tagName.toLowerCase()}:${nth(node)}`)
    return parts.join('>')
  }
  const opacityCache = new WeakMap()
  const opacityOf = (element) => {
    if (!element || element === document.documentElement) return 1
    if (opacityCache.has(element)) return opacityCache.get(element)
    const value =
      Number.parseFloat(getComputedStyle(element).opacity || '1') *
      opacityOf(element.parentElement)
    opacityCache.set(element, value)
    return value
  }
  const boxOf = (rect) => ({
    x1: rect.left,
    y1: rect.top,
    x2: rect.right,
    y2: rect.bottom,
  })
  const pixels = (value, base) => {
    const text = String(value ?? '')
      .trim()
      .split(' ')[0]
    if (text.endsWith('%')) return (Number.parseFloat(text) / 100) * base
    const number = Number.parseFloat(text)
    return Number.isFinite(number) ? number : 0
  }
  const backdropOf = (element, rect) => {
    const x = Math.min(window.innerWidth - 1, Math.max(0, (rect.left + rect.right) / 2))
    const y = Math.min(window.innerHeight - 1, Math.max(0, (rect.top + rect.bottom) / 2))
    const stack = document.elementsFromPoint(x, y)
    const index = stack.indexOf(element)
    const below = index >= 0 ? stack.slice(index) : []
    if (index < 0) {
      for (let node = element; node; node = node.parentElement) below.push(node)
    }
    const layers = []
    for (const node of below.reverse()) {
      const style = getComputedStyle(node)
      const hasImage = style.backgroundImage !== 'none'
      if (style.backgroundColor === 'rgba(0, 0, 0, 0)' && !hasImage) continue
      layers.push({
        color: style.backgroundColor,
        opacity: opacityOf(node),
        image: hasImage,
      })
    }
    return layers
  }

  const everything = [document.body, ...document.body.querySelectorAll('*')]
  for (const element of everything) {
    if (SKIPPED.has(element.tagName)) continue
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const rendered = style.display !== 'none' && (rect.width > 0 || rect.height > 0)
    const insideSvg = Boolean(element.parentElement?.closest('svg'))
    const hiddenSelf = style.display === 'none' || element.hasAttribute('hidden')
    if (!rendered && !hiddenSelf) continue
    const parentRendered =
      element.parentElement && getComputedStyle(element.parentElement).display !== 'none'
    const ownText = [...element.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    let textRect = rect
    if (ownText && rendered) {
      const range = document.createRange()
      range.selectNodeContents(element)
      const textRects = [...range.getClientRects()].filter(
        (item) => item.width > 0 && item.height > 0,
      )
      if (textRects.length) {
        textRect = {
          left: Math.min(...textRects.map((item) => item.left)),
          top: Math.min(...textRects.map((item) => item.top)),
          right: Math.max(...textRects.map((item) => item.right)),
          bottom: Math.max(...textRects.map((item) => item.bottom)),
        }
      }
    }
    const component = element.closest('[data-doop-component],[data-doop-instance]')
    const isSvgRoot = element.tagName.toLowerCase() === 'svg' && !insideSvg
    let clipper = null
    if (ownText && rendered) {
      for (
        let node = element;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const nodeStyle = getComputedStyle(node)
        const clips = ['hidden', 'clip'].some(
          (value) => nodeStyle.overflowX === value || nodeStyle.overflowY === value,
        )
        if (clips) {
          clipper = {
            box: boxOf(node.getBoundingClientRect()),
            selector: selectorOf(node),
          }
          break
        }
      }
    }
    const minSide = Math.min(rect.width, rect.height)
    const record = {
      selector: selectorOf(element),
      tag: element.tagName.toLowerCase(),
      className: (element.getAttribute('class') ?? '').split(/\s+/)[0] || null,
      component:
        component?.getAttribute('data-doop-component') ??
        component?.getAttribute('data-doop-instance') ??
        null,
      inComponent: Boolean(component),
      rendered,
      hiddenSelf: hiddenSelf && Boolean(parentRendered),
      inSvg: insideSvg,
      text: ownText,
      box: boxOf(rect),
      textBox: ownText ? boxOf(textRect) : null,
      childCount: element.childElementCount,
      color: style.color,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number.parseInt(style.fontWeight, 10),
      fontFamily: style.fontFamily,
      ellipsis: style.textOverflow === 'ellipsis',
      opacity: opacityOf(element),
      display: style.display,
      padding: [
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
      ].map(Number.parseFloat),
      gap:
        style.display.includes('flex') || style.display.includes('grid')
          ? [
              Number.parseFloat(style.rowGap) || 0,
              Number.parseFloat(style.columnGap) || 0,
            ]
          : [0, 0],
      flexDirection: style.flexDirection,
      radii: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ].map((value) => pixels(value, minSide)),
      clipper: clipper,
      backdrop: ownText && rendered ? backdropOf(element, textRect) : null,
      icon: null,
      inlineStyle: element.getAttribute('style'),
      colorAttributes: ['fill', 'stroke']
        .map((name) => [name, element.getAttribute(name)])
        .filter(([, value]) => value),
    }
    if (isSvgRoot && rendered) {
      record.icon = {
        stroke: style.stroke,
        strokeWidth: Number.parseFloat(style.strokeWidth) || 0,
        fill: style.fill,
        backdrop: backdropOf(element, rect),
      }
    }
    result.elements.push(record)
  }
  return result
}

function loadPlaywright() {
  try {
    return createRequire(import.meta.url)('playwright')
  } catch {
    throw new Error(
      'Playwright is not available. Run pnpm install and pnpm exec playwright install chromium.',
    )
  }
}

const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//

// Renders every selected frame in Chromium and returns the measured elements per frame id.
export async function collectFrames(frames, config) {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch()
  const collected = new Map()
  try {
    for (const frame of frames) {
      const context = await browser.newContext({
        viewport: { width: Math.ceil(frame.width), height: Math.ceil(frame.height) },
      })
      const page = await context.newPage()
      await page.route('**/*', (route) => {
        const url = route.request().url()
        if (url.startsWith('data:') || url.startsWith('about:') || FONT_HOSTS.test(url))
          return route.continue()
        return route.abort()
      })
      try {
        await page.setContent(frame.html, { waitUntil: 'load', timeout: 20000 })
      } catch {
        // Fonts may be unreachable offline; the fallback font still renders the frame.
      }
      if (config.theme === 'light') {
        await page.evaluate(() =>
          document.documentElement.setAttribute('data-doop-theme', 'light'),
        )
      }
      await page.evaluate(() => document.fonts?.ready).catch(() => {})
      collected.set(frame.id, await page.evaluate(collectInPage))
      await context.close()
    }
  } finally {
    await browser.close()
  }
  return collected
}

// ---------------------------------------------------------------- rules

function finding(rule, severity, location, message, key = '') {
  return {
    rule,
    category: RULE_CATEGORIES[rule],
    severity,
    ...location,
    message,
    fingerprint: `${rule}:${location.frameId}:${location.selector}${key ? `:${key}` : ''}`,
  }
}

function formatPercent(alpha) {
  return alpha < 0.995 ? ` at ${Math.round(alpha * 100)}%` : ''
}

function labelOf(element, components) {
  const base = `${element.tag}${element.className ? `.${element.className}` : ''}`
  const name = element.component ? components[element.component] : null
  const text = element.text ? ` “${element.text.slice(0, 24)}”` : ''
  return `${name ? `${name} › ` : ''}${base}${text}`
}

function locationOf(context, element) {
  return {
    page: context.frame.page,
    section: context.section,
    screen: context.frame.name,
    frameId: context.frame.id,
    layer: element ? labelOf(element, context.components) : context.frame.name,
    selector: element ? element.selector : context.frame.id,
  }
}

// Composites the backdrop layers (bottom to top) over white; an image or gradient that no
// opaque layer covers makes the result unknown.
function backgroundOf(layers) {
  let rgb = [255, 255, 255]
  let unknown = false
  for (const layer of layers ?? []) {
    if (layer.image) unknown = true
    const color = parseCssColor(layer.color)
    if (!color) continue
    const alpha = color.alpha * layer.opacity
    if (alpha <= 0) continue
    rgb = blend(color.rgb, alpha, rgb)
    if (alpha >= 1) unknown = false
  }
  return { rgb, unknown }
}

function checkTextContrast(context, element, report, stats) {
  if (!element.text || !element.rendered || !element.backdrop) return
  const background = backgroundOf(element.backdrop)
  if (background.unknown) {
    stats.unknownBackgrounds++
    return
  }
  const color = parseCssColor(element.color)
  if (!color) return
  const alpha = color.alpha * element.opacity
  const foreground = blend(color.rgb, alpha, background.rgb)
  const ratio = contrastRatio(foreground, background.rgb)
  const large =
    element.fontSize >= 24 || (element.fontSize >= 18.66 && element.fontWeight >= 700)
  const required = large ? 3 : 4.5
  if (ratio >= required) return
  report(
    finding(
      'contrast',
      'error',
      locationOf(context, element),
      `${ratio.toFixed(2)}:1 < ${required}:1 · "${element.text.slice(0, 32)}" ${element.fontSize}px ${toHex(color.rgb)}${formatPercent(alpha)} on ${toHex(background.rgb)}`,
    ),
  )
}

function checkIconContrast(context, element, report) {
  if (!element.icon) return
  const { icon } = element
  const stroke = icon.strokeWidth > 0 ? parseCssColor(icon.stroke) : null
  const paint = stroke ?? parseCssColor(icon.fill)
  if (!paint) return
  const background = backgroundOf(icon.backdrop)
  if (background.unknown) return
  const alpha = paint.alpha * element.opacity
  const ratio = contrastRatio(blend(paint.rgb, alpha, background.rgb), background.rgb)
  if (ratio >= 3) return
  report(
    finding(
      'icon-contrast',
      'warning',
      locationOf(context, element),
      `${ratio.toFixed(2)}:1 < 3:1 · ${toHex(paint.rgb)}${formatPercent(alpha)} on ${toHex(background.rgb)}`,
    ),
  )
}

const COLOR_LITERAL =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?)\([^)]*\)/gi

// hsl() is only reported as a literal, since it has no direct hex reading here.
function literalToRgb(literal) {
  if (/^hsl/i.test(literal)) return null
  return parseCssColor(literal)
}

function classifyColor(rgb, tokens, config) {
  const exact = tokens.colorsByHex.get(toHex(rgb))
  if (exact) return { rule: 'color-unbound', severity: 'warning', tokens: exact }
  let nearest = null
  for (const [name, token] of tokens.colors) {
    const distance = deltaE(rgb, token.rgb)
    if (!nearest || distance < nearest.distance)
      nearest = { name, distance, hex: token.hex }
  }
  if (nearest && nearest.distance <= config.nearTokenDeltaE) {
    return { rule: 'color-near-token', severity: 'error', nearest }
  }
  return { rule: 'color-off-palette', severity: 'error', nearest }
}

function checkCssText(context, cssText, location, tokens, config, report, label) {
  const declared = new Set(
    [...cssText.matchAll(/(--[\w-]+)\s*:/g)].map((item) => item[1]),
  )
  const known = new Set([...tokens.names, ...context.localTokens, ...declared])
  const missing = [
    ...new Set([...cssText.matchAll(/var\(\s*(--[\w-]+)/g)].map((item) => item[1])),
  ].filter((name) => !known.has(name))
  for (const name of missing) {
    report(
      finding(
        'token-missing',
        'error',
        location,
        `${label} uses unknown token ${name}`,
        name,
      ),
    )
  }
  const seen = new Set()
  for (const literal of cssText.match(COLOR_LITERAL) ?? []) {
    const parsed = literalToRgb(literal)
    const hex = parsed ? toHex(parsed.rgb) : literal.toLowerCase()
    if (seen.has(hex) || parsed?.alpha === 0) continue
    seen.add(hex)
    if (parsed && config.colorAllow.includes(hex)) continue
    if (!parsed) {
      report(
        finding(
          'color-off-palette',
          'error',
          location,
          `${label} ${literal} is not a token color; use a var(--color-*) token`,
          hex,
        ),
      )
      continue
    }
    const result = classifyColor(parsed.rgb, tokens, config)
    const message =
      result.rule === 'color-unbound'
        ? `${label} ${hex} matches ${result.tokens.slice(0, 2).join(' / ')}; bind the token`
        : result.rule === 'color-near-token'
          ? `${label} ${hex} is almost ${result.nearest.name} (${result.nearest.hex}, ΔE ${result.nearest.distance.toFixed(1)})`
          : `${label} ${hex} is not a token color${result.nearest ? ` (closest ${result.nearest.name} ${result.nearest.hex})` : ''}`
    report(finding(result.rule, result.severity, location, message, hex))
  }
}

function checkTokens(context, data, tokens, config, report) {
  for (const css of data.styleBlocks) {
    checkCssText(
      context,
      css,
      locationOf(context, null),
      tokens,
      config,
      report,
      '<style>',
    )
  }
  if (context.isComponentPage) {
    for (const { id, css } of data.componentStyles) {
      const name = context.components[id] ?? id
      checkCssText(
        context,
        css,
        locationOf(context, null),
        tokens,
        config,
        report,
        `${name} css`,
      )
    }
  }
  for (const element of data.elements) {
    if (element.inComponent && !context.isComponentPage) continue
    const attributes = element.colorAttributes.map(([name, value]) => `${name}:${value}`)
    const cssText = [element.inlineStyle, ...attributes].filter(Boolean).join(';')
    if (!cssText) continue
    checkCssText(
      context,
      cssText,
      locationOf(context, element),
      tokens,
      config,
      report,
      element.inlineStyle ? 'style' : 'svg paint',
    )
  }
}

function firstFamily(fontFamily) {
  return String(fontFamily ?? '')
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '')
}

function checkTypography(context, element, config, report) {
  if (!element.text || !element.rendered) return
  const location = locationOf(context, element)
  const typography = config.typography
  if (element.inComponent && !context.isComponentPage) return
  if (element.fontSize < typography.minSize) {
    report(
      finding(
        'type-min-size',
        'error',
        location,
        `${element.fontSize}px is below the ${typography.minSize}px minimum`,
      ),
    )
  } else if (!typography.sizes.includes(element.fontSize)) {
    report(
      finding(
        'type-scale',
        'warning',
        location,
        `${element.fontSize}px is not on the type scale (${typography.sizes.join(', ')})`,
      ),
    )
  }
  const family = firstFamily(element.fontFamily)
  if (!typography.families.includes(family)) {
    report(
      finding(
        'type-family',
        'error',
        location,
        `font ${family} is not allowed (${typography.families.join(', ')})`,
      ),
    )
  }
  if (!typography.weights.includes(element.fontWeight)) {
    report(
      finding(
        'type-weight',
        'warning',
        location,
        `weight ${element.fontWeight} is not allowed (${typography.weights.join(', ')})`,
      ),
    )
  }
}

function checkTextFit(context, element, report) {
  if (!element.text || !element.rendered || !element.textBox || element.ellipsis) return
  const location = locationOf(context, element)
  const frameArea = { x1: 0, y1: 0, x2: context.frame.width, y2: context.frame.height }
  if (!contains(frameArea, element.textBox, 1)) {
    report(finding('text-overflow', 'error', location, 'text runs outside the frame'))
    return
  }
  if (element.clipper && !contains(element.clipper.box, element.textBox, 1)) {
    report(
      finding(
        'text-clipped',
        'error',
        location,
        'text is cut off by an ancestor that clips its content',
      ),
    )
  }
}

function round(value) {
  return Math.round(value * 100) / 100
}

function checkSpacingAndRadius(context, element, tokens, config, report) {
  if (!element.rendered || element.inSvg || element.tag === 'body') return
  if (element.inComponent && !context.isComponentPage) return
  const location = locationOf(context, element)
  const spacing = new Set([
    0,
    ...(tokens.numbersByType.get('spacing') ?? []),
    ...config.spacing.extra,
  ])
  const gaps = element.childCount >= 2 ? element.gap : []
  const values = [...gaps, ...element.padding].map(round)
  const offScale = [...new Set(values.filter((value) => !spacing.has(value)))]
  if (offScale.length > 0) {
    report(
      finding(
        'spacing',
        'warning',
        location,
        `gap/padding ${offScale.join(', ')}px is not on the spacing scale (${[...spacing].sort((a, b) => a - b).join(', ')})`,
      ),
    )
  }
  if (element.tag === 'svg') return
  const radii = new Set([
    0,
    ...(tokens.numbersByType.get('radius') ?? []),
    ...config.radius.extra,
  ])
  const full =
    Math.min(element.box.x2 - element.box.x1, element.box.y2 - element.box.y1) / 2
  const offRadius = [...new Set(element.radii.map(round))].filter(
    (value) => !radii.has(value) && value < full - 0.5,
  )
  if (offRadius.length > 0) {
    report(
      finding(
        'radius',
        'warning',
        location,
        `radius ${offRadius.join(', ')}px is not allowed (${[...radii]
          .filter((value) => value < 9999)
          .sort((a, b) => a - b)
          .join(', ')} or fully round)`,
      ),
    )
  }
}

function checkHygiene(context, data, report) {
  const { frame } = context
  const location = locationOf(context, null)
  if (DEFAULT_FRAME_NAME.test(frame.name)) {
    report(
      finding(
        'default-name',
        'warning',
        location,
        `frame still has the default name "${frame.name}"`,
      ),
    )
  }
  const content = data.elements.filter(
    (element) => element.rendered && element.tag !== 'body',
  )
  if (content.length === 0) {
    report(finding('empty-frame', 'warning', location, 'frame is empty'))
  }
  if (data.unexpanded > 0) {
    report(
      finding(
        'broken-component',
        'error',
        location,
        `${data.unexpanded} instance(s) point to a component that no longer exists`,
      ),
    )
  }
  for (const element of data.elements) {
    if (!element.hiddenSelf || element.inComponent) continue
    report(
      finding(
        'hidden-layer',
        'warning',
        locationOf(context, element),
        'hidden element; remove it or show it',
      ),
    )
  }
}

function checkSectionOverlap(frames, report) {
  const byPage = new Map()
  for (const frame of frames) {
    if (!hasPosition(frame)) continue
    byPage.set(frame.page, [...(byPage.get(frame.page) ?? []), frame])
  }
  for (const pageFrames of byPage.values()) {
    for (let i = 0; i < pageFrames.length; i++) {
      for (let j = i + 1; j < pageFrames.length; j++) {
        const first = pageFrames[i]
        const second = pageFrames[j]
        const a = frameBox(first)
        const b = frameBox(second)
        if (!intersects(a, b) || contains(a, b) || contains(b, a)) continue
        const [left, right] = [first, second].sort((x, y) => x.id.localeCompare(y.id))
        report(
          finding(
            'section-overlap',
            'error',
            {
              page: left.page,
              section: left.name,
              screen: left.name,
              frameId: left.id,
              layer: left.name,
              selector: left.id,
            },
            `frame "${left.name}" overlaps "${right.name}"`,
            right.id,
          ),
        )
      }
    }
  }
}

// ---------------------------------------------------------------- runner

// `collected` maps a frame id to the elements measured by collectFrames.
export function analyzeSnapshot(snapshot, collected, config, filters = {}) {
  const tokens = resolveTokens(snapshot.tokens, config.theme)
  const findings = []
  const stats = { frames: 0, elements: 0, unknownBackgrounds: 0 }
  const frames = snapshot.frames.filter((frame) => !isExcluded(frame, config))
  const report = (item) => findings.push(item)
  if (!filters.frame && !filters.page) checkSectionOverlap(frames, report)
  for (const frame of frames) {
    const section = sectionOf(frame, frames)
    if (!matchesFilters(frame, section, filters)) continue
    const data = collected.get(frame.id)
    if (!data) continue
    stats.frames++
    const tokenValues = data.tokenStyles.join(' ')
    const context = {
      frame,
      section,
      components: snapshot.components ?? {},
      isComponentPage: config.componentPages.includes(frame.page),
      localTokens: new Set(
        [...tokenValues.matchAll(/(--[\w-]+)\s*:/g)].map((item) => item[1]),
      ),
    }
    checkHygiene(context, data, report)
    checkTokens(context, data, tokens, config, report)
    for (const element of data.elements) {
      stats.elements++
      checkTextContrast(context, element, report, stats)
      checkIconContrast(context, element, report)
      checkTypography(context, element, config, report)
      checkTextFit(context, element, report)
      checkSpacingAndRadius(context, element, tokens, config, report)
    }
  }
  const selected = filters.rule
    ? findings.filter(
        (item) => item.rule === filters.rule || item.category === filters.rule,
      )
    : findings
  return { findings: selected, stats }
}

export function normalizeConfig(raw = {}) {
  const ignore = raw.ignore ?? []
  for (const entry of ignore) {
    if (!entry.reason || !String(entry.reason).trim()) {
      throw new Error(`Every ignore entry needs a reason: ${JSON.stringify(entry)}`)
    }
    if (!entry.selector && !entry.layer) {
      throw new Error(
        `Every ignore entry needs a selector or a layer: ${JSON.stringify(entry)}`,
      )
    }
  }
  return {
    canvasId: raw.canvasId,
    theme: String(raw.theme ?? 'light').toLowerCase(),
    componentPages: raw.componentPages ?? ['🧩 Components'],
    excludeFrames: raw.excludeFrames ?? [],
    nearTokenDeltaE: raw.nearTokenDeltaE ?? 5,
    colorAllow: (raw.colorAllow ?? [])
      .map((value) => parseHex(value))
      .filter(Boolean)
      .map(toHex),
    typography: {
      minSize: raw.typography?.minSize ?? 11,
      sizes: raw.typography?.sizes ?? [
        11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 40, 42, 44, 56, 64, 72,
        80,
      ],
      families: raw.typography?.families ?? ['Manrope'],
      weights: raw.typography?.weights ?? [400, 500, 600, 700, 800, 900],
    },
    spacing: { extra: raw.spacing?.extra ?? [] },
    radius: { extra: raw.radius?.extra ?? [] },
    ignore,
  }
}

function matchesIgnore(item, entry) {
  if (entry.rule && entry.rule !== item.rule && entry.rule !== item.category) return false
  if (entry.selector) {
    return (
      entry.selector === item.selector &&
      (!entry.frameId || entry.frameId === item.frameId)
    )
  }
  if (entry.screen && !item.screen.includes(entry.screen)) return false
  return item.layer === entry.layer || item.layer.endsWith(` › ${entry.layer}`)
}

export function classifyFindings(findings, config, baseline) {
  const known = new Set(baseline?.findings ?? [])
  const current = new Set(findings.map((item) => item.fingerprint))
  const classified = findings.map((item) => {
    const ignored = config.ignore.find((entry) => matchesIgnore(item, entry))
    if (ignored) return { ...item, status: 'ignored', reason: ignored.reason }
    return { ...item, status: known.has(item.fingerprint) ? 'baseline' : 'new' }
  })
  const resolved = [...known].filter((fingerprint) => !current.has(fingerprint)).length
  return { findings: classified, resolved }
}

export function createBaseline(classifiedFindings, snapshot) {
  const findings = [
    ...new Set(
      classifiedFindings
        .filter((item) => item.status !== 'ignored')
        .map((item) => item.fingerprint),
    ),
  ].sort()
  return { canvasId: snapshot.canvasId, updatedAt: snapshot.updatedAt, findings }
}

function shortenLayer(layer) {
  const parts = layer.split(' › ')
  return parts.length > 3 ? `… › ${parts.slice(-3).join(' › ')}` : layer
}

function formatReport(result, snapshot, options) {
  const lines = []
  const visible = result.findings.filter((item) => options.all || item.status === 'new')
  lines.push(
    `check:design · ${snapshot.canvasId ?? 'canvas'} updated ${snapshot.updatedAt ?? 'unknown'} · ${result.stats.frames} frames · ${result.stats.elements} elements`,
  )
  const groups = new Map()
  for (const item of visible) {
    const key = `${item.page} › ${item.screen}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  for (const [key, items] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push('', key)
    for (const item of items.sort(
      (a, b) => a.severity.localeCompare(b.severity) || a.rule.localeCompare(b.rule),
    )) {
      const mark = item.severity === 'error' ? 'error' : 'warn '
      const status = item.status === 'new' ? '' : ` [${item.status}]`
      lines.push(`  ${mark} ${item.rule.padEnd(18)} ${shortenLayer(item.layer)}${status}`)
      lines.push(`        ${item.message}`)
    }
  }
  const count = (status, severity) =>
    result.findings.filter((item) => item.status === status && item.severity === severity)
      .length
  lines.push(
    '',
    `New: ${count('new', 'error')} errors, ${count('new', 'warning')} warnings. ` +
      `Baseline: ${count('baseline', 'error') + count('baseline', 'warning')}. ` +
      `Ignored: ${result.findings.filter((item) => item.status === 'ignored').length}.`,
  )
  if (result.resolved > 0) {
    lines.push(
      `${result.resolved} baseline findings are fixed; run pnpm run update:design-baseline to drop them.`,
    )
  }
  if (result.stats.unknownBackgrounds > 0) {
    lines.push(
      `${result.stats.unknownBackgrounds} texts sit on an image or gradient; their contrast was not checked.`,
    )
  }
  return lines.join('\n')
}

// A digest per frame, computed from the html that get_frame returns with
// expand_components, so any change to the frame, its tokens or its component styles
// changes it. Frames that are sections of other frames are digested too.
export function digestFrames(snapshot, config, filters = {}) {
  const digests = []
  const frames = snapshot.frames.filter((frame) => !isExcluded(frame, config))
  for (const frame of frames) {
    const section = sectionOf(frame, frames)
    if (!matchesFilters(frame, section, filters)) continue
    if (frame.html === null) {
      throw new Error(`No ${frame.id}.html in the snapshot for frame "${frame.name}".`)
    }
    const digest = createHash('sha256')
      .update(frame.html.replace(/\r\n/g, '\n'))
      .digest('hex')
      .slice(0, 16)
    digests.push({
      page: frame.page,
      section,
      frame: frame.name,
      frameId: frame.id,
      updatedAt: frame.updatedAt ?? null,
      digest,
    })
  }
  return digests
}

function readOption(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a value.`)
  return value
}

export function parseArguments(args) {
  return {
    snapshot: readOption(args, '--snapshot'),
    page: readOption(args, '--page'),
    frame: readOption(args, '--frame') ?? readOption(args, '--board'),
    rule: readOption(args, '--rule'),
    all: args.includes('--all'),
    json: args.includes('--json'),
    updateBaseline: args.includes('--update-baseline'),
    digest: args.includes('--digest'),
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (
    options.rule &&
    !RULE_CATEGORIES[options.rule] &&
    !Object.values(RULE_CATEGORIES).includes(options.rule)
  ) {
    throw new Error(`Unknown rule "${options.rule}".`)
  }
  if (options.updateBaseline && (options.page || options.frame || options.rule)) {
    throw new Error(
      'The baseline covers the whole canvas. Run --update-baseline without --page, --frame or --rule.',
    )
  }
  const config = normalizeConfig(
    existsSync(CONFIG_PATH) ? JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) : {},
  )
  const snapshot = loadSnapshot(
    options.snapshot ?? process.env.DESIGN_SNAPSHOT ?? DEFAULT_SNAPSHOT_DIRECTORY,
  )
  if (options.digest) {
    const digests = digestFrames(snapshot, config, options)
    if (options.json)
      console.log(
        JSON.stringify(
          {
            canvas: { id: snapshot.canvasId, updatedAt: snapshot.updatedAt },
            frames: digests,
          },
          null,
          2,
        ),
      )
    else
      for (const item of digests)
        console.log(`${item.digest}  ${item.page} › ${item.frame}`)
    return 0
  }

  const selected = snapshot.frames.filter((frame) => {
    if (isExcluded(frame, config)) return false
    return matchesFilters(frame, sectionOf(frame, snapshot.frames), options)
  })
  const missing = selected.filter((frame) => frame.html === null)
  if (missing.length > 0) {
    throw new Error(
      `The snapshot has no html for ${missing.length} frame(s): ${missing
        .slice(0, 5)
        .map((frame) => `${frame.name} (${frame.id}.html)`)
        .join(', ')}${missing.length > 5 ? ', …' : ''}.`,
    )
  }
  const collected = await collectFrames(selected, config)
  const analysis = analyzeSnapshot(snapshot, collected, config, options)
  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : null
  const classified = classifyFindings(
    analysis.findings,
    config,
    options.updateBaseline ? null : baseline,
  )

  if (options.updateBaseline) {
    const next = createBaseline(classified.findings, snapshot)
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`)
    console.log(
      `Design baseline updated with ${next.findings.length} findings (${path.basename(BASELINE_PATH)}).`,
    )
    return 0
  }

  const filtered = options.page || options.frame || options.rule
  const result = {
    ...classified,
    resolved: filtered ? 0 : classified.resolved,
    stats: analysis.stats,
  }
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          canvas: { id: snapshot.canvasId, updatedAt: snapshot.updatedAt },
          stats: result.stats,
          resolved: result.resolved,
          findings: result.findings,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(formatReport(result, snapshot, options))
  }
  return result.findings.some(
    (item) => item.status === 'new' && item.severity === 'error',
  )
    ? 1
    : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}

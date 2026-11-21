import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analyzeSnapshot,
  classifyFindings,
  collectFrames,
  contrastRatio,
  createBaseline,
  deltaE,
  digestFrames,
  loadSnapshot,
  normalizeConfig,
  parseArguments,
  parseCssColor,
  parseHex,
  resolveTokens,
  sectionOf,
} from '../check-design.mjs'

const TOKENS_JSON = {
  tokens: [
    { name: '--color-neutral-300', type: 'color', value: '#ADB8BA' },
    { name: '--color-neutral-800', type: 'color', value: '#1E2626' },
    { name: '--color-neutral-900', type: 'color', value: '#141A1B' },
    { name: '--color-neutral-50', type: 'color', value: '#F2F5F4' },
    { name: '--color-white', type: 'color', value: '#FFFFFF' },
    {
      name: '--color-background',
      type: 'color',
      value: 'var(--color-neutral-900)',
      themes: { light: 'var(--color-neutral-50)' },
    },
    {
      name: '--color-surface',
      type: 'color',
      value: 'var(--color-neutral-800)',
      themes: { light: 'var(--color-white)' },
    },
    { name: '--color-text-secondary', type: 'color', value: 'var(--color-neutral-300)' },
    { name: '--spacing-2', type: 'spacing', value: '8px' },
    { name: '--spacing-4', type: 'spacing', value: '16px' },
    { name: '--radius-default', type: 'radius', value: '8px' },
    { name: '--radius-full', type: 'radius', value: '9999px' },
    { name: '--font-sans', type: 'fontFamily', value: '"Manrope", sans-serif' },
  ],
}

const CONFIG = normalizeConfig({})

const FRAME = {
  id: 'frame-1',
  name: 'Espaço / Galáxias / Desktop',
  page: 'Desktop',
  x: 100,
  y: 100,
  width: 1440,
  height: 900,
  updatedAt: '2026-11-21T10:00:00.000Z',
  html: '<body></body>',
}

const SOLID = (color, opacity = 1) => ({ color, opacity, image: false })

function element(overrides = {}) {
  return {
    selector: 'body:1>div:1',
    tag: 'div',
    className: 'card',
    component: null,
    inComponent: false,
    rendered: true,
    hiddenSelf: false,
    inSvg: false,
    text: '',
    box: { x1: 0, y1: 0, x2: 100, y2: 40 },
    textBox: null,
    childCount: 0,
    color: 'rgb(242, 245, 244)',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: '"Manrope", sans-serif',
    ellipsis: false,
    opacity: 1,
    display: 'block',
    padding: [0, 0, 0, 0],
    gap: [0, 0],
    flexDirection: 'row',
    radii: [0, 0, 0, 0],
    clipper: null,
    backdrop: null,
    icon: null,
    inlineStyle: null,
    colorAttributes: [],
    ...overrides,
  }
}

function textElement(overrides = {}) {
  return element({
    tag: 'span',
    selector: 'body:1>span:1',
    text: 'Galáxias',
    textBox: { x1: 0, y1: 0, x2: 80, y2: 20 },
    backdrop: [SOLID('rgb(20, 26, 27)')],
    ...overrides,
  })
}

function collected(elements, extra = {}) {
  return new Map([
    [
      FRAME.id,
      {
        elements,
        styleBlocks: [],
        componentStyles: [],
        tokenStyles: [],
        unexpanded: 0,
        ...extra,
      },
    ],
  ])
}

function snapshotOf(frames = [FRAME]) {
  return {
    canvasId: 'canvas-1',
    tokens: TOKENS_JSON,
    components: {},
    frames,
    updatedAt: '2026-11-21T10:00:00.000Z',
  }
}

function analyze(elements, extra, filters, frames) {
  return analyzeSnapshot(snapshotOf(frames), collected(elements, extra), CONFIG, filters)
}

const rules = (result) => result.findings.map((item) => item.rule)

test('parseHex reads short, long and alpha hex colors and rejects garbage', () => {
  assert.deepEqual(parseHex('#fff'), [255, 255, 255])
  assert.deepEqual(parseHex('#141A1B'), [20, 26, 27])
  assert.deepEqual(parseHex('#141A1Bcc'), [20, 26, 27])
  assert.equal(parseHex('nope'), null)
})

test('parseCssColor reads what a browser reports', () => {
  assert.deepEqual(parseCssColor('rgb(20, 26, 27)'), { rgb: [20, 26, 27], alpha: 1 })
  assert.deepEqual(parseCssColor('rgba(20, 26, 27, 0.5)'), {
    rgb: [20, 26, 27],
    alpha: 0.5,
  })
  const mixed = parseCssColor('color(srgb 0.0431 0.0549 0.0588 / 0.65)')
  assert.equal(Math.round(mixed.rgb[0]), 11)
  assert.equal(mixed.alpha, 0.65)
  assert.deepEqual(parseCssColor('transparent'), { rgb: [0, 0, 0], alpha: 0 })
  assert.equal(parseCssColor('none'), null)
  assert.deepEqual(parseCssColor('#0B0E0F80').rgb, [11, 14, 15])
})

test('contrastRatio and deltaE follow the WCAG and CIE definitions', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(1), '21.0')
  assert.equal(deltaE([10, 20, 30], [10, 20, 30]), 0)
  assert.ok(deltaE([0, 0, 0], [255, 255, 255]) > 90)
})

test('resolveTokens follows aliases and applies the theme value', () => {
  const dark = resolveTokens(TOKENS_JSON, 'dark')
  assert.equal(dark.colors.get('--color-background').hex, '#141A1B')
  assert.deepEqual(dark.colorsByHex.get('#1E2626'), [
    '--color-neutral-800',
    '--color-surface',
  ])
  assert.deepEqual([...dark.numbersByType.get('spacing')], [8, 16])
  assert.ok(dark.numbersByType.get('radius').has(9999))
  assert.ok(dark.names.has('--font-sans'))
  const light = resolveTokens(TOKENS_JSON, 'light')
  assert.equal(light.colors.get('--color-background').hex, '#F2F5F4')
  assert.equal(light.colors.get('--color-surface').hex, '#FFFFFF')
})

test('loadSnapshot reads the index, the tokens and each frame html', () => {
  const files = {
    '/snap/frames.json': JSON.stringify({
      canvasId: 'canvas-1',
      pages: { p1: 'Desktop' },
      frames: [
        {
          id: 'a',
          name: 'Frame A',
          pageId: 'p1',
          width: 390,
          height: 844,
          updatedAt: '2026-01-02',
        },
        { id: 'b', name: 'Frame B', pageId: 'p1', updatedAt: '2026-01-05' },
      ],
    }),
    '/snap/tokens.json': JSON.stringify(TOKENS_JSON),
    '/snap/a.html': '<body>a</body>',
  }
  const snapshot = loadSnapshot(
    '/snap',
    (file) => files[file],
    (file) => file in files,
  )
  assert.equal(snapshot.canvasId, 'canvas-1')
  assert.equal(snapshot.frames[0].page, 'Desktop')
  assert.equal(snapshot.frames[0].html, '<body>a</body>')
  assert.equal(snapshot.frames[1].html, null)
  assert.equal(snapshot.frames[1].width, 1440)
  assert.equal(snapshot.updatedAt, '2026-01-05')
  assert.throws(
    () =>
      loadSnapshot(
        '/missing',
        () => '',
        () => false,
      ),
    /frames\.json is missing/,
  )
})

test('sectionOf names the smallest frame of the page that contains a screen', () => {
  const backdrop = {
    ...FRAME,
    id: 'bd',
    name: 'Autenticação · Sign-in',
    x: 0,
    y: 0,
    width: 2000,
    height: 1200,
  }
  const inner = { ...FRAME, id: 'in', name: 'Sign-in', x: 100, y: 100 }
  const elsewhere = { ...inner, id: 'el', name: 'Other', page: 'Mobile' }
  assert.equal(sectionOf(inner, [backdrop, inner, elsewhere]), 'Autenticação · Sign-in')
  assert.equal(sectionOf(elsewhere, [backdrop, inner, elsewhere]), 'Other')
})

test('text contrast fails under 4.5:1 and passes on a readable pair', () => {
  const low = analyze([
    textElement({ color: 'rgb(102, 119, 120)', backdrop: [SOLID('rgb(30, 38, 38)')] }),
  ])
  assert.deepEqual(rules(low), ['contrast'])
  assert.equal(low.findings[0].severity, 'error')
  const fine = analyze([textElement()])
  assert.deepEqual(rules(fine), [])
})

test('large text only needs 3:1 and an unknown background is not judged', () => {
  const large = analyze([
    textElement({
      fontSize: 24,
      color: 'rgb(102, 119, 120)',
      backdrop: [SOLID('rgb(20, 26, 27)')],
    }),
  ])
  assert.deepEqual(rules(large), [])
  const image = analyze([
    textElement({
      color: 'rgb(102, 119, 120)',
      backdrop: [{ color: 'rgba(0, 0, 0, 0)', opacity: 1, image: true }],
    }),
  ])
  assert.deepEqual(rules(image), [])
  assert.equal(image.stats.unknownBackgrounds, 1)
})

test('an opaque layer above an image makes the background known again', () => {
  const result = analyze([
    textElement({
      color: 'rgb(102, 119, 120)',
      backdrop: [
        { color: 'rgba(0, 0, 0, 0)', opacity: 1, image: true },
        SOLID('rgb(30, 38, 38)'),
      ],
    }),
  ])
  assert.deepEqual(rules(result), ['contrast'])
})

test('icon contrast warns under 3:1', () => {
  const icon = element({
    tag: 'svg',
    selector: 'body:1>svg:1',
    icon: {
      stroke: 'rgb(53, 67, 68)',
      strokeWidth: 2,
      fill: 'none',
      backdrop: [SOLID('rgb(20, 26, 27)')],
    },
  })
  const result = analyze([icon])
  assert.deepEqual(rules(result), ['icon-contrast'])
  assert.equal(result.findings[0].severity, 'warning')
})

test('color literals are classified against the tokens', () => {
  const inline = (style) => element({ inlineStyle: style })
  const exact = analyze([inline('color:#1E2626')])
  assert.deepEqual(rules(exact), ['color-unbound'])
  const near = analyze([inline('color:#1F2727')])
  assert.deepEqual(rules(near), ['color-near-token'])
  const off = analyze([inline('color:#FF00AA')])
  assert.deepEqual(rules(off), ['color-off-palette'])
  const allowed = analyzeSnapshot(
    snapshotOf(),
    collected([inline('color:#00FF88')]),
    normalizeConfig({ colorAllow: ['#00FF88'] }),
  )
  assert.deepEqual(rules(allowed), [])
  const transparent = analyze([inline('color:rgba(0,0,0,0)')])
  assert.deepEqual(rules(transparent), [])
})

test('token references must exist in the canvas or in the frame', () => {
  const unknown = analyze([element({ inlineStyle: 'margin:var(--spacing-99)' })])
  assert.deepEqual(rules(unknown), ['token-missing'])
  const known = analyze([
    element({ inlineStyle: 'gap:var(--spacing-4);color:var(--color-surface)' }),
  ])
  assert.deepEqual(rules(known), [])
  const local = analyze([element({ inlineStyle: 'gap:var(--spacing-99)' })], {
    tokenStyles: [':root{--spacing-99:7px}'],
  })
  assert.deepEqual(rules(local), [])
  const block = analyze([], { styleBlocks: ['.a{color:#FF00AA}'] })
  assert.deepEqual(rules(block), ['empty-frame', 'color-off-palette'])
})

test('instances are skipped for token, type, spacing and radius rules except on component pages', () => {
  const inside = textElement({
    inComponent: true,
    fontSize: 10,
    inlineStyle: 'color:#FF00AA',
    padding: [10, 10, 10, 10],
    radii: [6, 6, 6, 6],
  })
  assert.deepEqual(rules(analyze([inside])), [])
  const componentFrame = { ...FRAME, page: '🧩 Components' }
  const onComponentPage = analyzeSnapshot(
    snapshotOf([componentFrame]),
    collected([inside]),
    CONFIG,
  )
  assert.deepEqual([...new Set(rules(onComponentPage))].sort(), [
    'color-off-palette',
    'radius',
    'spacing',
    'type-min-size',
  ])
})

test('typography checks size, scale, family and weight', () => {
  const small = analyze([textElement({ fontSize: 10 })])
  assert.deepEqual(rules(small), ['type-min-size'])
  const scale = analyze([textElement({ fontSize: 15 })])
  assert.deepEqual(rules(scale), ['type-scale'])
  const family = analyze([textElement({ fontFamily: 'Georgia, serif' })])
  assert.deepEqual(rules(family), ['type-family'])
  const weight = analyze([textElement({ fontWeight: 300 })])
  assert.deepEqual(rules(weight), ['type-weight'])
})

test('text that leaves the frame or its clipping ancestor is reported', () => {
  const outside = analyze([
    textElement({ textBox: { x1: 1400, y1: 0, x2: 1500, y2: 20 } }),
  ])
  assert.deepEqual(rules(outside), ['text-overflow'])
  const clipped = analyze([
    textElement({
      textBox: { x1: 0, y1: 0, x2: 200, y2: 20 },
      clipper: { box: { x1: 0, y1: 0, x2: 100, y2: 20 }, selector: 'body:1>div:1' },
    }),
  ])
  assert.deepEqual(rules(clipped), ['text-clipped'])
  const ellipsis = analyze([
    textElement({
      ellipsis: true,
      textBox: { x1: 0, y1: 0, x2: 200, y2: 20 },
      clipper: { box: { x1: 0, y1: 0, x2: 100, y2: 20 }, selector: 'body:1>div:1' },
    }),
  ])
  assert.deepEqual(rules(ellipsis), [])
})

test('spacing and radius use the token scales', () => {
  const spacing = analyze([element({ padding: [10, 8, 10, 8], childCount: 1 })])
  assert.deepEqual(rules(spacing), ['spacing'])
  const gaps = analyze([element({ gap: [6, 0], childCount: 3 })])
  assert.deepEqual(rules(gaps), ['spacing'])
  const singleChild = analyze([element({ gap: [6, 0], childCount: 1 })])
  assert.deepEqual(rules(singleChild), [])
  const radius = analyze([element({ radii: [6, 6, 6, 6] })])
  assert.deepEqual(rules(radius), ['radius'])
  const round = analyze([
    element({ radii: [20, 20, 20, 20], box: { x1: 0, y1: 0, x2: 40, y2: 40 } }),
  ])
  assert.deepEqual(rules(round), [])
  const extra = analyzeSnapshot(
    snapshotOf(),
    collected([element({ radii: [6, 6, 6, 6] })]),
    normalizeConfig({ radius: { extra: [6] } }),
  )
  assert.deepEqual(rules(extra), [])
})

test('hygiene flags default names, empty frames, hidden elements and broken instances', () => {
  const named = analyzeSnapshot(
    snapshotOf([{ ...FRAME, name: 'Frame 12' }]),
    collected([element()]),
    CONFIG,
  )
  assert.deepEqual(rules(named), ['default-name'])
  assert.deepEqual(rules(analyze([])), ['empty-frame'])
  assert.deepEqual(rules(analyze([element({ hiddenSelf: true, rendered: false })])), [
    'empty-frame',
    'hidden-layer',
  ])
  assert.deepEqual(rules(analyze([element()], { unexpanded: 2 })), ['broken-component'])
})

test('frames that partly overlap are an error, nesting is not', () => {
  const nested = {
    ...FRAME,
    id: 'n',
    name: 'Nested',
    x: 120,
    y: 120,
    width: 200,
    height: 200,
  }
  const cross = {
    ...FRAME,
    id: 'x',
    name: 'Cross',
    x: 1000,
    y: 500,
    width: 1000,
    height: 1000,
  }
  const empty = new Map()
  const clean = analyzeSnapshot(snapshotOf([FRAME, nested]), empty, CONFIG)
  assert.deepEqual(rules(clean), [])
  const overlap = analyzeSnapshot(snapshotOf([FRAME, cross]), empty, CONFIG)
  assert.deepEqual(rules(overlap), ['section-overlap'])
  const filtered = analyzeSnapshot(snapshotOf([FRAME, cross]), empty, CONFIG, {
    frame: 'Cross',
  })
  assert.deepEqual(rules(filtered), [])
})

test('excluded frames are not analyzed', () => {
  const tokenFrame = { ...FRAME, id: 'tk', name: 'Design System / Tokens' }
  const result = analyzeSnapshot(
    snapshotOf([tokenFrame]),
    new Map([[tokenFrame.id, collected([]).get(FRAME.id)]]),
    normalizeConfig({ excludeFrames: ['Tokens'] }),
  )
  assert.equal(result.stats.frames, 0)
})

test('the rule option accepts a rule or a category', () => {
  const elements = [textElement({ fontSize: 15 }), element({ radii: [6, 6, 6, 6] })]
  assert.deepEqual(rules(analyze(elements, {}, { rule: 'radius' })), ['radius'])
  assert.deepEqual(rules(analyze(elements, {}, { rule: 'typography' })), ['type-scale'])
})

test('findings are classified against the baseline and the ignore list', () => {
  const [first, second] = analyze([
    textElement({ fontSize: 15 }),
    element({ radii: [6, 6, 6, 6] }),
  ]).findings
  const config = normalizeConfig({
    ignore: [{ rule: 'radius', selector: second.selector, reason: 'brand shape' }],
  })
  const baseline = { findings: [first.fingerprint, 'type-scale:gone:x'] }
  const result = classifyFindings([first, second], config, baseline)
  assert.equal(
    result.findings.find((item) => item.rule === 'type-scale').status,
    'baseline',
  )
  assert.equal(result.findings.find((item) => item.rule === 'radius').status, 'ignored')
  assert.equal(result.resolved, 1)
  const next = createBaseline(result.findings, snapshotOf())
  assert.deepEqual(next.findings, [first.fingerprint])
  assert.equal(next.canvasId, 'canvas-1')
})

test('ignore entries need a reason and a selector or layer', () => {
  assert.throws(() => normalizeConfig({ ignore: [{ selector: 'a' }] }), /needs a reason/)
  assert.throws(
    () => normalizeConfig({ ignore: [{ reason: 'x' }] }),
    /selector or a layer/,
  )
  assert.equal(normalizeConfig({ theme: 'Light' }).theme, 'light')
})

test('digestFrames hashes each frame html and honors the filters', () => {
  const other = {
    ...FRAME,
    id: 'f2',
    name: 'Perfil / Desktop / Perfil',
    html: '<body>x</body>',
  }
  const snapshot = snapshotOf([FRAME, other])
  const all = digestFrames(snapshot, CONFIG)
  assert.equal(all.length, 2)
  assert.match(all[0].digest, /^[0-9a-f]{16}$/)
  assert.notEqual(all[0].digest, all[1].digest)
  const one = digestFrames(snapshot, CONFIG, { frame: 'perfil' })
  assert.deepEqual(
    one.map((item) => item.frameId),
    ['f2'],
  )
  assert.equal(
    digestFrames(snapshot, CONFIG, { frame: 'perfil' })[0].digest,
    one[0].digest,
  )
  assert.throws(
    () => digestFrames(snapshotOf([{ ...FRAME, html: null }]), CONFIG),
    /No frame-1\.html/,
  )
})

test('parseArguments reads the options and keeps --board as an alias of --frame', () => {
  const parsed = parseArguments([
    '--snapshot',
    'dir',
    '--page',
    'Mobile',
    '--frame',
    'Galáxias',
    '--rule',
    'contrast',
    '--all',
    '--json',
    '--digest',
  ])
  assert.deepEqual(parsed, {
    snapshot: 'dir',
    page: 'Mobile',
    frame: 'Galáxias',
    rule: 'contrast',
    all: true,
    json: true,
    updateBaseline: false,
    digest: true,
  })
  assert.equal(parseArguments(['--board', 'Perfil']).frame, 'Perfil')
  assert.throws(() => parseArguments(['--page']), /needs a value/)
})

const CHROMIUM = await import('playwright')
  .then((module) => module.chromium.executablePath())
  .catch(() => null)

test('collectFrames renders a frame and measures text, backdrop and spacing', {
  skip: !CHROMIUM,
}, async () => {
  const html = `<!doctype html><html><head><style data-doop-tokens>:root{--color-surface:#1E2626}</style>
    <style>body{margin:0;background:var(--color-surface);width:300px;height:120px}
    .box{padding:10px;border-radius:6px;display:flex;gap:6px;color:#667778;font:13px/16px sans-serif}</style>
    </head><body><div class="box"><span>Olá</span><span>mundo</span></div>
    <div data-doop-instance="c1" style="display:none">oculto</div></body></html>`
  const frame = { ...FRAME, id: 'live', width: 300, height: 120, html }
  const result = await collectFrames([frame], CONFIG)
  const data = result.get('live')
  const box = data.elements.find((item) => item.className === 'box')
  assert.deepEqual(box.padding, [10, 10, 10, 10])
  assert.deepEqual(box.gap, [6, 6])
  assert.equal(box.radii[0], 6)
  const text = data.elements.find((item) => item.text === 'Olá')
  assert.equal(text.backdrop.at(-1).color, 'rgb(30, 38, 38)')
  assert.equal(text.color, 'rgb(102, 119, 120)')
  const hidden = data.elements.find((item) => item.hiddenSelf)
  assert.equal(hidden.inComponent, true)
  assert.deepEqual(data.tokenStyles, [':root{--color-surface:#1E2626}'])
  const analysis = analyzeSnapshot(snapshotOf([frame]), result, CONFIG)
  assert.ok(rules(analysis).includes('contrast'))
  assert.ok(rules(analysis).includes('radius'))
  assert.ok(rules(analysis).includes('spacing'))
})

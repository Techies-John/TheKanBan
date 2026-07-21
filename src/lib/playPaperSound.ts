/**
 * Tiny Web Audio paper sounds — no sound files.
 * Skips when the user prefers reduced motion.
 */

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC()
  }
  return sharedCtx
}

function prefersQuiet(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function ensureCtx(): Promise<AudioContext | null> {
  if (prefersQuiet()) return null
  const ctx = getCtx()
  if (!ctx) return null
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return null
    }
  }
  return ctx
}

function playBuffer(
  ctx: AudioContext,
  data: Float32Array,
  opts: { filterFreq: number; filterQ: number; filterType: BiquadFilterType; gain: number },
) {
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate)
  buffer.getChannelData(0).set(data)

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = opts.filterType
  filter.frequency.value = opts.filterFreq
  filter.Q.value = opts.filterQ

  const gain = ctx.createGain()
  gain.gain.value = opts.gain

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

/** Soft crackle / page-turn burst (~180ms). */
export async function playPaperOpenSound(): Promise<void> {
  const ctx = await ensureCtx()
  if (!ctx) return

  const duration = 0.18
  const frameCount = Math.floor(ctx.sampleRate * duration)
  const data = new Float32Array(frameCount)

  for (let i = 0; i < frameCount; i++) {
    const t = i / ctx.sampleRate
    const env = Math.exp(-t * 18) * (1 - t / duration)
    const noise = (Math.random() * 2 - 1) * 0.55
    const flap = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 35) * 0.35
    data[i] = (noise * 0.7 + flap) * env
  }

  playBuffer(ctx, data, {
    filterType: 'bandpass',
    filterFreq: 1400,
    filterQ: 0.7,
    gain: 0.22,
  })
}

/** Paper crumple / crush when the scrap note closes (~280ms). */
export async function playPaperCloseSound(): Promise<void> {
  const ctx = await ensureCtx()
  if (!ctx) return

  const duration = 0.28
  const frameCount = Math.floor(ctx.sampleRate * duration)
  const data = new Float32Array(frameCount)

  for (let i = 0; i < frameCount; i++) {
    const t = i / ctx.sampleRate
    // Faster decay + grit — more “crumple” than open flap
    const env = Math.exp(-t * 12) * (1 - t / duration)
    const noise = (Math.random() * 2 - 1) * 0.9
    const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.5
    const crush = Math.sin(2 * Math.PI * (55 + t * 120) * t) * Math.exp(-t * 22) * 0.4
    data[i] = (noise * 0.55 + crackle + crush) * env
  }

  playBuffer(ctx, data, {
    filterType: 'lowpass',
    filterFreq: 900,
    filterQ: 0.85,
    gain: 0.26,
  })
}

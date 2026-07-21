/** Sunday Comic narrator lines for the Doing column. */

export const DOING_VIBE_BY_COUNT: Record<1 | 2 | 3, string> = {
  1: 'One thing on the burner. Nice and simple.',
  2: "Two pots bubbling — you're cooking!",
  3: "Three's the lane. Work what's here.",
}

export const DOING_REJECT_LINES = [
  "Don't overclock your brain. Move one out first.",
  'Easy — three\'s plenty. Keep it simple for now.',
  "Your head isn't a server farm. Finish one first.",
] as const

export function vibeForDoingCount(count: number): string | null {
  if (count === 1 || count === 2 || count === 3) {
    return DOING_VIBE_BY_COUNT[count]
  }
  return null
}

export function randomRejectLine(): string {
  const i = Math.floor(Math.random() * DOING_REJECT_LINES.length)
  return DOING_REJECT_LINES[i] ?? DOING_REJECT_LINES[0]
}

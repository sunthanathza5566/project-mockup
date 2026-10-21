import type { Register } from 'claude-code'

type Level = 'lite' | 'full' | 'ultra' | 'off'

const LEVELS: readonly Level[] = ['lite', 'full', 'ultra', 'off']
const KEY = 'level'
const DEFAULT: Level = 'full'

const BASE = `# Caveman mode
Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
- Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for").
- No restating question, no summary of what you about to do, no closing offer.
- Technical terms, code, commands, file paths, error messages: exact, never shortened.
- Code blocks, commit messages, PR text, files written to disk: normal style, unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Same language as user. Thai user → terse Thai, no ครับ/ค่ะ padding.

Example — not: "Sure! I'd be happy to help. The issue you're seeing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use \`<\` not \`<=\`. Fix:"

Drop caveman for: security warnings, irreversible-action confirmations, multi-step sequences where fragments risk misread. Resume after.`

const EXTRA: Record<Exclude<Level, 'off'>, string> = {
  lite: 'Level LITE: keep grammar and articles, cut only filler and hedging. Professional but tight.',
  full: 'Level FULL: classic caveman. Drop articles, fragments OK.',
  ultra:
    'Level ULTRA: maximum compress. Abbreviate (DB, auth, config, req/res, fn, impl). Arrows for causality (X → Y). One word when one word enough.',
}

const isLevel = (v: unknown): v is Level => LEVELS.includes(v as Level)

const getLevel = async ($: { store: { get: (k: string) => Promise<unknown> } }) => {
  const v = await $.store.get(KEY)

  return isLevel(v) ? v : DEFAULT
}

const label = (level: Level) => (level === 'off' ? undefined : `🪨 caveman:${level}`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'caveman',
      description: 'Caveman mode: terse replies, fewer tokens (lite|full|ultra|off)',
    })
    $.ui.status(label(await getLevel($)))

    return next(e)
  })

  on('command.run', { command: 'caveman' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '') {
      const level = await getLevel($)

      return { text: `Caveman level: ${level}. Use /caveman lite|full|ultra|off` }
    }
    if (!isLevel(arg)) return { text: `Unknown level "${arg}". Use lite|full|ultra|off` }

    await $.store.set(KEY, arg)
    $.ui.status(label(arg))

    return { text: arg === 'off' ? 'Caveman off. Normal talk.' : `Caveman ${arg}. Me talk short now.` }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const level = await getLevel($)
    if (level === 'off') return composed

    return {
      sections: [
        ...composed.sections,
        { id: 'caveman:rules', text: `${BASE}\n\n${EXTRA[level]}`, scope: 'session' },
      ],
    }
  })
}

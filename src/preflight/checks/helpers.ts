import type { FileEntry, Finding, Severity } from './types'
import { maskSnippet } from './mask'

/** Return up to 3 lines of context around a match, with the match line first. */
export function snippetAround(content: string, lineIndex: number, radius = 1): string {
  const lines = content.split('\n')
  const start = Math.max(0, lineIndex - radius)
  const end   = Math.min(lines.length, lineIndex + radius + 1)
  return lines.slice(start, end).join('\n')
}

/** Build a GitHub blob URL for a file + line. */
export function githubLineUrl(baseUrl: string, line: number): string {
  return line > 0 ? `${baseUrl}#L${line}` : baseUrl
}

/** Build a finding — auto-masks the snippet. */
export function makeFinding(
  base: Omit<Finding, 'snippet'> & { rawSnippet: string },
): Finding {
  const { rawSnippet, ...rest } = base
  return { ...rest, snippet: maskSnippet(rawSnippet) }
}

/** Iterate every line of every file, call cb for each match. */
export function scanLines(
  files: FileEntry[],
  test: (line: string, lineIndex: number, file: FileEntry) => Finding | null,
): Finding[] {
  const findings: Finding[] = []
  const seen = new Map<string, number>() // dedup key -> count

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const f = test(lines[i], i, file)
      if (!f) continue
      const key = `${f.checkId}:${f.file}`
      const count = seen.get(key) ?? 0
      seen.set(key, count + 1)
      if (count < 3) {
        // Keep up to 3 per file; later add "(+ N more)" annotation
        findings.push(f)
      } else if (count === 3) {
        // Amend the last finding's title with a "+" note
        const last = findings[findings.length - 1]
        if (!last.title.includes('(+')) {
          last.title = last.title + ' (+ more occurrences)'
        }
      }
    }
  }
  return findings
}

/** Match a regex against every line; return findings. */
export function scanRegex(
  files: FileEntry[],
  checkId: string,
  severity: Severity,
  pattern: RegExp,
  title: (match: RegExpMatchArray) => string,
  explanation: string,
  howToFix: string,
  githubBaseUrl: (file: FileEntry) => string,
): Finding[] {
  return scanLines(files, (line, lineIdx, file) => {
    const m = line.match(pattern)
    if (!m) return null
    return makeFinding({
      id: `${checkId}-${file.path}-${lineIdx}`,
      checkId,
      severity,
      title: title(m),
      explanation,
      howToFix,
      file: file.path,
      line: lineIdx + 1,
      rawSnippet: snippetAround(file.content, lineIdx),
      githubUrl: githubLineUrl(githubBaseUrl(file), lineIdx + 1),
    })
  })
}

export function blobUrl(owner: string, repo: string, branch: string, path: string): string {
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`
}

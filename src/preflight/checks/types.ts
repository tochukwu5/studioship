/** Shared types for preflight checks. */

export type Severity = 'critical' | 'warning' | 'info' | 'passed'

export interface Finding {
  id: string
  checkId: string
  severity: Severity
  title: string
  explanation: string
  howToFix: string
  file: string
  line: number
  snippet: string      // secrets already masked
  githubUrl: string
}

export interface FileEntry {
  path: string
  content: string
  githubUrl: string   // link to the file on GitHub (raw or blob)
}

export type CheckFn = (files: FileEntry[], opts?: CheckOpts) => Finding[]

export interface CheckOpts {
  owner: string
  repo: string
  branch: string
}

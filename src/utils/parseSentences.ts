export interface Segment {
  text: string
  reading: string | null
}

// Parse "{今日|きょう}は{学校|がっこう}で" into Segment[]
export function parseAnnotated(annotated: string): Segment[] {
  const segments: Segment[] = []
  const re = /\{([^|]+)\|([^}]+)\}|([^{]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(annotated)) !== null) {
    if (match[1] && match[2]) {
      segments.push({ text: match[1], reading: match[2] })
    } else if (match[3]) {
      segments.push({ text: match[3], reading: null })
    }
  }
  return segments
}

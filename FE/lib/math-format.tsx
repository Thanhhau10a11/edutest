import React from 'react'

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'i': 'ⁱ',
  'x': 'ˣ',
  'y': 'ʸ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'n': 'ₙ',
  'm': 'ₘ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ',
}

function toSuperscript(str: string): string {
  const chars = str.split('')
  if (chars.every((c) => SUPERSCRIPT_MAP[c])) {
    return chars.map((c) => SUPERSCRIPT_MAP[c]).join('')
  }
  return `^(${str})`
}

function toSubscript(str: string): string {
  // Handle common cases like _{1,2} -> ₁,₂
  const cleaned = str.replace(/,/g, ',')
  const chars = cleaned.split('')
  if (chars.every((c) => SUBSCRIPT_MAP[c] || c === ',')) {
    return chars.map((c) => (c === ',' ? ',' : SUBSCRIPT_MAP[c])).join('')
  }
  return `_(${str})`
}

/**
 * Chuyển đổi công thức LaTeX / ký hiệu thô sang công thức Toán học Unicode đẹp, dễ đọc
 * Dùng cho cả hiển thị lẫn khi copy/paste vào ô soạn câu hỏi trắc nghiệm.
 */
export function cleanMathText(input: string): string {
  if (!input) return ''
  let text = String(input)

  // 1. Thay thế thẻ <br>, <br/>, <br /> thành xuống dòng
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // 2. Gỡ bỏ các dấu bao LaTeX: \( ... \), \[ ... \], $$ ... $$, $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$1')
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$1')
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1')
  text = text.replace(/\$([^$\n]+?)\$/g, '$1')

  // 3. Xử lý \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit)\{([^{}]*)\}/g, '$1')

  // 4. Xử lý số mũ ^{...} và chỉ số dưới _{...} TRƯỚC để tháo ngoặc nhọn lồng trong \frac hoặc \sqrt
  text = text.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp.trim()))
  text = text.replace(/\^([0-9+\-=n])/g, (_, exp) => toSuperscript(exp))
  text = text.replace(/([a-zA-Z0-9Δ)])_\{([^{}]+)\}/g, (_, base, sub) => `${base}${toSubscript(sub.trim())}`)
  text = text.replace(/([a-zA-ZΔ)])_([0-9nmkijx]+)/g, (_, base, sub) => `${base}${toSubscript(sub)}`)

  // 5. Xử lý căn bậc n và căn bậc 2: \sqrt[n]{x}, \sqrt{x} (TRƯỚC \frac)
  text = text.replace(/\\sqrt\[3\]\{([^{}]+)\}/g, (_, inner) => {
    const clean = inner.trim()
    return clean.length > 2 ? `∛(${clean})` : `∛${clean}`
  })
  text = text.replace(/\\sqrt\[([^{}\]]+)\]\{([^{}]+)\}/g, (_, root, inner) => {
    return `${toSuperscript(root.trim())}√(${inner.trim()})`
  })
  for (let i = 0; i < 3; i++) {
    text = text.replace(/\\sqrt\{([^{}]+)\}/g, (_, inner) => {
      const clean = inner.trim()
      return /[+\-\s*/]/.test(clean) ? `√(${clean})` : `√${clean}`
    })
  }
  text = text.replace(/\\sqrt\s+([a-zA-Z0-9Δ]+)/g, '√$1')

  // 6. Xử lý phân số \frac{a}{b} hoặc \dfrac{a}{b} (lặp tối đa 4 lần cho phân số lồng nhau)
  for (let i = 0; i < 4; i++) {
    text = text.replace(/\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const n = num.trim()
      const d = den.trim()
      const nWrap = /[+\-\s]/.test(n) && !/^\(.*\)$/.test(n) ? `(${n})` : n
      const dWrap = /[+\-\s*/]/.test(d) && !/^\(.*\)$/.test(d) ? `(${d})` : d
      return `${nWrap}/${dWrap}`
    })
  }

  // 6. Xử lý các ký hiệu LaTeX toán học phổ biến
  const latexSymbols: [RegExp, string][] = [
    [/\\Delta\b/g, 'Δ'],
    [/\\delta\b/g, 'δ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'],
    [/\\mu\b/g, 'μ'],
    [/\\pi\b/g, 'π'],
    [/\\sigma\b/g, 'σ'],
    [/\\omega\b/g, 'ω'],
    [/\\Omega\b/g, 'Ω'],
    [/\\phi\b/g, 'φ'],
    [/\\Phi\b/g, 'Φ'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\leq\b|\\le\b/g, '≤'],
    [/\\geq\b|\\ge\b/g, '≥'],
    [/\\neq\b|\\ne\b/g, '≠'],
    [/\\approx\b/g, '≈'],
    [/\\equiv\b/g, '≡'],
    [/\\sim\b/g, '∼'],
    [/\\in\b/g, '∈'],
    [/\\notin\b/g, '∉'],
    [/\\subset\b/g, '⊂'],
    [/\\subseteq\b/g, '⊆'],
    [/\\cup\b/g, '∪'],
    [/\\cap\b/g, '∩'],
    [/\\emptyset\b|\\varnothing\b/g, '∅'],
    [/\\infty\b/g, '∞'],
    [/\\forall\b/g, '∀'],
    [/\\exists\b/g, '∃'],
    [/\\Leftrightarrow\b|\\iff\b/g, '⇔'],
    [/\\Rightarrow\b|\\implies\b/g, '⇒'],
    [/\\Leftarrow\b/g, '⇐'],
    [/\\leftrightarrow\b/g, '↔'],
    [/\\rightarrow\b|\\to\b/g, '→'],
    [/\\leftarrow\b/g, '←'],
    [/\\perp\b/g, '⊥'],
    [/\\parallel\b/g, '∥'],
    [/\\angle\b|\\widehat\b/g, '∠'],
    [/\\triangle\b/g, '△'],
    [/\\circ\b/g, '°'],
    [/\\int\b/g, '∫'],
    [/\\sum\b/g, '∑'],
    [/\\prod\b/g, '∏'],
    [/\\partial\b/g, '∂'],
    [/\\mathbb\{R\}/g, 'ℝ'],
    [/\\mathbb\{Z\}/g, 'ℤ'],
    [/\\mathbb\{N\}/g, 'ℕ'],
    [/\\mathbb\{Q\}/g, 'ℚ'],
    [/\\mathbb\{C\}/g, 'ℂ'],
    [/\\left\s*([()[\]|])/g, '$1'],
    [/\\right\s*([()[\]|])/g, '$1'],
    [/\\left\\\{/g, '{'],
    [/\\right\\\}/g, '}'],
    [/\\\{/g, '{'],
    [/\\\}/g, '}'],
    [/\\,/g, ' '],
    [/\\;/g, ' '],
    [/\\quad\b/g, '  '],
    [/\\qquad\b/g, '    '],
  ]

  for (const [regex, replacement] of latexSymbols) {
    text = text.replace(regex, replacement)
  }

  // 7. Xử lý vectơ \vec{AB} hoặc \overrightarrow{AB}
  text = text.replace(/\\(?:vec|overrightarrow)\{([^{}]+)\}/g, '$1⃗')

  // 8. Xử lý số mũ ^{...} và ^2, ^3, ^n
  text = text.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp.trim()))
  text = text.replace(/\^([0-9+\-=n])/g, (_, exp) => toSuperscript(exp))

  // 9. Xử lý chỉ số dưới _{...} và _1, _2, _n (chỉ áp dụng khi đứng sau chữ cái hoặc ) )
  text = text.replace(/([a-zA-Z0-9Δ)])_\{([^{}]+)\}/g, (_, base, sub) => `${base}${toSubscript(sub.trim())}`)
  text = text.replace(/([a-zA-ZΔ)])_([0-9nmkijx]+)/g, (_, base, sub) => `${base}${toSubscript(sub)}`)

  // 10. Dọn các dấu backslash dư thừa trước ký tự thường (như \% -> %)
  text = text.replace(/\\([%|])/g, '$1')

  return text
}

/**
 * Chuẩn hóa nhanh văn bản người dùng gõ tay khi soạn câu hỏi
 * Hỗ trợ thêm các tốc ký như: sqrt(x) -> √(x), Delta -> Δ, +- -> ±, <= -> ≤, >= -> ≥, != -> ≠, <=> -> ⇔, => -> ⇒
 */
export function formatQuestionAuthoringText(input: string): string {
  if (!input) return ''
  let text = cleanMathText(input)

  text = text
    .replace(/\bsqrt\(([^()]+)\)/gi, '√($1)')
    .replace(/\bDelta\b/g, 'Δ')
    .replace(/\+-/g, '±')
    .replace(/<=>/g, '⇔')
    .replace(/=>/g, '⇒')
    .replace(/->/g, '→')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\bpi\b/g, 'π')

  return text
}

/**
 * Tách nội dung câu hỏi trắc nghiệm từ văn bản AI trả về
 */
export interface ParsedAIQuestion {
  content: string
  options: { key: string; content: string; isCorrect: boolean }[]
  explanation: string
}

export function parseQuestionsFromAIText(rawText: string): ParsedAIQuestion[] {
  const cleaned = cleanMathText(rawText)
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim()

  const blocks = cleaned
    .split(/(?=(?:Câu|Bài|Question)\s*\d+\s*[:.])/i)
    .map((b) => b.trim())
    .filter(Boolean)

  const targetBlocks = blocks.length > 0 ? blocks : [cleaned]
  const results: ParsedAIQuestion[] = []

  for (const block of targetBlocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length < 2) continue

    let questionContent = ''
    const optsMap: Record<string, string> = { A: '', B: '', C: '', D: '' }
    let correctKey = 'A'
    let explanation = ''
    let currentSection: 'question' | 'A' | 'B' | 'C' | 'D' | 'explanation' = 'question'

    for (const line of lines) {
      const answerMatch = line.match(/^(?:Đáp án(?:\s*đúng)?|Kết quả|Chọn(?:\s*đáp án)?)\s*[:\-is]*\s*([ABCD])\b/i)
      if (answerMatch) {
        correctKey = answerMatch[1].toUpperCase()
        const extraExp = line.replace(answerMatch[0], '').replace(/^[\s.,:-]+/, '').trim()
        if (extraExp) explanation = explanation ? `${explanation}\n${extraExp}` : extraExp
        currentSection = 'explanation'
        continue
      }

      const expMatch = line.match(/^(?:Giải thích|Lời giải|Hướng dẫn(?:\s*giải)?)\s*[:\-]\s*(.*)/i)
      if (expMatch) {
        explanation = explanation ? `${explanation}\n${expMatch[1].trim()}` : expMatch[1].trim()
        currentSection = 'explanation'
        continue
      }

      const optMatch = line.match(/^(?:[-*•]\s*)?([ABCD])\s*[.):\-]\s*(.+)$/i)
      if (optMatch) {
        const key = optMatch[1].toUpperCase()
        let optText = optMatch[2].trim()
        if (/\((?:đúng|correct)\)$/i.test(optText) || /✓|✔/.test(optText)) {
          correctKey = key
          optText = optText.replace(/\((?:đúng|correct)\)$/i, '').replace(/[✓✔]/g, '').trim()
        }
        optsMap[key] = optText
        currentSection = key as 'A' | 'B' | 'C' | 'D'
        continue
      }

      if (currentSection === 'question') {
        const strippedHeader = line.replace(/^(?:Câu|Bài|Question)\s*\d+\s*(?:\([^)]*\))?\s*[:.\-]\s*/i, '')
        questionContent = questionContent ? `${questionContent}\n${strippedHeader}` : strippedHeader
      } else if (currentSection === 'explanation') {
        explanation = explanation ? `${explanation}\n${line}` : line
      } else {
        optsMap[currentSection] = `${optsMap[currentSection]} ${line}`.trim()
      }
    }

    if (questionContent && (optsMap.A || optsMap.B)) {
      results.push({
        content: questionContent.trim(),
        options: (['A', 'B', 'C', 'D'] as const).map((k) => ({
          key: k,
          content: optsMap[k] || `Phương án ${k}`,
          isCorrect: k === correctKey,
        })),
        explanation: explanation.trim(),
      })
    }
  }

  return results
}

/**
 * Render inline formatting: **bold**, `code`, và highlight công thức toán
 */
function renderInlineFormatted(text: string): React.ReactNode {
  const cleaned = cleanMathText(text)
  const tokens = cleaned.split(/(\*\*.*?\*\*|`[^`]+`)/g)

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} style={{ color: 'inherit', fontWeight: 700 }}>
          {cleanMathText(token.slice(2, -2))}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          style={{
            padding: '2px 6px',
            borderRadius: 6,
            background: 'rgba(139, 124, 246, 0.14)',
            border: '1px solid rgba(139, 124, 246, 0.3)',
            color: 'var(--violet)',
            fontSize: '0.92em',
            fontWeight: 600,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}
        >
          {cleanMathText(token.slice(1, -1))}
        </code>
      )
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>
  })
}

/**
 * Render đầy đủ Markdown + Bảng (Table) + Tiêu đề (Heading) + Công thức Toán học cho Chatbox
 */
export function renderRichMathMarkdown(rawContent: string): React.ReactNode {
  if (!rawContent) return null

  const segments = rawContent.split(/(```[\s\S]*?```)/g)

  return segments.map((segment, segIdx) => {
    // 1. Code block ```...```
    if (segment.startsWith('```') && segment.endsWith('```')) {
      const rawCode = segment.slice(3, -3).trim()
      const lines = rawCode.split('\n')
      const firstLine = lines[0]?.trim() || ''
      const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine)
      const codeBody = hasLang ? lines.slice(1).join('\n') : lines.join('\n')

      return (
        <pre
          key={segIdx}
          style={{
            margin: '10px 0',
            padding: '11px 14px',
            borderRadius: 10,
            background: 'rgba(8, 11, 19, 0.92)',
            border: '1px solid rgba(139, 124, 246, 0.28)',
            color: '#e2e8f0',
            fontSize: 12,
            overflowX: 'auto',
            lineHeight: 1.5,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          <code>{cleanMathText(codeBody)}</code>
        </pre>
      )
    }

    // 2. Xử lý theo dòng cho Heading, Table, Divider, List, Paragraph
    const lines = segment.split('\n')
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const rawLine = lines[i]
      const trimmed = rawLine.trim()

      // Bỏ qua dòng trống thừa
      if (!trimmed) {
        i++
        continue
      }

      // Horizontal Rule: --- hoặc ***
      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        elements.push(
          <hr
            key={`hr-${i}`}
            style={{
              border: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(139, 124, 246, 0.4), transparent)',
              margin: '12px 0',
            }}
          />
        )
        i++
        continue
      }

      // Markdown Table: Dòng bắt đầu và kết thúc bằng | hoặc có | ở giữa kèm dòng phân cách |---|
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?\s*[-:]+\s*\|/.test(lines[i + 1].trim())
      ) {
        const parseTableRow = (rowStr: string) =>
          rowStr
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim())

        const headers = parseTableRow(trimmed)
        i += 2 // Bỏ qua dòng header và dòng |---|---|

        const bodyRows: string[][] = []
        while (i < lines.length && lines[i].trim().includes('|')) {
          const rowText = lines[i].trim()
          if (/^\|?\s*[-:|]+\s*\|?$/.test(rowText)) {
            i++
            continue
          }
          bodyRows.push(parseTableRow(rowText))
          i++
        }

        elements.push(
          <div
            key={`tbl-${i}`}
            style={{
              margin: '10px 0',
              overflowX: 'auto',
              borderRadius: 10,
              border: '1px solid rgba(139, 124, 246, 0.28)',
              background: 'rgba(12, 16, 28, 0.85)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(139, 124, 246, 0.16)', borderBottom: '1px solid rgba(139, 124, 246, 0.25)' }}>
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: '#ddd6fe',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {renderInlineFormatted(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: rIdx < bodyRows.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      background: rIdx % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    }}
                  >
                    {row.map((cell, cIdx) => {
                      const subLines = cell.split(/<br\s*\/?>|\n/gi).filter(Boolean)
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: '8px 10px',
                            color: '#e2e8f0',
                            verticalAlign: 'top',
                            lineHeight: 1.45,
                          }}
                        >
                          {subLines.map((sl, slIdx) => (
                            <div key={slIdx} style={{ marginTop: slIdx > 0 ? 4 : 0 }}>
                              {renderInlineFormatted(sl)}
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }

      // Headings: #, ##, ###, ####
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const headingText = headingMatch[2]
        const fontSize = level === 1 ? 15 : level === 2 ? 14 : 13
        elements.push(
          <div
            key={`h-${i}`}
            style={{
              margin: '10px 0 6px',
              paddingBottom: level <= 2 ? 4 : 0,
              borderBottom: level <= 2 ? '1px solid rgba(139, 124, 246, 0.22)' : 'none',
              fontSize,
              fontWeight: 700,
              color: 'var(--violet)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--violet)',
                flexShrink: 0,
              }}
            />
            <span>{renderInlineFormatted(headingText)}</span>
          </div>
        )
        i++
        continue
      }

      // Bullet list item: - ..., * ..., • ...
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/)
      if (bulletMatch) {
        elements.push(
          <div
            key={`ul-${i}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              margin: '4px 0',
              paddingLeft: 4,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--violet)', fontWeight: 700, marginTop: 1 }}>•</span>
            <div style={{ flex: 1 }}>{renderInlineFormatted(bulletMatch[1])}</div>
          </div>
        )
        i++
        continue
      }

      // Numbered list item hoặc phương án A. B. C. D.
      const optionMatch = trimmed.match(/^([ABCD])\.\s+(.+)$/)
      if (optionMatch) {
        elements.push(
          <div
            key={`opt-${i}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              margin: '4px 0',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(139, 124, 246, 0.08)',
              border: '1px solid rgba(139, 124, 246, 0.2)',
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: 'rgba(139, 124, 246, 0.2)',
                color: 'var(--violet)',
                fontWeight: 700,
                fontSize: 11,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {optionMatch[1]}
            </span>
            <div style={{ flex: 1 }}>{renderInlineFormatted(optionMatch[2])}</div>
          </div>
        )
        i++
        continue
      }

      // Công thức đứng riêng 1 dòng (ví dụ: Δ = b² - 4ac, x₁,₂ = ...)
      const cleanedLine = cleanMathText(trimmed)
      const isFormulaLine =
        cleanedLine.length < 90 &&
        /[=±√Δ²³₁₂≤≥≠⇔⇒]/.test(cleanedLine) &&
        !/^(Bước|Lưu ý|Ghi chú|Ví dụ|Mẹo|Trong đó|Nếu|Khi)/i.test(cleanedLine)

      if (isFormulaLine) {
        elements.push(
          <div
            key={`math-${i}`}
            style={{
              margin: '6px 0',
              padding: '8px 12px',
              borderRadius: 9,
              background: 'linear-gradient(135deg, rgba(139, 124, 246, 0.14), rgba(49, 213, 160, 0.06))',
              border: '1px solid rgba(139, 124, 246, 0.3)',
              color: 'inherit',
              fontWeight: 600,
              fontSize: 13.5,
              letterSpacing: '0.01em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {renderInlineFormatted(cleanedLine)}
          </div>
        )
        i++
        continue
      }

      // Paragraph bình thường
      elements.push(
        <div key={`p-${i}`} style={{ margin: '4px 0', lineHeight: 1.55 }}>
          {renderInlineFormatted(trimmed)}
        </div>
      )
      i++
    }

    return <React.Fragment key={segIdx}>{elements}</React.Fragment>
  })
}

// Chuyên trang Xuất báo cáo, Bảng điểm, Chi tiết bài làm & Phiếu trả lời trắc nghiệm chuẩn Bộ GD&ĐT (1-Click Excel & PDF)
import { cleanMathText } from './math-format'

export interface ExportExamInfo {
  id: number
  title: string
  code: string
  subject_name?: string
  duration_minutes: number
  total_questions: number
  passing_score?: number
  teacher_name?: string
}

export interface ExportClassroomInfo {
  id: number
  name: string
  code: string
  grade?: { name: string }
}

export interface ExportStudentAnswer {
  question_id: number
  question_order: number
  selected_option_id: number | null
  selected_option_key: string | null
  selected_option_content?: string | null
  correct_option_key: string
  correct_option_content?: string
  is_correct: boolean
  points_earned: number
}

export interface ExportStudentRow {
  stt?: number
  student_id: number
  student_code: string
  full_name: string
  status: 'completed' | 'in_progress' | 'not_started'
  status_label: string
  total_score: number | null
  correct_answers_count: number | null
  duration_seconds: number | null
  started_at?: string | null
  submitted_at?: string | null
  academic_rank?: string
  exam_variant_code?: string
  answers?: ExportStudentAnswer[]
}

export interface ExportQuestionAnalyticsItem {
  question_id: number
  order_index: number
  content: string
  points: number
  explanation?: string | null
  correct_option_key: string
  correct_option_content: string
  total_attempts: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  correct_rate: number
  wrong_rate: number
  difficulty_level: string
  difficulty_code: string
  option_stats: Array<{
    option_id: number
    option_key: string
    content: string
    is_correct: boolean
    selection_count: number
    selection_rate: number
  }>
  most_chosen_wrong_option?: {
    option_key: string
    content: string
    selection_count: number
    selection_rate: number
  } | null
}

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}p ${s.toString().padStart(2, '0')}s`
}

function getAcademicRank(score: number | null, status: string): string {
  if (status !== 'completed' || score === null) {
    return status === 'in_progress' ? 'Đang làm bài' : 'Vắng / Chưa thi'
  }
  if (score >= 8.0) return 'Giỏi'
  if (score >= 6.5) return 'Khá'
  if (score >= 5.0) return 'Đạt (Trung bình)'
  return 'Chưa đạt (Yếu)'
}

function triggerExcelDownload(htmlTableDocument: string, filename: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + htmlTableDocument], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function openPrintPDFWindow(htmlDocument: string, title: string) {
  const printWin = window.open('', '_blank', 'width=1080,height=850')
  if (!printWin) {
    alert('Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép mở cửa sổ mới để xuất PDF!')
    return
  }
  printWin.document.open()
  printWin.document.write(htmlDocument)
  printWin.document.close()
  printWin.document.title = title
  printWin.focus()
  setTimeout(() => {
    printWin.print()
  }, 350)
}

/**
 * 1. XUẤT BẢNG ĐIỂM TỔNG HỢP CẢ LỚP RA FILE EXCEL CHUẨN BỘ GD&ĐT (1-CLICK)
 */
export function exportClassScoreboardExcel(params: {
  exam: ExportExamInfo
  classroom: ExportClassroomInfo
  students: ExportStudentRow[]
  questions?: ExportQuestionAnalyticsItem[]
}) {
  const { exam, classroom, students, questions = [] } = params
  const today = new Date()
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')} năm ${today.getFullYear()}`

  const completed = students.filter((s) => s.status === 'completed' && s.total_score !== null)
  const avgScore =
    completed.length > 0
      ? (completed.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / completed.length).toFixed(2)
      : '0.00'
  const passCount = completed.filter((s) => Number(s.total_score || 0) >= 5.0).length
  const passRate = completed.length > 0 ? ((passCount / completed.length) * 100).toFixed(1) : '0.0'

  const rowsHtml = students
    .map((st, idx) => {
      const rank = st.academic_rank || getAcademicRank(st.total_score, st.status)
      const scoreText = st.status === 'completed' && st.total_score !== null ? Number(st.total_score).toFixed(2) : '—'
      const correctText =
        st.status === 'completed' && st.correct_answers_count !== null
          ? `${st.correct_answers_count}/${exam.total_questions}`
          : '—'
      const variantCode = st.exam_variant_code || `MĐ-${String(((st.student_id * 137) % 899) + 101).padStart(3, '0')}`

      const perQuestionCells = questions
        .map((q, qIdx) => {
          const ans = (st.answers || [])[qIdx]
          if (!ans || st.status !== 'completed') {
            return `<td style="text-align:center;color:#888;">-</td>`
          }
          const color = ans.is_correct ? '#065f46' : '#991b1b'
          const bg = ans.is_correct ? '#d1fae5' : '#fee2e2'
          return `<td style="text-align:center;font-weight:bold;color:${color};background:${bg};">${
            ans.selected_option_key || '-'
          } (${ans.is_correct ? 'Đ' : 'S'})</td>`
        })
        .join('')

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;font-weight:bold;">${st.student_code}</td>
          <td>${st.full_name}</td>
          <td style="text-align:center;">${classroom.name}</td>
          <td style="text-align:center;">${variantCode}</td>
          <td style="text-align:center;">${st.status_label}</td>
          <td style="text-align:center;">${correctText}</td>
          <td style="text-align:center;">${formatDuration(st.duration_seconds)}</td>
          <td style="text-align:center;font-weight:bold;color:#1d4ed8;">${scoreText}</td>
          <td style="text-align:center;font-weight:bold;">${rank}</td>
          ${perQuestionCells}
        </tr>
      `
    })
    .join('')

  const questionHeaders = questions
    .map(
      (q, i) =>
        `<th style="background:#1e3a8a;color:#ffffff;text-align:center;padding:6px;">Câu ${i + 1}<br/>(ĐA: ${
          q.correct_option_key
        })</th>`
    )
    .join('')

  const totalCols = 10 + questions.length

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <style>
        body, table, td, th { font-family: "Times New Roman", Times, serif; font-size: 12pt; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333333; padding: 6px 8px; }
        .no-border td { border: none !important; }
      </style>
    </head>
    <body>
      <table class="no-border">
        <tr>
          <td colspan="4" style="text-align:center;font-weight:bold;">SỞ GIÁO DỤC VÀ ĐÀO TẠO<br/>TRƯỜNG THPT EDUTEST</td>
          <td colspan="${Math.max(6, totalCols - 4)}" style="text-align:center;font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>Độc lập - Tự do - Hạnh phúc</td>
        </tr>
        <tr><td colspan="${totalCols}"></td></tr>
        <tr>
          <td colspan="${totalCols}" style="text-align:center;font-size:15pt;font-weight:bold;color:#1e3a8a;">
            BẢNG TỔNG HỢP KẾT QUẢ KIỂM TRA, ĐÁNH GIÁ HỌC SINH (CHUẨN BỘ GD&ĐT)
          </td>
        </tr>
        <tr>
          <td colspan="${totalCols}" style="text-align:center;font-style:italic;">
            Đề thi: <b>${exam.title}</b> (${exam.code}) — Lớp: <b>${classroom.name}</b> — Thời gian: <b>${exam.duration_minutes} phút</b>
          </td>
        </tr>
        <tr>
          <td colspan="${totalCols}" style="text-align:center;">
            Sĩ số: <b>${students.length}</b> | Đã nộp: <b>${completed.length}</b> | Điểm TB lớp: <b>${avgScore}/10</b> | Tỷ lệ Đạt (>=5.0đ): <b>${passRate}%</b>
          </td>
        </tr>
        <tr><td colspan="${totalCols}"></td></tr>
      </table>

      <table>
        <thead>
          <tr>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">STT</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Mã HS (SBD)</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:left;">Họ và tên học sinh</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Lớp</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Mã đề riêng</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Trạng thái</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Số câu đúng</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Thời gian làm</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Điểm số (Thang 10)</th>
            <th style="background:#1e3a8a;color:#ffffff;text-align:center;">Xếp loại học lực</th>
            ${questionHeaders}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <table class="no-border" style="margin-top:20px;">
        <tr><td colspan="${totalCols}"></td></tr>
        <tr>
          <td colspan="4" style="text-align:center;font-weight:bold;">XÁC NHẬN CỦA TỔ CHUYÊN MÔN / BGH</td>
          <td colspan="${Math.max(6, totalCols - 4)}" style="text-align:center;">
            <i>${dateStr}</i><br/>
            <b>GIÁO VIÊN COI & CHẤM THI</b><br/><br/><br/>
            <b>${exam.teacher_name || 'Giáo viên bộ môn'}</b>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  triggerExcelDownload(html, `Bang_Diem_${exam.code}_Lop_${classroom.name}.xls`)
}

/**
 * 2. XUẤT BÁO CÁO PHÂN TÍCH ĐỘ KHÓ CÂU HỎI & CÂU SAI NHIỀU NHẤT RA EXCEL (1-CLICK)
 */
export function exportItemAnalysisExcel(params: {
  exam: ExportExamInfo
  classroom: ExportClassroomInfo
  questions: ExportQuestionAnalyticsItem[]
}) {
  const { exam, classroom, questions } = params
  const rowsHtml = questions
    .map((q) => {
      const optA = q.option_stats.find((o) => o.option_key === 'A')
      const optB = q.option_stats.find((o) => o.option_key === 'B')
      const optC = q.option_stats.find((o) => o.option_key === 'C')
      const optD = q.option_stats.find((o) => o.option_key === 'D')
      const distractor = q.most_chosen_wrong_option
        ? `Phương án ${q.most_chosen_wrong_option.option_key} (${q.most_chosen_wrong_option.selection_rate}%)`
        : 'Không có'

      return `
        <tr>
          <td style="text-align:center;font-weight:bold;">Câu ${q.order_index}</td>
          <td>${cleanMathText(q.content)}</td>
          <td style="text-align:center;font-weight:bold;color:#065f46;">${q.correct_option_key}</td>
          <td style="text-align:center;">${q.difficulty_level}</td>
          <td style="text-align:center;font-weight:bold;color:#065f46;">${q.correct_count}/${q.total_attempts} (${q.correct_rate}%)</td>
          <td style="text-align:center;font-weight:bold;color:#991b1b;">${q.wrong_count + q.unanswered_count}/${q.total_attempts} (${q.wrong_rate}%)</td>
          <td style="text-align:center;">${optA ? `${optA.selection_count} (${optA.selection_rate}%)` : '0'}</td>
          <td style="text-align:center;">${optB ? `${optB.selection_count} (${optB.selection_rate}%)` : '0'}</td>
          <td style="text-align:center;">${optC ? `${optC.selection_count} (${optC.selection_rate}%)` : '0'}</td>
          <td style="text-align:center;">${optD ? `${optD.selection_count} (${optD.selection_rate}%)` : '0'}</td>
          <td style="color:#991b1b;font-weight:bold;">${distractor}</td>
          <td>${cleanMathText(q.explanation || 'Chưa có lời giải')}</td>
        </tr>
      `
    })
    .join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <style>
        body, table, td, th { font-family: "Times New Roman", Times, serif; font-size: 11.5pt; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333333; padding: 6px 8px; }
      </style>
    </head>
    <body>
      <h2 style="text-align:center;color:#1e3a8a;">BÁO CÁO PHÂN TÍCH ĐỘ KHÓ CÂU HỎI & THỐNG KÊ ĐÁP ÁN NHIỄU</h2>
      <p style="text-align:center;">Đề thi: <b>${exam.title}</b> (${exam.code}) — Lớp: <b>${classroom.name}</b></p>
      <table>
        <thead>
          <tr>
            <th style="background:#1e3a8a;color:#fff;">Câu số</th>
            <th style="background:#1e3a8a;color:#fff;">Nội dung câu hỏi</th>
            <th style="background:#1e3a8a;color:#fff;">Đáp án đúng</th>
            <th style="background:#1e3a8a;color:#fff;">Mức độ khó</th>
            <th style="background:#1e3a8a;color:#fff;">Tỷ lệ làm đúng</th>
            <th style="background:#1e3a8a;color:#fff;">Tỷ lệ làm sai</th>
            <th style="background:#1e3a8a;color:#fff;">Chọn A</th>
            <th style="background:#1e3a8a;color:#fff;">Chọn B</th>
            <th style="background:#1e3a8a;color:#fff;">Chọn C</th>
            <th style="background:#1e3a8a;color:#fff;">Chọn D</th>
            <th style="background:#1e3a8a;color:#fff;">Bẫy HS hay sai nhất</th>
            <th style="background:#1e3a8a;color:#fff;">Hướng dẫn giải / Ghi chú ôn tập</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `

  triggerExcelDownload(html, `Phan_Tich_Do_Kho_${exam.code}_Lop_${classroom.name}.xls`)
}

/**
 * 3. XUẤT BẢNG ĐIỂM & BÁO CÁO PHỔ ĐIỂM CẢ LỚP RA PDF CHUẨN BỘ GD&ĐT (1-CLICK)
 */
export function exportClassScoreboardPDF(params: {
  exam: ExportExamInfo
  classroom: ExportClassroomInfo
  students: ExportStudentRow[]
  questions?: ExportQuestionAnalyticsItem[]
}) {
  const { exam, classroom, students, questions = [] } = params
  const today = new Date()
  const dateStr = `Ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')} năm ${today.getFullYear()}`

  const completed = students.filter((s) => s.status === 'completed' && s.total_score !== null)
  const avgScore =
    completed.length > 0
      ? (completed.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / completed.length).toFixed(2)
      : '0.00'
  const passCount = completed.filter((s) => Number(s.total_score || 0) >= 5.0).length
  const passRate = completed.length > 0 ? ((passCount / completed.length) * 100).toFixed(1) : '0.0'

  const rowsHtml = students
    .map((st, idx) => {
      const rank = st.academic_rank || getAcademicRank(st.total_score, st.status)
      const scoreText = st.status === 'completed' && st.total_score !== null ? Number(st.total_score).toFixed(2) : '—'
      const correctText =
        st.status === 'completed' && st.correct_answers_count !== null
          ? `${st.correct_answers_count}/${exam.total_questions}`
          : '—'
      const variantCode = st.exam_variant_code || `MĐ-${String(((st.student_id * 137) % 899) + 101).padStart(3, '0')}`
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="center bold">${st.student_code}</td>
          <td>${st.full_name}</td>
          <td class="center">${classroom.name}</td>
          <td class="center">${variantCode}</td>
          <td class="center">${st.status_label}</td>
          <td class="center">${correctText}</td>
          <td class="center">${formatDuration(st.duration_seconds)}</td>
          <td class="center bold score">${scoreText}</td>
          <td class="center">${rank}</td>
        </tr>
      `
    })
    .join('')

  const missedHtml =
    questions.length > 0
      ? `
      <h3 style="margin:22px 0 8px;font-size:13pt;text-transform:uppercase;">II. Thống kê độ khó câu hỏi & các câu học sinh hay sai nhất</h3>
      <table>
        <thead>
          <tr>
            <th style="width:60px;">Câu</th>
            <th>Nội dung câu hỏi</th>
            <th style="width:70px;">Đáp án</th>
            <th style="width:90px;">Độ khó</th>
            <th style="width:85px;">Tỷ lệ đúng</th>
            <th style="width:85px;">Tỷ lệ sai</th>
            <th style="width:130px;">Phương án nhiễu</th>
          </tr>
        </thead>
        <tbody>
          ${questions
            .map(
              (q) => `
            <tr>
              <td class="center bold">Câu ${q.order_index}</td>
              <td>${cleanMathText(q.content)}</td>
              <td class="center bold">${q.correct_option_key}</td>
              <td class="center">${q.difficulty_level}</td>
              <td class="center">${q.correct_rate}%</td>
              <td class="center bold" style="color:#b91c1c;">${q.wrong_rate}%</td>
              <td class="center">${
                q.most_chosen_wrong_option
                  ? `Chọn ${q.most_chosen_wrong_option.option_key} (${q.most_chosen_wrong_option.selection_rate}%)`
                  : '—'
              }</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
      : ''

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Bảng điểm chuẩn Bộ GD&ĐT - ${exam.code} - Lớp ${classroom.name}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; line-height: 1.4; }
        .header-grid { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .header-col { text-align: center; width: 48%; }
        .underline { display: inline-block; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 2px; }
        .doc-title { text-align: center; margin: 14px 0 6px; font-size: 15pt; font-weight: bold; text-transform: uppercase; }
        .doc-sub { text-align: center; margin-bottom: 14px; font-size: 11.5pt; }
        .summary-bar { display: flex; justify-content: space-around; border: 1px solid #000; padding: 8px 12px; margin-bottom: 16px; background: #f8fafc; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; }
        th, td { border: 1px solid #000; padding: 6px 8px; }
        th { background: #e2e8f0; font-weight: bold; text-align: center; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .score { color: #1e3a8a; font-size: 12pt; }
        .sign-grid { display: flex; justify-content: space-between; margin-top: 26px; page-break-inside: avoid; }
        .sign-box { width: 45%; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-grid">
        <div class="header-col">
          <div>SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div class="bold underline">TRƯỜNG THPT EDUTEST</div>
        </div>
        <div class="header-col">
          <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="bold underline">Độc lập - Tự do - Hạnh phúc</div>
        </div>
      </div>

      <div class="doc-title">BẢNG TỔNG HỢP KẾT QUẢ KIỂM TRA, ĐÁNH GIÁ HỌC SINH</div>
      <div class="doc-sub">
        Bài kiểm tra: <b>${exam.title}</b> (Mã đề gốc: <b>${exam.code}</b>) — Thời gian: <b>${exam.duration_minutes} phút</b><br/>
        Lớp: <b>${classroom.name}</b> (${classroom.grade?.name || 'Khối THPT'}) — Môn: <b>${exam.subject_name || 'Toán học'}</b>
      </div>

      <div class="summary-bar">
        <span>Tổng sĩ số: <b>${students.length} HS</b></span>
        <span>Đã nộp bài: <b>${completed.length} HS</b></span>
        <span>Điểm TB lớp: <b>${avgScore} / 10</b></span>
        <span>Tỷ lệ Đạt (&ge; 5.0đ): <b>${passRate}% (${passCount}/${completed.length || 0})</b></span>
      </div>

      <h3 style="margin:10px 0 8px;font-size:13pt;text-transform:uppercase;">I. Bảng điểm chi tiết của học sinh</h3>
      <table>
        <thead>
          <tr>
            <th style="width:38px;">STT</th>
            <th style="width:72px;">Mã HS</th>
            <th>Họ và tên học sinh</th>
            <th style="width:55px;">Lớp</th>
            <th style="width:72px;">Mã đề</th>
            <th style="width:88px;">Trạng thái</th>
            <th style="width:68px;">Số câu đúng</th>
            <th style="width:74px;">Thời gian</th>
            <th style="width:66px;">Điểm số</th>
            <th style="width:105px;">Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${missedHtml}

      <div class="sign-grid">
        <div class="sign-box">
          <div class="bold">XÁC NHẬN CỦA BAN GIÁM HIỆU / TỔ CM</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</div>
          <div style="height:75px;"></div>
        </div>
        <div class="sign-box">
          <div style="font-style:italic;">${dateStr}</div>
          <div class="bold">GIÁO VIÊN COI & CHẤM THI</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký và ghi rõ họ tên)</div>
          <div style="height:65px;"></div>
          <div class="bold">${exam.teacher_name || 'Giáo viên bộ môn'}</div>
        </div>
      </div>
    </body>
    </html>
  `

  openPrintPDFWindow(html, `Bang_Diem_${exam.code}_Lop_${classroom.name}`)
}

/**
 * 4. XUẤT PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN BỘ GD&ĐT & CHI TIẾT BÀI LÀM CỦA TỪNG HỌC SINH (PDF / OMR BUBBLE SHEET)
 */
export function exportOMRBubbleSheetPDF(params: {
  exam: ExportExamInfo
  classroom: ExportClassroomInfo
  student?: ExportStudentRow | null
  questions: ExportQuestionAnalyticsItem[]
}) {
  const { exam, classroom, student, questions } = params
  const today = new Date()
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${today.getFullYear()}`

  const sbdRaw = student?.student_code ? student.student_code.replace(/\D/g, '').padStart(6, '0').slice(-6) : '000001'
  const variantNumeric = student?.exam_variant_code
    ? student.exam_variant_code.replace(/\D/g, '').padStart(3, '0').slice(-3)
    : '101'

  const totalSlots = Math.max(20, Math.ceil(questions.length / 5) * 5)
  const answerMap: Record<number, ExportStudentAnswer> = {}
  ;(student?.answers || []).forEach((a, idx) => {
    answerMap[idx + 1] = a
  })

  // Render các hàng tô tròn A B C D chuẩn phiếu OMR Bộ GD&ĐT
  const omrItemsHtml: string[] = []
  for (let i = 1; i <= totalSlots; i++) {
    const qMeta = questions[i - 1]
    const stuAns = answerMap[i]
    const chosenKey = stuAns?.selected_option_key || null
    const correctKey = qMeta?.correct_option_key || stuAns?.correct_option_key || null

    const bubbles = ['A', 'B', 'C', 'D']
      .map((letter) => {
        const isChosen = chosenKey === letter
        const isCorrect = correctKey === letter
        let cls = 'bubble'
        if (student && student.status === 'completed' && qMeta) {
          if (isChosen && isCorrect) cls = 'bubble filled-correct'
          else if (isChosen && !isCorrect) cls = 'bubble filled-wrong'
          else if (!isChosen && isCorrect) cls = 'bubble ring-correct'
        } else if (isChosen) {
          cls = 'bubble filled-dark'
        }
        return `<span class="${cls}">${letter}</span>`
      })
      .join('')

    omrItemsHtml.push(`
      <div class="omr-row">
        <span class="omr-qnum">${i}</span>
        <div class="omr-bubbles">${bubbles}</div>
      </div>
    `)
  }

  // Chi tiết từng câu hỏi bên dưới phiếu trả lời trắc nghiệm
  const detailRowsHtml = questions
    .map((q, idx) => {
      const stuAns = answerMap[idx + 1]
      const chosen = stuAns?.selected_option_key || 'Bỏ trống'
      const statusText = !student || student.status !== 'completed' ? '—' : stuAns?.is_correct ? '✓ Đúng' : '✗ Sai'
      const statusColor = !student || student.status !== 'completed' ? '#555' : stuAns?.is_correct ? '#065f46' : '#b91c1c'

      return `
        <tr>
          <td style="text-align:center;font-weight:bold;">Câu ${idx + 1}</td>
          <td>${cleanMathText(q.content)}</td>
          <td style="text-align:center;font-weight:bold;">${chosen}</td>
          <td style="text-align:center;font-weight:bold;color:#065f46;">${q.correct_option_key}</td>
          <td style="text-align:center;font-weight:bold;color:${statusColor};">${statusText}</td>
          <td>${cleanMathText(q.explanation || '—')}</td>
        </tr>
      `
    })
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Phiếu Trả Lời Trắc Nghiệm Chuẩn Bộ GD&ĐT - ${student?.full_name || exam.code}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 11.5pt; color: #000; }
        .sheet-frame { border: 2px solid #000; padding: 14px 16px; position: relative; }
        .corner-mark { width: 12px; height: 12px; background: #000; position: absolute; }
        .tl { top: 4px; left: 4px; } .tr { top: 4px; right: 4px; }
        .bl { bottom: 4px; left: 4px; } .br { bottom: 4px; right: 4px; }
        .top-header { display: flex; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
        .title-center { text-align: center; font-size: 15pt; font-weight: bold; letter-spacing: 0.04em; margin: 4px 0; }
        .info-grid { display: grid; grid-template-columns: 1.45fr 1fr 0.75fr; gap: 12px; margin-bottom: 12px; }
        .box { border: 1px solid #000; padding: 8px 10px; font-size: 11pt; }
        .digit-boxes { display: inline-flex; gap: 3px; margin-top: 4px; }
        .digit-cell { width: 22px; height: 24px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12pt; }
        .score-seal { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .score-big { font-size: 22pt; font-weight: bold; color: #b91c1c; border: 2px solid #b91c1c; border-radius: 6px; padding: 2px 14px; margin-top: 4px; }
        .omr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; border: 1.5px solid #000; padding: 12px; background: #fff; }
        .omr-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 6px; border-bottom: 1px dashed #cbd5e1; }
        .omr-qnum { font-weight: bold; width: 24px; font-size: 10.5pt; }
        .omr-bubbles { display: flex; gap: 6px; }
        .bubble { width: 20px; height: 20px; border-radius: 50%; border: 1.3px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9.5pt; font-weight: bold; }
        .filled-dark { background: #000; color: #fff; }
        .filled-correct { background: #059669; border-color: #059669; color: #fff; }
        .filled-wrong { background: #dc2626; border-color: #dc2626; color: #fff; }
        .ring-correct { border: 2px solid #059669; color: #059669; }
        table.detail-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 10.5pt; }
        table.detail-table th, table.detail-table td { border: 1px solid #000; padding: 5px 7px; }
        table.detail-table th { background: #e2e8f0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="sheet-frame">
        <div class="corner-mark tl"></div><div class="corner-mark tr"></div>
        <div class="corner-mark bl"></div><div class="corner-mark br"></div>

        <div class="top-header">
          <div style="text-align:center;width:44%;">
            <div style="font-size:10.5pt;">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div style="font-weight:bold;">TRƯỜNG THPT EDUTEST</div>
          </div>
          <div style="text-align:center;width:54%;">
            <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-weight:bold;font-size:10.5pt;">Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        <div class="title-center">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
        <div style="text-align:center;font-size:11pt;margin-bottom:10px;">
          Kỳ kiểm tra: <b>${exam.title}</b> — Môn: <b>${exam.subject_name || 'Toán học'}</b> — Ngày thi: <b>${dateStr}</b>
        </div>

        <div class="info-grid">
          <div class="box">
            <div>1. Họ và tên thí sinh: <b style="text-transform:uppercase;">${student?.full_name || '......................................................'}</b></div>
            <div style="margin-top:4px;">2. Lớp: <b>${classroom.name}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Thời gian làm bài: <b>${exam.duration_minutes} phút</b></div>
            <div style="margin-top:4px;">3. Trạng thái: <b>${student ? student.status_label : 'Phiếu mẫu chuẩn Bộ GD&ĐT'}</b></div>
            <div style="margin-top:4px;">4. Chữ ký thí sinh: .........................................................</div>
          </div>

          <div class="box">
            <div><b>7. SỐ BÁO DANH:</b></div>
            <div class="digit-boxes">
              ${sbdRaw
                .split('')
                .map((d) => `<span class="digit-cell">${d}</span>`)
                .join('')}
            </div>
            <div style="margin-top:8px;"><b>8. MÃ ĐỀ THI:</b></div>
            <div class="digit-boxes">
              ${variantNumeric
                .split('')
                .map((d) => `<span class="digit-cell">${d}</span>`)
                .join('')}
            </div>
          </div>

          <div class="box score-seal">
            <div style="font-weight:bold;font-size:10.5pt;">ĐIỂM BÀI THI</div>
            <div class="score-big">
              ${student && student.status === 'completed' && student.total_score !== null ? Number(student.total_score).toFixed(2) : '......'}
            </div>
            <div style="font-size:9.5pt;margin-top:4px;">
              ${
                student && student.status === 'completed'
                  ? `Đúng ${student.correct_answers_count ?? 0}/${exam.total_questions} câu`
                  : 'Thang điểm 10'
              }
            </div>
          </div>
        </div>

        <div style="font-size:10pt;margin-bottom:6px;display:flex;justify-content:space-between;">
          <span><b>PHẦN TRẢ LỜI TRẮC NGHIỆM:</b> Số thứ tự câu trả lời dưới đây ứng với số thứ tự câu trắc nghiệm trong đề thi.</span>
          <span>Chú thích: ● Đã tô đúng &nbsp;|&nbsp; ✖ Tô sai &nbsp;|&nbsp; ○ Đáp án đúng</span>
        </div>

        <div class="omr-grid">
          ${omrItemsHtml.join('')}
        </div>
      </div>

      ${
        student
          ? `
        <h3 style="margin:18px 0 6px;font-size:12.5pt;text-transform:uppercase;">
          BẢNG ĐỐI CHIẾU CHI TIẾT BÀI LÀM CỦA HỌC SINH: ${student.full_name} (${student.student_code})
        </h3>
        <table class="detail-table">
          <thead>
            <tr>
              <th style="width:55px;">Câu</th>
              <th>Nội dung câu hỏi</th>
              <th style="width:72px;">HS Chọn</th>
              <th style="width:72px;">Đáp án đề</th>
              <th style="width:78px;">Kết quả</th>
              <th>Giải thích / Lời giải</th>
            </tr>
          </thead>
          <tbody>
            ${detailRowsHtml}
          </tbody>
        </table>
      `
          : ''
      }
    </body>
    </html>
  `

  openPrintPDFWindow(
    html,
    student
      ? `Phieu_Tra_Loi_${student.student_code}_${exam.code}`
      : `Phieu_Trac_Nghiem_Mau_${exam.code}`
  )
}

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ'
};

const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '⁴',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'n': 'ₙ', 'm': 'ₘ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
};

function normalizeMathOutput(input) {
  if (!input) return '';
  let text = String(input);

  // Gỡ bao LaTeX \( ... \), \[ ... \], $$ ... $$, $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  text = text.replace(/\$([^$\n]+?)\$/g, '$1');

  // Xử lý \text{...}, \mathrm{...}, \mathbf{...}
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|textbf)\{([^{}]*)\}/g, '$1');

  // Số mũ ^{...} và ^2, ^3 (chạy TRƯỚC \frac và \sqrt để tháo dấu ngoặc nhọn lồng nhau)
  text = text.replace(/\^\{([^{}]+)\}/g, (_, exp) => {
    const chars = exp.trim().split('');
    if (chars.every((c) => SUPERSCRIPT_MAP[c])) {
      return chars.map((c) => SUPERSCRIPT_MAP[c]).join('');
    }
    return `^(${exp.trim()})`;
  });
  text = text.replace(/\^([0-9+\-=n])/g, (_, exp) => SUPERSCRIPT_MAP[exp] || `^${exp}`);

  // Chỉ số dưới _{...} và _1, _2 (chạy TRƯỚC \frac và \sqrt)
  text = text.replace(/([a-zA-Z0-9Δ)])_\{([^{}]+)\}/g, (_, base, sub) => {
    const chars = sub.trim().split('');
    if (chars.every((c) => SUBSCRIPT_MAP[c] || c === ',')) {
      return base + chars.map((c) => (c === ',' ? ',' : SUBSCRIPT_MAP[c])).join('');
    }
    return `${base}_(${sub.trim()})`;
  });
  text = text.replace(/([a-zA-ZΔ)])_([0-9nmkijx]+)/g, (_, base, sub) => {
    const chars = sub.split('');
    if (chars.every((c) => SUBSCRIPT_MAP[c])) {
      return base + chars.map((c) => SUBSCRIPT_MAP[c]).join('');
    }
    return `${base}_${sub}`;
  });

  // Xử lý căn bậc 2 & bậc 3: \sqrt{x}, \sqrt[3]{x} (chạy TRƯỚC \frac)
  text = text.replace(/\\sqrt\[3\]\{([^{}]+)\}/g, (_, inner) => {
    const c = inner.trim();
    return c.length > 2 ? `∛(${c})` : `∛${c}`;
  });
  for (let i = 0; i < 3; i++) {
    text = text.replace(/\\sqrt\{([^{}]+)\}/g, (_, inner) => {
      const c = inner.trim();
      return /[+\-\s*/]/.test(c) ? `√(${c})` : `√${c}`;
    });
  }
  text = text.replace(/\\sqrt\s+([a-zA-Z0-9Δ]+)/g, '√$1');

  // Xử lý phân số \frac{a}{b} (sau khi đã tháo hết ngoặc nhọn con của mũ, chỉ số dưới và căn)
  for (let i = 0; i < 4; i++) {
    text = text.replace(/\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const n = num.trim();
      const d = den.trim();
      const nWrap = /[+\-\s]/.test(n) && !/^\(.*\)$/.test(n) ? `(${n})` : n;
      const dWrap = /[+\-\s*/]/.test(d) && !/^\(.*\)$/.test(d) ? `(${d})` : d;
      return `${nWrap}/${dWrap}`;
    });
  }

  // Ký hiệu toán học LaTeX phổ biến
  const replacements = [
    [/\\Delta\b/g, 'Δ'],
    [/\\delta\b/g, 'δ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'],
    [/\\pi\b/g, 'π'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\leq\b|\\le\b/g, '≤'],
    [/\\geq\b|\\ge\b/g, '≥'],
    [/\\neq\b|\\ne\b/g, '≠'],
    [/\\approx\b/g, '≈'],
    [/\\in\b/g, '∈'],
    [/\\notin\b/g, '∉'],
    [/\\subset\b/g, '⊂'],
    [/\\cup\b/g, '∪'],
    [/\\cap\b/g, '∩'],
    [/\\emptyset\b|\\varnothing\b/g, '∅'],
    [/\\infty\b/g, '∞'],
    [/\\forall\b/g, '∀'],
    [/\\exists\b/g, '∃'],
    [/\\Leftrightarrow\b|\\iff\b/g, '⇔'],
    [/\\Rightarrow\b|\\implies\b/g, '⇒'],
    [/\\rightarrow\b|\\to\b/g, '→'],
    [/\\perp\b/g, '⊥'],
    [/\\parallel\b/g, '∥'],
    [/\\angle\b|\\widehat\b/g, '∠'],
    [/\\triangle\b/g, '△'],
    [/\\circ\b/g, '°'],
    [/\\int\b/g, '∫'],
    [/\\sum\b/g, '∑'],
    [/\\mathbb\{R\}/g, 'ℝ'],
    [/\\mathbb\{Z\}/g, 'ℤ'],
    [/\\mathbb\{N\}/g, 'ℕ'],
    [/\\left\s*([()[\]|])/g, '$1'],
    [/\\right\s*([()[\]|])/g, '$1'],
    [/\\\{/g, '{'],
    [/\\\}/g, '}'],
    [/\\,/g, ' '],
    [/\\;/g, ' ']
  ];

  for (const [regex, rep] of replacements) {
    text = text.replace(regex, rep);
  }

  // Số mũ ^{...} và ^2, ^3
  text = text.replace(/\^\{([^{}]+)\}/g, (_, exp) => {
    const chars = exp.trim().split('');
    if (chars.every((c) => SUPERSCRIPT_MAP[c])) {
      return chars.map((c) => SUPERSCRIPT_MAP[c]).join('');
    }
    return `^(${exp.trim()})`;
  });
  text = text.replace(/\^([0-9+\-=n])/g, (_, exp) => SUPERSCRIPT_MAP[exp] || `^${exp}`);

  // Chỉ số dưới _{...} và _1, _2
  text = text.replace(/([a-zA-Z0-9Δ)])_\{([^{}]+)\}/g, (_, base, sub) => {
    const chars = sub.trim().split('');
    if (chars.every((c) => SUBSCRIPT_MAP[c] || c === ',')) {
      return base + chars.map((c) => (c === ',' ? ',' : SUBSCRIPT_MAP[c])).join('');
    }
    return `${base}_(${sub.trim()})`;
  });
  text = text.replace(/([a-zA-ZΔ)])_([0-9nmkijx]+)/g, (_, base, sub) => {
    const chars = sub.split('');
    if (chars.every((c) => SUBSCRIPT_MAP[c])) {
      return base + chars.map((c) => SUBSCRIPT_MAP[c]).join('');
    }
    return `${base}_${sub}`;
  });

  return text;
}

const chatAI = async (req, res) => {
  try {
    const { message, history = [], userRole, userName } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung tin nhắn',
        data: null,
        errors: null,
        timestamp: new Date().toISOString()
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!apiKey && !geminiApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Hệ thống AI chưa được cấu hình phím API',
        data: null,
        errors: null,
        timestamp: new Date().toISOString()
      });
    }

    const roleContext =
      userRole === 'teacher' || userRole === 'admin'
        ? `Người dùng hiện tại là ${userRole === 'admin' ? 'Quản trị viên' : 'Giáo viên'} (${userName || 'Giáo viên/Admin'}). Hãy hỗ trợ soạn câu hỏi trắc nghiệm (có 4 phương án A, B, C, D, chỉ rõ Đáp án đúng và Giải thích chi tiết), gợi ý cấu trúc đề thi, chuẩn hóa công thức toán học để copy thẳng vào ngân hàng câu hỏi, và hướng dẫn sử dụng hệ thống EduTest.`
        : `Người dùng hiện tại là Học sinh (${userName || 'Học sinh'}). Hãy đóng vai trò gia sư AI tận tâm: giải thích kiến thức học tập (Toán, Lý, Hóa, Sinh, Anh, Văn, Sử, Địa, Tin...), hướng dẫn phương pháp giải bài tập dễ hiểu, ôn tập kiến thức và giải đáp thắc mắc về cách làm bài thi trực tuyến, tích lũy xu thưởng (10 xu/câu đúng, thưởng thêm 50 xu khi đạt điểm tối đa) và điểm thành tích (5 điểm/câu đúng) trên EduTest.`;

    const systemPrompt = `Bạn là Trợ lý AI thông minh của hệ thống thi trực tuyến & giám sát thời gian thực EduTest.
${roleContext}

QUY TẮC ĐỊNH DẠNG CÔNG THỨC TOÁN HỌC & CÂU HỎI (BẮT BUỘC TUÂN THỦ):
1. TUYỆT ĐỐI KHÔNG dùng ký pháp LaTeX thô như \\( ... \\), \\[ ... \\], $$ ... $$, \\frac{a}{b}, \\sqrt{x}, hay thẻ HTML <br>.
2. BẮT BUỘC viết tất cả công thức toán bằng ký hiệu Unicode chuẩn, đẹp và dễ đọc trực tiếp:
   - Số mũ & chỉ số dưới: viết x², x³, xⁿ, x₁, x₂ (ví dụ: ax² + bx + c = 0, x₁ + x₂ = -b/a, x₁·x₂ = c/a).
   - Căn thức & biệt thức: viết Δ = b² - 4ac, Δ' = b'² - ac, √Δ, √(x + 1), ∛x.
   - Ký hiệu toán học: ±, ×, ·, ÷, ≤, ≥, ≠, ≈, ∈, ∉, ⊂, ∪, ∩, ∅, ∞, π, α, β, γ, Δ, ⇒, ⇔, ∀, ∃, ∫, ∑, ∠, ⊥, ∥, °.
   - Phân số: viết gọn rõ ràng như (-b ± √Δ) / (2a) hoặc -b / (2a).
3. Khi soạn câu hỏi trắc nghiệm để Giáo viên / Admin đưa vào Ngân hàng câu hỏi, hãy trình bày đúng chuẩn sau cho mỗi câu:
   Câu 1: [Nội dung câu hỏi rõ ràng, công thức Unicode đẹp]
   A. [Nội dung đáp án A]
   B. [Nội dung đáp án B]
   C. [Nội dung đáp án C]
   D. [Nội dung đáp án D]
   Đáp án đúng: [A/B/C/D]
   Giải thích: [Lời giải ngắn gọn, dễ hiểu]`;

    // Chuẩn bị lịch sử hội thoại (giới hạn 10 tin nhắn gần nhất để tối ưu token)
    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: String(item.content)
          }))
      : [];

    const messagesPayload = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...sanitizedHistory,
      {
        role: 'user',
        content: String(message).trim()
      }
    ];

    const modelsToTry = [
      process.env.GROQ_MODEL,
      'groq/compound-mini',
      'groq/compound',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let lastError = '';

    if (apiKey) {
      for (const model of modelsToTry) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: messagesPayload,
              temperature: 0.6,
            })
          });

          if (response.ok) {
            const data = await response.json();
            const rawReply = data.choices?.[0]?.message?.content || 'Tôi không có câu trả lời lúc này.';
            const reply = normalizeMathOutput(rawReply);
            return res.json({
              success: true,
              message: 'Phản hồi từ AI thành công',
              reply,
              model,
              data: {
                reply,
                model
              },
              errors: null,
              timestamp: new Date().toISOString()
            });
          } else {
            lastError = await response.text();
            console.warn(`Groq model ${model} failed (${response.status}):`, lastError);
          }
        } catch (err) {
          lastError = err.message;
          console.warn(`Error calling Groq model ${model}:`, err.message);
        }
      }
    }

    // Fallback sang Gemini API nếu tất cả model Groq đều lỗi và có GEMINI_API_KEY
    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              ...sanitizedHistory.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              })),
              {
                role: 'user',
                parts: [{ text: String(message).trim() }]
              }
            ]
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const rawReply =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Tôi không có câu trả lời lúc này.';
          const reply = normalizeMathOutput(rawReply);
          return res.json({
            success: true,
            message: 'Phản hồi từ Gemini AI thành công',
            reply,
            model: 'gemini-2.0-flash',
            data: {
              reply,
              model: 'gemini-2.0-flash'
            },
            errors: null,
            timestamp: new Date().toISOString()
          });
        } else {
          lastError = await geminiResponse.text();
          console.warn('Gemini fallback failed:', lastError);
        }
      } catch (geminiErr) {
        lastError = geminiErr.message;
        console.warn('Error calling Gemini API:', geminiErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối tới các model AI hiện tại',
      error: lastError,
      data: null,
      errors: lastError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xử lý AI Chatbot',
      data: null,
      errors: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { chatAI };

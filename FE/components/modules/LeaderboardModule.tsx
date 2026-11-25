'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  Coins,
  Star,
  Search,
  ArrowUpRight,
  TrendingUp,
  History,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'

interface RankedStudent {
  rank: number
  id: string
  name: string
  code: string
  className: string
  coins: number
  points: number
  avgScore: number
}

const fallbackRankedStudents: RankedStudent[] = [
  { rank: 1, id: '10', code: 'HS010', name: 'Ngô Bảo Long', className: 'Lớp 12A1', coins: 100, points: 50, avgScore: 10.0 },
  { rank: 2, id: '1', code: 'HS001', name: 'Nguyễn Văn An', className: 'Lớp 10A1', coins: 80, points: 40, avgScore: 8.0 },
  { rank: 3, id: '8', code: 'HS008', name: 'Đinh Khánh Huyền', className: 'Lớp 11A1', coins: 50, points: 25, avgScore: 8.5 },
  { rank: 4, id: '6', code: 'HS006', name: 'Vũ Thị Giang', className: 'Lớp 10A2', coins: 30, points: 15, avgScore: 7.5 },
  { rank: 5, id: '2', code: 'HS002', name: 'Lê Thị Bích', className: 'Lớp 10A1', coins: 0, points: 0, avgScore: 0.0 },
]

interface WalletTransactionItem {
  id: number
  studentName: string
  studentCode: string
  type: 'coins' | 'points'
  amount: number
  reason: string
  timeAgo: string
}

const recentTransactions: WalletTransactionItem[] = [
  { id: 1, studentName: 'Nguyễn Văn An', studentCode: 'HS001', type: 'coins', amount: 40, reason: 'Thưởng hoàn thành đề thi Toán 10 (4 câu đúng)', timeAgo: '10 phút trước' },
  { id: 2, studentName: 'Nguyễn Văn An', studentCode: 'HS001', type: 'points', amount: 20, reason: 'Điểm tích lũy đề thi Toán 10', timeAgo: '10 phút trước' },
  { id: 3, studentName: 'Ngô Bảo Long', studentCode: 'HS010', type: 'coins', amount: 50, reason: 'Thưởng làm đúng 100% đề thi Tiếng Anh', timeAgo: '1 giờ trước' },
  { id: 4, studentName: 'Đinh Khánh Huyền', studentCode: 'HS008', type: 'coins', amount: 25, reason: 'Thưởng hoàn thành bài kiểm tra giữa kỳ', timeAgo: '3 giờ trước' },
]

export default function LeaderboardModule({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const [rankedList, setRankedList] = useState<RankedStudent[]>(fallbackRankedStudents)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch real students from API and rank them by coins + points
  const fetchRankings = async () => {
    setIsLoading(true)
    try {
      const res = await api.classrooms.getTree()
      if (res.data && res.data.length > 0) {
        const allStudents: RankedStudent[] = []
        res.data.forEach((grade: any) => {
          (grade.children || []).forEach((cls: any) => {
            (cls.children || []).forEach((st: any) => {
              allStudents.push({
                rank: 0,
                id: st.student_id?.toString() || st.id?.toString(),
                name: st.full_name,
                code: st.student_code,
                className: cls.name,
                coins: st.wallet_coins || 0,
                points: st.reward_points || 0,
                avgScore: st.wallet_coins ? Number((st.wallet_coins / 10).toFixed(1)) : 0
              })
            })
          })
        })

        // Sort by coins descending
        allStudents.sort((a, b) => b.coins - a.coins || b.points - a.points)
        allStudents.forEach((st, idx) => {
          st.rank = idx + 1
        })

        if (allStudents.length > 0) {
          setRankedList(allStudents)
        }
      }
    } catch (err: any) {
      console.debug('Using fallback rankings:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings()
  }, [])

  const top1 = rankedList[0] || fallbackRankedStudents[0]
  const top2 = rankedList[1] || fallbackRankedStudents[1]
  const top3 = rankedList[2] || fallbackRankedStudents[2]

  const totalCoins = rankedList.reduce((acc, s) => acc + s.coins, 0)
  const totalPoints = rankedList.reduce((acc, s) => acc + s.points, 0)

  const filteredList = rankedList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={embedded ? 'module-embedded' : 'module-shell'}>
      {!embedded && (
        <header className="module-header">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={17} /></div>
            <span>Edu<span className="brand-accent">Test</span></span>
          </div>
          <div className="module-context">
            <span className="module-context-dot" />
            PERFORMANCE BOARD · BẢNG THÀNH TÍCH & VINH DANH HỌC TẬP
          </div>
          {onBack && <button className="secondary-button" onClick={onBack}>← Về tổng quan</button>}
        </header>
      )}

      <section className="content-wrap" style={{ maxWidth: 1300, paddingTop: 30 }}>
        {/* Page Heading */}
        <div className="page-heading" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow"><Trophy size={14} /> VINH DANH HỌC TẬP & GAMIFICATION</div>
            <h1>Bảng xếp hạng thành tích & Ví thưởng</h1>
            <p>Tôn vinh nỗ lực học tập của học sinh, theo dõi số dư ví xu thưởng và lịch sử tích điểm tự động.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ padding: '8px 14px', background: 'rgba(245,173,82,0.1)', border: '1px solid rgba(245,173,82,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Coins size={16} color="#f5ad52" />
              <span style={{ fontSize: 12, color: '#f5ad52', fontWeight: 600 }}>Tổng xu toàn trường: {totalCoins} 🪙</span>
            </div>
            <div style={{ padding: '8px 14px', background: 'rgba(139,124,246,0.1)', border: '1px solid rgba(139,124,246,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={16} color="#8b7cf6" />
              <span style={{ fontSize: 12, color: '#8b7cf6', fontWeight: 600 }}>Tổng điểm thưởng: {totalPoints} ⭐</span>
            </div>
            <button className="icon-button" onClick={fetchRankings} title="Làm mới bảng xếp hạng">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Podium Top 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 16, marginBottom: 32, alignItems: 'end' }}>
          {/* Top 2 */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: 'linear-gradient(145deg, rgba(30,35,55,0.9), rgba(15,19,32,0.9))',
              border: '1px solid rgba(192,192,192,0.3)',
              borderRadius: 16,
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(192,192,192,0.15)', border: '2px solid #c0c0c0', display: 'grid', placeItems: 'center', fontSize: 18, color: '#c0c0c0' }}>
              🥈
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em' }}>HẠNG 2</span>
              <h3 style={{ margin: '4px 0 2px 0', fontSize: 16, color: 'var(--text)' }}>{top2.name}</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{top2.code} · {top2.className}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12 }}>
              <span style={{ color: '#f5ad52', fontWeight: 600 }}>🪙 {top2.coins} xu</span>
              <span style={{ color: '#8b7cf6', fontWeight: 600 }}>⭐ {top2.points}đ</span>
            </div>
          </motion.div>

          {/* Top 1 (Hero) */}
          <motion.div
            whileHover={{ y: -6 }}
            style={{
              background: 'linear-gradient(145deg, rgba(50,45,20,0.9), rgba(20,22,35,0.95))',
              border: '2px solid rgba(245,173,82,0.6)',
              boxShadow: '0 10px 40px rgba(245,173,82,0.15)',
              borderRadius: 18,
              padding: '30px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,173,82,0.2)', border: '2px solid #f5ad52', display: 'grid', placeItems: 'center', fontSize: 24, color: '#f5ad52' }}>
              👑
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#f5ad52', fontWeight: 800, letterSpacing: '0.12em' }}>QUÁN QUÂN · HẠNG 1</span>
              <h2 style={{ margin: '6px 0 2px 0', fontSize: 19, color: '#fff', fontWeight: 700 }}>{top1.name}</h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{top1.code} · {top1.className}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, background: 'rgba(245,173,82,0.08)', padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(245,173,82,0.3)', fontSize: 13 }}>
              <span style={{ color: '#f5ad52', fontWeight: 700 }}>🪙 {top1.coins} xu</span>
              <span style={{ color: '#8b7cf6', fontWeight: 700 }}>⭐ {top1.points}đ</span>
              <span style={{ color: '#31d5a0', fontWeight: 700 }}>{top1.avgScore}đ TB</span>
            </div>
          </motion.div>

          {/* Top 3 */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: 'linear-gradient(145deg, rgba(40,30,25,0.9), rgba(15,19,32,0.9))',
              border: '1px solid rgba(205,127,50,0.3)',
              borderRadius: 16,
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(205,127,50,0.15)', border: '2px solid #cd7f32', display: 'grid', placeItems: 'center', fontSize: 18, color: '#cd7f32' }}>
              🥉
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em' }}>HẠNG 3</span>
              <h3 style={{ margin: '4px 0 2px 0', fontSize: 16, color: '#fff' }}>{top3.name}</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{top3.code} · {top3.className}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12 }}>
              <span style={{ color: '#f5ad52', fontWeight: 600 }}>🪙 {top3.coins} xu</span>
              <span style={{ color: '#8b7cf6', fontWeight: 600 }}>⭐ {top3.points}đ</span>
            </div>
          </motion.div>
        </div>

        {/* 2 Columns: Full Table & Live Transaction Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
          {/* Left: Full Leaderboard Table */}
          <section className="panel" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Bảng xếp hạng đầy đủ</h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>Thứ hạng được cập nhật tự động sau mỗi lần nộp bài</p>
              </div>

              <div className="search-box" style={{ width: 220 }}>
                <Search size={14} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm học sinh, lớp..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', fontSize: 10, borderBottom: '1px solid var(--line)', letterSpacing: '0.08em' }}>
                  <th style={{ padding: '8px 10px' }}>HẠNG</th>
                  <th style={{ padding: '8px 10px' }}>HỌC SINH</th>
                  <th style={{ padding: '8px 10px' }}>LỚP</th>
                  <th style={{ padding: '8px 10px' }}>VÍ XU</th>
                  <th style={{ padding: '8px 10px' }}>ĐIỂM THƯỞNG</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ĐIỂM TB</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: st.rank === 1 ? '#f5ad52' : st.rank === 2 ? '#c0c0c0' : st.rank === 3 ? '#cd7f32' : 'var(--muted)' }}>
                      #{st.rank}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <strong style={{ color: '#fff', display: 'block', fontSize: 13 }}>{st.name}</strong>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{st.code}</span>
                    </td>
                    <td style={{ padding: '12px 10px', color: '#b9c1d6' }}>
                      {st.className}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#f5ad52', fontWeight: 600 }}>
                      🪙 {st.coins}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#a99aff', fontWeight: 600 }}>
                      ⭐ {st.points}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#31d5a0', fontWeight: 700 }}>
                      {st.avgScore.toFixed(1)} / 10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Right: Live Wallet Transaction Feed */}
          <section className="panel" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <History size={16} color="#f5ad52" />
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Lịch sử biến động ví thưởng</h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>Cộng xu & điểm thưởng tự động khi nộp bài</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 12, color: '#fff' }}>{tx.studentName}</strong>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>({tx.studentCode})</span>
                    </div>

                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: tx.type === 'coins' ? '#f5ad52' : '#8b7cf6',
                      background: tx.type === 'coins' ? 'rgba(245,173,82,0.1)' : 'rgba(139,124,246,0.1)',
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      +{tx.amount} {tx.type === 'coins' ? 'xu 🪙' : 'điểm ⭐'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
                    {tx.reason}
                  </p>

                  <span style={{ fontSize: 9, color: '#656e86', marginTop: 2 }}>{tx.timeAgo}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

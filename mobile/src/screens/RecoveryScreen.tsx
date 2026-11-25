import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { Header } from '../components/Header'
import { MathLatexText } from '../components/MathLatexText'
import { studentApi } from '../api/student.api'
import { Sparkles, Brain, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react-native'

export const RecoveryScreen = () => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all')

  // Luyện tập
  const [isPracticing, setIsPracticing] = useState(false)
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRecovery = async () => {
    try {
      const res = await studentApi.getRecovery()
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (err) {
      console.log('Error fetching recovery:', err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecovery()
  }, [])

  const handleStartPractice = () => {
    setIsPracticing(true)
    setPracticeAnswers({})
  }

  const handleSubmitPractice = async () => {
    const payload = Object.entries(practiceAnswers).map(([qId, oId]) => ({
      question_id: Number(qId),
      selected_option_id: Number(oId)
    }))

    if (payload.length === 0) {
      Alert.alert('Chưa chọn đáp án', 'Vui lòng chọn ít nhất 1 câu trả lời')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await studentApi.submitRecovery({ answers: payload })
      if (res.success) {
        Alert.alert('Hoàn thành', `Bạn đã luyện tập ${res.data?.recovered_count || payload.length} câu hỏi phục hồi!`)
        setIsPracticing(false)
        fetchRecovery()
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi khi nộp bài luyện tập')
    } finally {
      setIsSubmitting(false)
    }
  }

  const summary = data?.summary || {
    total_mistakes_found: 0,
    pending_recovery_count: 0,
    recovered_count: 0
  }

  const rawQuestions: any[] = data?.questions || data?.mistakes || []
  const questions = rawQuestions.map((q: any) => ({
    ...q,
    id: q.question_id || q.id,
    options: q.options || q.raw_options || []
  }))

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'pending') return !q.is_recovered
    if (filter === 'recovered') return q.is_recovered
    return true
  })

  return (
    <View style={styles.container}>
      <Header subtitle="PHỤC HỒI KIẾN THỨC THÔNG MINH" />

      {/* Hero Stats */}
      <View style={styles.heroBox}>
        <View style={styles.heroHeader}>
          <Brain size={20} color={colors.primary} />
          <Text style={styles.heroTitle}>Ngân Hàng Câu Sai & Phục Hồi</Text>
          <Sparkles size={16} color={colors.coin} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{summary.total_mistakes_found}</Text>
            <Text style={styles.statLabel}>CÂU SAI TRONG QUÁ KHỨ</Text>
          </View>

          <View style={[styles.statCard, { borderColor: 'rgba(239, 95, 112, 0.3)' }]}>
            <Text style={[styles.statNum, { color: colors.danger }]}>{summary.pending_recovery_count}</Text>
            <Text style={styles.statLabel}>CẦN ÔN LUYỆN LẠI</Text>
          </View>

          <View style={[styles.statCard, { borderColor: 'rgba(49, 213, 160, 0.3)' }]}>
            <Text style={[styles.statNum, { color: colors.success }]}>{summary.recovered_count}</Text>
            <Text style={styles.statLabel}>ĐÃ PHỤC HỒI XONG</Text>
          </View>
        </View>

        {!isPracticing && filteredQuestions.length > 0 && (
          <TouchableOpacity style={styles.startBtn} onPress={handleStartPractice}>
            <PlayCircle size={18} color="#fff" />
            <Text style={styles.startBtnText}>BẮT ĐẦU LUYỆN TẬP PHỤC HỒI NGAY</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            Tất cả ({questions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
            Chưa phục hồi ({summary.pending_recovery_count})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'recovered' && styles.filterTabActive]}
          onPress={() => setFilter('recovered')}
        >
          <Text style={[styles.filterTabText, filter === 'recovered' && styles.filterTabTextActive]}>
            Đã thành công ({summary.recovered_count})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredQuestions}
          keyExtractor={(item, index) => `recovery_q_${item.id || item.question_id || index}`}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80, gap: SPACING.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchRecovery()
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => {
            const isRecovered = item.is_recovered
            const qId = item.id || item.question_id
            const chosenOpt = practiceAnswers[qId]

            return (
              <View style={[styles.qCard, isRecovered && styles.qCardRecovered]}>
                <View style={styles.qHeader}>
                  <Text style={styles.qIndex}>CÂU HỎI {index + 1}</Text>
                  {isRecovered ? (
                    <View style={styles.recoveredBadge}>
                      <CheckCircle2 size={12} color={colors.success} />
                      <Text style={styles.recoveredBadgeText}>ĐÃ PHỤC HỒI</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <AlertCircle size={12} color={colors.danger} />
                      <Text style={styles.pendingBadgeText}>CHƯA ÔN XONG</Text>
                    </View>
                  )}
                </View>

                <MathLatexText content={item.content} style={styles.qContent} />

                {item.image_url ? (
                  <View style={styles.qImageWrap}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.qImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {isPracticing ? (
                  <View style={{ gap: 6, marginTop: SPACING.sm }}>
                    {(item.options || []).map((o: any, oIdx: number) => {
                      const oId = o.id ?? o.option_id ?? oIdx
                      const isSel = chosenOpt === oId
                      return (
                        <TouchableOpacity
                          key={`rec_opt_${qId}_${oId}_${oIdx}`}
                          style={[styles.practiceOpt, isSel && styles.practiceOptSel]}
                          onPress={() =>
                            setPracticeAnswers((prev) => ({ ...prev, [qId]: oId }))
                          }
                        >
                          <Text style={[styles.practiceOptText, isSel && { color: colors.primary, fontWeight: '700' }]}>
                            {o.content}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                ) : (
                  (item.explanation || item.explanation_image_url) && (
                    <View style={styles.explainBox}>
                      <Text style={styles.explainTitle}>💡 Lời giải phục hồi kiến thức:</Text>
                      {item.explanation ? (
                        <MathLatexText content={item.explanation} style={styles.explainText} />
                      ) : null}
                      {item.explanation_image_url ? (
                        <View style={styles.qImageWrap}>
                          <Image
                            source={{ uri: item.explanation_image_url }}
                            style={styles.qImage}
                            resizeMode="contain"
                          />
                        </View>
                      ) : null}
                    </View>
                  )
                )}
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CheckCircle2 size={48} color={colors.success} />
              <Text style={styles.emptyTitle}>Tuyệt vời!</Text>
              <Text style={styles.emptyDesc}>Hiện tại bạn không còn câu hỏi sai nào cần phục hồi.</Text>
            </View>
          }
        />
      )}

      {isPracticing && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelPracticeBtn}
            onPress={() => setIsPracticing(false)}
          >
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Dừng luyện tập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitPracticeBtn}
            onPress={handleSubmitPractice}
            disabled={isSubmitting}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Nộp kết quả phục hồi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    heroBox: {
      margin: SPACING.lg,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.panelSolid,
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.3)'
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: SPACING.md
    },
    heroTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      flex: 1
    },
    statsRow: {
      flexDirection: 'row',
      gap: SPACING.sm
    },
    statCard: {
      flex: 1,
      padding: SPACING.sm,
      backgroundColor: colors.subtleBg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center'
    },
    statNum: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary
    },
    statLabel: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: '700',
      marginTop: 2,
      textAlign: 'center'
    },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      marginTop: SPACING.md
    },
    startBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      gap: 8,
      marginBottom: SPACING.sm
    },
    filterTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg
    },
    filterTabActive: {
      backgroundColor: 'rgba(139, 124, 246, 0.16)',
      borderWidth: 1,
      borderColor: colors.primary
    },
    filterTabText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600'
    },
    filterTabTextActive: {
      color: colors.primary,
      fontWeight: '700'
    },
    qCard: {
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    qCardRecovered: {
      borderColor: 'rgba(49, 213, 160, 0.35)'
    },
    qHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm
    },
    qIndex: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800'
    },
    recoveredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.sm
    },
    recoveredBadgeText: {
      color: colors.success,
      fontSize: 9,
      fontWeight: '700'
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.sm
    },
    pendingBadgeText: {
      color: colors.danger,
      fontSize: 9,
      fontWeight: '700'
    },
    qContent: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      lineHeight: 20
    },
    practiceOpt: {
      padding: 10,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    practiceOptSel: {
      backgroundColor: 'rgba(139, 124, 246, 0.2)',
      borderColor: colors.primary
    },
    practiceOptText: {
      color: colors.text,
      fontSize: 13
    },
    explainBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(139, 124, 246, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.25)'
    },
    explainTitle: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4
    },
    explainText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18
    },
    qImageWrap: {
      marginVertical: 8,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      padding: 4
    },
    qImage: {
      width: '100%',
      height: 180,
      borderRadius: RADIUS.sm
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: SPACING.md,
      backgroundColor: colors.headerBg,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder
    },
    cancelPracticeBtn: {
      padding: 10
    },
    submitPracticeBtn: {
      backgroundColor: colors.success,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 10,
      borderRadius: RADIUS.md
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 60
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginTop: SPACING.md
    },
    emptyDesc: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4
    }
  })

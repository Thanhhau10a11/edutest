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
  Modal,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { Header } from '../components/Header'
import { MathLatexText } from '../components/MathLatexText'
import { studentApi } from '../api/student.api'
import { History, Calendar, CheckCircle2, XCircle, ArrowLeft, Sparkles } from 'lucide-react-native'

export const HistoryScreen = () => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  const safeTop = Math.max(insets.top, statusBarHeight) + 6

  const [historyList, setHistoryList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Detail Modal
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const fetchHistory = async () => {
    try {
      const res = await studentApi.getHistory()
      if (res.success && Array.isArray(res.data)) {
        setHistoryList(res.data)
      }
    } catch (err) {
      console.log('Error fetching history:', err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleOpenDetail = async (attemptId: number) => {
    setIsLoadingDetail(true)
    try {
      const res = await studentApi.getAttemptDetail(attemptId)
      if (res.success && res.data) {
        setSelectedAttempt(res.data)
      }
    } catch (err) {
      console.log('Error fetching attempt detail:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header subtitle="LỊCH SỬ CÁC CA THI ĐÃ NỘP" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={historyList}
          keyExtractor={(item) => String(item.id || item.attempt_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchHistory()
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const score = item.total_score ?? item.score ?? 0
            const isPassed = Number(score) >= 5.0
            const examTitle = item.exam?.title || item.exam_title || 'Bài kiểm tra khảo sát'
            const examCode = item.exam?.code || item.exam_code || 'DE_THI'
            const dateStr = item.created_at || item.submitted_at || new Date().toISOString()

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleOpenDetail(item.id || item.attempt_id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={styles.codeTag}>
                    <Text style={styles.codeText}>{examCode}</Text>
                  </View>
                  <View style={styles.scoreWrap}>
                    <Text
                      style={[
                        styles.scoreText,
                        { color: isPassed ? colors.success : colors.danger }
                      ]}
                    >
                      {score} điểm
                    </Text>
                  </View>
                </View>

                <Text style={styles.examTitle}>{examTitle}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={colors.textMuted} />
                    <Text style={styles.metaText}>{new Date(dateStr).toLocaleString()}</Text>
                  </View>

                  <Text style={styles.viewDetailText}>Xem chi tiết bài làm →</Text>
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <History size={48} color={colors.textSubtle} />
              <Text style={styles.emptyTitle}>Chưa có lịch sử làm bài</Text>
              <Text style={styles.emptyDesc}>Các bài kiểm tra bạn đã nộp sẽ được lưu trữ và thống kê chi tiết tại đây.</Text>
            </View>
          }
        />
      )}

      {/* Attempt Detail Modal */}
      {selectedAttempt && (
        <Modal visible={!!selectedAttempt} animationType="slide">
          <View style={styles.container}>
            <View style={[styles.detailHeader, { paddingTop: safeTop }]}>
              <TouchableOpacity onPress={() => setSelectedAttempt(null)} style={styles.backBtn}>
                <ArrowLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <View>
                <Text style={styles.detailHeaderTitle}>Chi tiết lượt thi</Text>
                <Text style={styles.detailHeaderSub}>
                  Điểm: <Text style={{ color: colors.success, fontWeight: '800' }}>{selectedAttempt.total_score}</Text> | Đúng: {selectedAttempt.correct_count ?? '--'} câu
                </Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}>
              {(selectedAttempt.details || selectedAttempt.attempt_details || []).map((d: any, idx: number) => {
                const q = d.question || {}
                const isRight = d.is_correct
                const detailKey = `hist_detail_${d.id || d.attempt_detail_id || idx}`

                return (
                  <View key={detailKey} style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={styles.qNum}>CÂU HỎI {idx + 1}</Text>
                      {isRight ? (
                        <View style={styles.rightTag}>
                          <CheckCircle2 size={12} color={colors.success} />
                          <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>ĐÚNG</Text>
                        </View>
                      ) : (
                        <View style={styles.wrongTag}>
                          <XCircle size={12} color={colors.danger} />
                          <Text style={{ color: colors.danger, fontSize: 10, fontWeight: '700' }}>CHƯA ĐÚNG</Text>
                        </View>
                      )}
                    </View>

                    <MathLatexText content={q.content} style={styles.qContent} />

                    {q.image_url ? (
                      <View style={styles.qImageWrap}>
                        <Image
                          source={{ uri: q.image_url }}
                          style={styles.qImage}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}

                    <View style={{ gap: 6, marginVertical: SPACING.sm }}>
                      {(q.options || []).map((opt: any, optIdx: number) => {
                        const isChosen = d.selected_option_id === opt.id
                        const isCorrect = Boolean(opt.is_correct)
                        const optKey = opt.option_key || String.fromCharCode(65 + optIdx)

                        return (
                          <View
                            key={`hist_opt_${opt.id || optIdx}`}
                            style={[
                              styles.optItem,
                              isCorrect && styles.optRight,
                              isChosen && !isCorrect && styles.optWrong
                            ]}
                          >
                            {isCorrect ? (
                              <CheckCircle2 size={16} color={colors.success} />
                            ) : isChosen ? (
                              <XCircle size={16} color={colors.danger} />
                            ) : (
                              <View style={styles.optBullet}>
                                <Text style={styles.optBulletText}>{optKey}</Text>
                              </View>
                            )}

                            <View style={{ flex: 1, marginHorizontal: 6 }}>
                              <MathLatexText
                                content={opt.content}
                                style={[
                                  { fontSize: 13 },
                                  isCorrect && { color: colors.success, fontWeight: '700' },
                                  isChosen && !isCorrect && { color: colors.danger, fontWeight: '600' }
                                ]}
                              />
                            </View>

                            {isCorrect ? (
                              <View style={styles.badgeSuccess}>
                                <Text style={styles.badgeSuccessText}>
                                  {isChosen ? '✓ BẠN CHỌN ĐÚNG' : '✓ ĐÁP ÁN ĐÚNG'}
                                </Text>
                              </View>
                            ) : isChosen ? (
                              <View style={styles.badgeDanger}>
                                <Text style={styles.badgeDangerText}>✗ BẠN ĐÃ CHỌN</Text>
                              </View>
                            ) : null}
                          </View>
                        )
                      })}
                    </View>

                    {q.explanation || q.explanation_image_url ? (
                      <View style={styles.explainBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Sparkles size={14} color={colors.coin} />
                          <Text style={styles.explainTitle}>LỜI GIẢI CHI TIẾT & HƯỚNG DẪN:</Text>
                        </View>
                        {q.explanation ? (
                          <MathLatexText content={q.explanation} style={styles.explainText} />
                        ) : null}
                        {q.explanation_image_url ? (
                          <View style={styles.qImageWrap}>
                            <Image
                              source={{ uri: q.explanation_image_url }}
                              style={styles.qImage}
                              resizeMode="contain"
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </ScrollView>
          </View>
        </Modal>
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
    card: {
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm
    },
    codeTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: 'rgba(139, 124, 246, 0.14)'
    },
    codeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700'
    },
    scoreWrap: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg
    },
    scoreText: {
      fontSize: 13,
      fontWeight: '800'
    },
    examTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: SPACING.sm
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.subtleBorder,
      paddingTop: SPACING.sm
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4
    },
    metaText: {
      color: colors.textMuted,
      fontSize: 11
    },
    viewDetailText: {
      color: colors.secondary,
      fontSize: 11,
      fontWeight: '600'
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
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: colors.panelSolid,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder
    },
    backBtn: {
      padding: 6,
      marginRight: SPACING.sm
    },
    detailHeaderTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700'
    },
    detailHeaderSub: {
      color: colors.textMuted,
      fontSize: 12
    },
    detailCard: {
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    detailCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm
    },
    qNum: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800'
    },
    rightTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.sm
    },
    wrongTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: RADIUS.sm
    },
    qContent: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20
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
    optItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: 'transparent'
    },
    optRight: {
      backgroundColor: colors.successBg,
      borderColor: 'rgba(49, 213, 160, 0.4)'
    },
    optWrong: {
      backgroundColor: colors.dangerBg,
      borderColor: 'rgba(239, 95, 112, 0.4)'
    },
    optBullet: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center'
    },
    optBulletText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700'
    },
    badgeSuccess: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(49, 213, 160, 0.3)'
    },
    badgeSuccessText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '800'
    },
    badgeDanger: {
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(239, 95, 112, 0.3)'
    },
    badgeDangerText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '800'
    }
  })

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { MathLatexText } from '../components/MathLatexText'
import { QuestionMatrix } from '../components/QuestionMatrix'
import { TeacherBroadcastModal } from '../components/TeacherBroadcastModal'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { studentApi } from '../api/student.api'
import {
  Clock,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Award,
  Coins,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles
} from 'lucide-react-native'

export const ExamRoomScreen = ({ route, navigation }: any) => {
  const { examData } = route.params
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { user, refreshUserData } = useAuth()
  const {
    activeBroadcast,
    dismissBroadcast,
    joinExamRoom,
    leaveExamRoom,
    reportCheatingWarning
  } = useSocket()

  const exam = examData?.exam || examData
  const questions: any[] = exam?.questions || examData?.questions || []
  const initialDuration = (exam?.duration_minutes || 15) * 60
  const targetExamId = exam?.id || exam?.exam_id || examData?.exam_id
  const targetAttemptId = examData?.attempt?.id || examData?.attempt_id || exam?.attempt_id

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [secondsLeft, setSecondsLeft] = useState(initialDuration)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cheatWarnings, setCheatWarnings] = useState(0)

  const [submissionResult, setSubmissionResult] = useState<any | null>(null)
  const [showReview, setShowReview] = useState(false)

  const appState = useRef(AppState.currentState)

  useEffect(() => {
    const classId = user?.classroom_id || (user as any)?.class_id
    if (targetExamId && classId) {
      joinExamRoom(targetExamId, classId)
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        setCheatWarnings((w) => {
          const nextCount = w + 1
          reportCheatingWarning(
            targetExamId,
            'Rời ứng dụng làm bài / chuyển app trên điện thoại',
            nextCount
          )
          return nextCount
        })
      }
      appState.current = nextAppState
    })

    return () => {
      clearInterval(timer)
      subscription.remove()
      if (targetExamId && classId) {
        leaveExamRoom(targetExamId, classId)
      }
    }
  }, [])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSelectOption = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }))
  }

  const handleSubmit = (autoSubmit = false) => {
    if (!autoSubmit) {
      const answeredCount = Object.keys(answers).length
      Alert.alert(
        'Xác nhận nộp bài',
        `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài thi ngay bây giờ?`,
        [
          { text: 'Làm tiếp', style: 'cancel' },
          { text: 'Nộp bài ngay', style: 'default', onPress: executeSubmit }
        ]
      )
    } else {
      executeSubmit()
    }
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, oId]) => ({
        question_id: Number(qId),
        selected_option_id: Number(oId)
      }))

      const res = await studentApi.submitExam(targetExamId, {
        attempt_id: targetAttemptId,
        answers: payloadAnswers,
        duration_seconds: initialDuration - secondsLeft,
        cheatWarnings
      })

      if (res.success && res.data) {
        setSubmissionResult(res.data)
        refreshUserData()
      } else {
        Alert.alert('Thông báo', res.message || 'Nộp bài hoàn tất')
        navigation.goBack()
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra khi nộp bài')
    } finally {
      setIsSubmitting(false)
    }
  }

  const insets = useSafeAreaInsets()
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  const safeTop = Math.max(insets.top, statusBarHeight) + 6

  const currentQ = questions[currentIndex]
  const questionIds = questions.map((q) => q.id)

  return (
    <View style={styles.container}>
      {/* Topbar Ca Thi */}
      <View style={[styles.topbar, { paddingTop: safeTop }]}>
        <View style={styles.topbarLeft}>
          <Text style={styles.examCode}>{exam?.code}</Text>
          <Text style={styles.progressText}>
            Đã làm: {Object.keys(answers).length}/{questions.length} câu
          </Text>
        </View>

        <View style={styles.timerWrap}>
          <Clock size={16} color={secondsLeft < 300 ? colors.danger : colors.warning} />
          <Text
            style={[
              styles.timerText,
              secondsLeft < 300 && { color: colors.danger }
            ]}
          >
            {formatTimer(secondsLeft)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitTopBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={() => handleSubmit(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={13} color="#fff" />
              <Text style={styles.submitTopBtnText}>Nộp bài</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Cảnh báo gian lận nếu có */}
      {cheatWarnings > 0 && (
        <View style={styles.cheatBanner}>
          <ShieldAlert size={14} color={colors.danger} />
          <Text style={styles.cheatBannerText}>
            Cảnh báo: Bạn đã rời khỏi ứng dụng {cheatWarnings} lần! Hệ thống đã gửi log tới giám thị.
          </Text>
        </View>
      )}

      {/* Question Matrix Selector */}
      <QuestionMatrix
        totalQuestions={questions.length}
        currentIndex={currentIndex}
        answers={answers}
        questionIds={questionIds}
        onSelectIndex={setCurrentIndex}
      />

      {/* Main Question Area */}
      {currentQ ? (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          <View style={styles.qMeta}>
            <View style={styles.qIndexBadge}>
              <Text style={styles.qIndexText}>CÂU HỎI {currentIndex + 1}</Text>
            </View>
            <Text style={styles.qPoints}>({currentQ.points || 1.0} điểm)</Text>
          </View>

          <View style={styles.qContentBox}>
            <MathLatexText content={currentQ.content} style={styles.qContentText} />
          </View>

          {currentQ.image_url ? (
            <Image
              source={{ uri: currentQ.image_url }}
              style={styles.qImage}
              resizeMode="contain"
            />
          ) : null}

          <Text style={styles.optionSectionTitle}>Chọn 1 đáp án chính xác:</Text>
          <View style={styles.optionsList}>
            {(currentQ.options || []).map((opt: any, optIdx: number) => {
              const letter = String.fromCharCode(65 + optIdx)
              const isSelected = answers[currentQ.id] === opt.id

              return (
                <TouchableOpacity
                  key={opt.id || optIdx}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelectOption(currentQ.id, opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionKey, isSelected && styles.optionKeySelected]}>
                    <Text style={[styles.optionKeyText, isSelected && styles.optionKeyTextSelected]}>
                      {letter}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <MathLatexText
                      content={opt.content}
                      style={[styles.optionContent, isSelected && styles.optionContentSelected]}
                    />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Đang chuẩn bị đề thi...</Text>
        </View>
      )}

      {/* Bottom Nav Bar (Prev / Next) */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
        >
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.navBtnText}>Câu trước</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex === questions.length - 1 && { opacity: 0.3 }]}
          disabled={currentIndex === questions.length - 1}
          onPress={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
        >
          <Text style={styles.navBtnText}>Câu sau</Text>
          <ChevronRight size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Modal Broadcast từ Giáo viên */}
      <TeacherBroadcastModal
        broadcast={activeBroadcast}
        onDismiss={dismissBroadcast}
      />

      {/* Modal Kết Quả Sau Khi Nộp Bài */}
      {submissionResult && !showReview && (
        <Modal visible={!!submissionResult && !showReview} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.resultCard}>
              <View style={styles.resultIconWrap}>
                <Award size={36} color={colors.coin} />
              </View>

              <Text style={styles.resultTitle}>NỘP BÀI THÀNH CÔNG!</Text>
              <Text style={styles.resultDesc}>
                Bạn đã hoàn thành bài thi: <Text style={{ color: colors.text, fontWeight: '700' }}>{exam?.title}</Text>
              </Text>

              <View style={styles.scoreBox}>
                <Text style={styles.scoreBig}>
                  {submissionResult.score ?? submissionResult.total_score ?? '8.0'}
                </Text>
                <Text style={styles.scoreScale}>/ 10 ĐIỂM</Text>
              </View>

              <View style={styles.rewardRow}>
                <View style={styles.rewardItem}>
                  <Coins size={16} color={colors.coin} />
                  <Text style={styles.rewardText}>
                    +{submissionResult.earned_coins ?? 40} Xu EduCoins
                  </Text>
                </View>

                <View style={[styles.rewardItem, { borderColor: 'rgba(139, 124, 246, 0.4)' }]}>
                  <Award size={16} color={colors.point} />
                  <Text style={[styles.rewardText, { color: colors.point }]}>
                    +{submissionResult.earned_points ?? 20} Điểm EduPoints
                  </Text>
                </View>
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => {
                    setShowReview(true)
                  }}
                >
                  <Text style={styles.reviewBtnText}>Xem lại bài làm & lời giải</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backHomeBtn}
                  onPress={() => {
                    setSubmissionResult(null)
                    navigation.navigate('Exams')
                  }}
                >
                  <Text style={styles.backHomeBtnText}>Trở về danh sách đề</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Review Solutions Modal */}
      {showReview && (
        <Modal visible={showReview} animationType="slide">
          <View style={styles.container}>
            <View style={[styles.reviewHeader, { paddingTop: safeTop }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowReview(false)
                }}
                style={styles.backBtn}
              >
                <ArrowLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.reviewHeaderTitle}>Lời giải chi tiết bài thi</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}>
              {(() => {
                const reviewQuestions: any[] =
                  submissionResult?.questions_result && submissionResult.questions_result.length > 0
                    ? submissionResult.questions_result
                    : questions

                return reviewQuestions.map((q: any, idx: number) => {
                  const qId = q.id || q.question_id
                  const userChoice = answers[qId] ?? q.selected_option_id
                  const correctOptionId = q.correct_option_id
                  const isQuestionRight = Boolean(
                    q.is_correct ?? (userChoice && correctOptionId && userChoice === correctOptionId)
                  )

                  return (
                    <View key={`rev_q_${qId || idx}`} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <Text style={styles.reviewQNum}>CÂU HỎI {idx + 1}</Text>
                        {isQuestionRight ? (
                          <View style={styles.resultBadgeRight}>
                            <CheckCircle2 size={12} color={colors.success} />
                            <Text style={styles.resultBadgeRightText}>
                              CHÍNH XÁC (+{q.points_earned ?? (10 / reviewQuestions.length).toFixed(1)}đ)
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.resultBadgeWrong}>
                            <XCircle size={12} color={colors.danger} />
                            <Text style={styles.resultBadgeWrongText}>CHƯA ĐÚNG (0đ)</Text>
                          </View>
                        )}
                      </View>

                      <MathLatexText content={q.content} style={{ fontSize: 14, marginBottom: 8 }} />

                      {q.image_url ? (
                        <Image
                          source={{ uri: q.image_url }}
                          style={[styles.qImage, { marginBottom: 12 }]}
                          resizeMode="contain"
                        />
                      ) : null}

                      <View style={{ gap: 6 }}>
                        {(q.options || []).map((opt: any, optIdx: number) => {
                          const optId = opt.id ?? opt.option_id
                          const isChosen = (userChoice === optId) || (q.selected_option_id === optId)
                          const isCorrect = Boolean(opt.is_correct || (correctOptionId && optId === correctOptionId))
                          const optKey = opt.option_key || String.fromCharCode(65 + optIdx)

                          return (
                            <View
                              key={`rev_opt_${optId || optIdx}`}
                              style={[
                                styles.reviewOption,
                                isCorrect && styles.reviewRight,
                                isChosen && !isCorrect && styles.reviewWrong
                              ]}
                            >
                              {isCorrect ? (
                                <CheckCircle size={18} color={colors.success} />
                              ) : isChosen ? (
                                <XCircle size={18} color={colors.danger} />
                              ) : (
                                <View style={styles.optKeyCircle}>
                                  <Text style={styles.optKeyCircleText}>{optKey}</Text>
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
                                <View style={styles.correctTagBadge}>
                                  <Text style={styles.correctTagBadgeText}>
                                    {isChosen ? '✓ BẠN CHỌN ĐÚNG' : '✓ ĐÁP ÁN ĐÚNG'}
                                  </Text>
                                </View>
                              ) : isChosen ? (
                                <View style={styles.wrongTagBadge}>
                                  <Text style={styles.wrongTagBadgeText}>✗ BẠN ĐÃ CHỌN</Text>
                                </View>
                              ) : null}
                            </View>
                          )
                        })}
                      </View>

                      {q.explanation || q.explanation_image_url ? (
                        <View style={styles.explanationBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <Sparkles size={14} color={colors.coin} />
                            <Text style={styles.explanationTitle}>LỜI GIẢI CHI TIẾT & HƯỚNG DẪN:</Text>
                          </View>
                          {q.explanation ? (
                            <MathLatexText content={q.explanation} style={styles.explanationText} />
                          ) : null}
                          {q.explanation_image_url ? (
                            <Image
                              source={{ uri: q.explanation_image_url }}
                              style={[styles.qImage, { marginTop: 8 }]}
                              resizeMode="contain"
                            />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  )
                })
              })()}

              <TouchableOpacity
                style={[styles.reviewBtn, { marginTop: SPACING.md, marginBottom: SPACING.xl }]}
                onPress={() => {
                  setShowReview(false)
                  setSubmissionResult(null)
                  navigation.navigate('Exams')
                }}
              >
                <Text style={styles.reviewBtnText}>Trở về danh sách đề thi</Text>
              </TouchableOpacity>
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
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder
    },
    topbarLeft: {
      flex: 1
    },
    examCode: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800'
    },
    progressText: {
      color: colors.textMuted,
      fontSize: 11
    },
    timerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.md,
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: 'rgba(245, 173, 82, 0.35)'
    },
    timerText: {
      color: colors.warning,
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums']
    },
    submitTopBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.success,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.md,
      marginLeft: SPACING.md
    },
    submitTopBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700'
    },
    cheatBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.dangerBg,
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(239, 95, 112, 0.3)'
    },
    cheatBannerText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: '600',
      flex: 1
    },
    scrollContent: {
      flex: 1
    },
    scrollInner: {
      padding: SPACING.lg,
      paddingBottom: 60
    },
    qMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm
    },
    qIndexBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      backgroundColor: 'rgba(139, 124, 246, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.3)'
    },
    qIndexText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800'
    },
    qPoints: {
      color: colors.textMuted,
      fontSize: 12
    },
    qContentBox: {
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: SPACING.md
    },
    qContentText: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      color: colors.text
    },
    qImage: {
      width: '100%',
      height: 180,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.md
    },
    optionSectionTitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: SPACING.sm
    },
    optionsList: {
      gap: SPACING.sm
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.panelSolid,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    optionCardSelected: {
      backgroundColor: 'rgba(139, 124, 246, 0.15)',
      borderColor: colors.primary
    },
    optionKey: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      justifyContent: 'center',
      alignItems: 'center'
    },
    optionKeySelected: {
      backgroundColor: colors.primary
    },
    optionKeyText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 13
    },
    optionKeyTextSelected: {
      color: '#fff'
    },
    optionContent: {
      fontSize: 14,
      color: colors.text
    },
    optionContentSelected: {
      color: colors.primary,
      fontWeight: '700'
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: SPACING.md,
      backgroundColor: colors.headerBg,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    navBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600'
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(3, 5, 10, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg
    },
    resultCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.4)'
    },
    resultIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md
    },
    resultTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1
    },
    resultDesc: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginVertical: SPACING.sm
    },
    scoreBox: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginVertical: SPACING.md
    },
    scoreBig: {
      fontSize: 48,
      fontWeight: '900',
      color: colors.primary
    },
    scoreScale: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '700'
    },
    rewardRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginBottom: SPACING.xl
    },
    rewardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)'
    },
    rewardText: {
      color: colors.coin,
      fontSize: 11,
      fontWeight: '700'
    },
    resultActions: {
      width: '100%',
      gap: SPACING.sm
    },
    reviewBtn: {
      backgroundColor: colors.primary,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      alignItems: 'center'
    },
    reviewBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13
    },
    backHomeBtn: {
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      alignItems: 'center'
    },
    backHomeBtnText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600'
    },
    reviewHeader: {
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
    reviewHeaderTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700'
    },
    reviewCard: {
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    reviewQNum: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 4
    },
    reviewOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg
    },
    reviewWrong: {
      backgroundColor: colors.dangerBg,
      borderColor: 'rgba(239, 95, 112, 0.4)',
      borderWidth: 1
    },
    reviewRight: {
      backgroundColor: colors.successBg,
      borderColor: 'rgba(49, 213, 160, 0.4)',
      borderWidth: 1
    },
    reviewBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textSubtle
    },
    reviewCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm
    },
    resultBadgeRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(49, 213, 160, 0.3)'
    },
    resultBadgeRightText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '800'
    },
    resultBadgeWrong: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(239, 95, 112, 0.3)'
    },
    resultBadgeWrongText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '800'
    },
    optKeyCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center'
    },
    optKeyCircleText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700'
    },
    correctTagBadge: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(49, 213, 160, 0.3)'
    },
    correctTagBadgeText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: '800'
    },
    wrongTagBadge: {
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'rgba(239, 95, 112, 0.3)'
    },
    wrongTagBadgeText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '800'
    },
    explanationBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(139, 124, 246, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.25)'
    },
    explanationTitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4
    },
    explanationText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18
    }
  })

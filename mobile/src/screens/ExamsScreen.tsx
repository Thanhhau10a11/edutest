import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { Header } from '../components/Header'
import { PinEntryModal } from '../components/PinEntryModal'
import { studentApi } from '../api/student.api'
import { FileText, Clock, HelpCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react-native'

export const ExamsScreen = ({ navigation }: any) => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [exams, setExams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // PIN modal
  const [selectedExam, setSelectedExam] = useState<any | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  const fetchExams = async () => {
    try {
      const res = await studentApi.getAvailableExams()
      if (res.success && Array.isArray(res.data)) {
        setExams(res.data)
      }
    } catch (err) {
      console.log('Error fetching exams:', err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

  const handleStartExam = async (pin: string) => {
    if (!selectedExam) return
    const examTargetId = selectedExam.exam_id || selectedExam.id
    setIsStarting(true)
    setPinError(null)

    try {
      const res = await studentApi.startExam(examTargetId, pin)
      if (res.success && res.data) {
        setSelectedExam(null)
        navigation.navigate('ExamRoom', {
          examData: res.data
        })
      } else {
        setPinError(res.message || 'Mã PIN không chính xác hoặc bài thi đã đóng')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể vào ca thi. Vui lòng kiểm tra mã PIN hoặc khóa thiết bị.'
      setPinError(msg)
    } finally {
      setIsStarting(false)
    }
  }

  const renderExamCard = ({ item }: { item: any }) => {
    const isCompleted = item.student_attempt?.status === 'completed'
    const isInProgress = item.student_attempt?.status === 'in_progress'
    const examCode = item.code || item.exam_code || 'DE_THI'
    const examTitle = item.title || item.exam_title || item.description || 'Đề kiểm tra đánh giá'

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.codeTag}>
            <FileText size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.codeText}>{examCode}</Text>
          </View>
          <View style={[styles.statusTag, isCompleted && styles.statusCompleted]}>
            <Text style={[styles.statusText, isCompleted && styles.statusCompletedText]}>
              {isCompleted ? '✓ ĐÃ NỘP BÀI' : isInProgress ? '⏳ ĐANG LÀM DỞ' : 'CHƯA MỞ ĐỀ'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{examTitle}</Text>
        {item.description && item.description !== examTitle ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.duration_minutes || 15} phút</Text>
          </View>

          <View style={styles.metaItem}>
            <HelpCircle size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.total_questions || 5} câu hỏi</Text>
          </View>

          <View style={styles.metaItem}>
            <ShieldCheck size={13} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.secondary }]}>Đảo A-B-C-D</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {isCompleted ? (
            <View style={styles.resultRow}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={styles.scoreText}>
                Điểm đạt: <Text style={{ color: colors.success, fontWeight: '800' }}>{item.student_attempt?.total_score ?? '--'}</Text>
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedExam(item)
                setPinError(null)
              }}
            >
              <Text style={styles.actionBtnText}>{isInProgress ? 'Tiếp tục làm bài' : 'Vào ca thi ngay'}</Text>
              <ArrowRight size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header subtitle="KHO ĐỀ THI ĐƯỢC GIAO" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách bài thi...</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item, idx) => String(item.exam_id || item.id || idx)}
          renderItem={renderExamCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchExams()
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText size={48} color={colors.textSubtle} />
              <Text style={styles.emptyTitle}>Chưa có đề thi nào</Text>
              <Text style={styles.emptyDesc}>Giáo viên hiện tại chưa phát đề thi nào cho lớp của bạn.</Text>
            </View>
          }
        />
      )}

      {selectedExam && (
        <PinEntryModal
          visible={!!selectedExam}
          examTitle={selectedExam.title || selectedExam.exam_title}
          examCode={selectedExam.code || selectedExam.exam_code}
          onClose={() => setSelectedExam(null)}
          onSubmit={handleStartExam}
          isStarting={isStarting}
          errorMsg={pinError}
        />
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
    loadingText: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: SPACING.md
    },
    list: {
      padding: SPACING.lg,
      gap: SPACING.md
    },
    card: {
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm
    },
    codeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      backgroundColor: 'rgba(139, 124, 246, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.3)'
    },
    codeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700'
    },
    statusTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.subtleBg
    },
    statusCompleted: {
      backgroundColor: colors.successBg
    },
    statusText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '700'
    },
    statusCompletedText: {
      color: colors.success
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4
    },
    desc: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: SPACING.md
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.subtleBorder,
      borderBottomWidth: 1,
      borderBottomColor: colors.subtleBorder,
      marginBottom: SPACING.md
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
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center'
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary
    },
    actionBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700'
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    scoreText: {
      color: colors.text,
      fontSize: 13
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
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
      marginTop: 4,
      maxWidth: 260
    }
  })

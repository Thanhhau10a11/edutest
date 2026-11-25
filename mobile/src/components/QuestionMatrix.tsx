import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'

interface QuestionMatrixProps {
  totalQuestions: number
  currentIndex: number
  answers: Record<number, number>
  questionIds: number[]
  onSelectIndex: (index: number) => void
}

export const QuestionMatrix: React.FC<QuestionMatrixProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
  onSelectIndex
}) => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách câu hỏi ({totalQuestions} câu):</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const qId = questionIds[idx]
          const isAnswered = qId !== undefined && answers[qId] !== undefined
          const isCurrent = currentIndex === idx

          return (
            <TouchableOpacity
              key={`matrix_q_${idx}`}
              onPress={() => onSelectIndex(idx)}
              style={[
                styles.item,
                isAnswered && styles.itemAnswered,
                isCurrent && styles.itemCurrent
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  isAnswered && styles.itemTextAnswered,
                  isCurrent && styles.itemTextCurrent
                ]}
              >
                {idx + 1}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: SPACING.sm,
      backgroundColor: colors.panelSolid,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder
    },
    title: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: SPACING.md,
      marginBottom: 6
    },
    list: {
      paddingHorizontal: SPACING.md,
      gap: 8
    },
    item: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center'
    },
    itemAnswered: {
      backgroundColor: 'rgba(139, 124, 246, 0.22)',
      borderColor: colors.primary
    },
    itemCurrent: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.primary
    },
    itemText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700'
    },
    itemTextAnswered: {
      color: colors.primary
    },
    itemTextCurrent: {
      color: '#fff'
    }
  })

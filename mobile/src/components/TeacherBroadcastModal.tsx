import React, { useMemo } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { BellRing, ShieldAlert, Check } from 'lucide-react-native'
import { BroadcastNotification } from '../context/SocketContext'

interface TeacherBroadcastModalProps {
  broadcast: BroadcastNotification | null
  onDismiss: () => void
}

export const TeacherBroadcastModal: React.FC<TeacherBroadcastModalProps> = ({ broadcast, onDismiss }) => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (!broadcast) return null

  const isWarning = broadcast.level === 'warning' || broadcast.level === 'urgent'

  return (
    <Modal visible={!!broadcast} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, isWarning && styles.warningBorder]}>
          <View style={[styles.iconWrap, isWarning ? styles.iconWarning : styles.iconInfo]}>
            {isWarning ? <ShieldAlert size={28} color="#fff" /> : <BellRing size={28} color="#fff" />}
          </View>

          <Text style={styles.tag}>
            {isWarning ? '⚠️ CẢNH BÁO TỪ GIÁM THỊ' : '📢 THÔNG BÁO TỪ GIÁO VIÊN'}
          </Text>

          <Text style={styles.sender}>
            Gửi bởi: <Text style={{ color: colors.text, fontWeight: '700' }}>{broadcast.sender_name}</Text> ({broadcast.timestamp})
          </Text>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{broadcast.message}</Text>
          </View>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Check size={16} color="#fff" />
            <Text style={styles.dismissBtnText}>Em đã hiểu và ghi nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(5, 7, 15, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      borderWidth: 1.5,
      borderColor: 'rgba(139, 124, 246, 0.4)',
      alignItems: 'center'
    },
    warningBorder: {
      borderColor: 'rgba(239, 95, 112, 0.6)'
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md
    },
    iconInfo: {
      backgroundColor: '#3b82f6'
    },
    iconWarning: {
      backgroundColor: '#ef4444'
    },
    tag: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
      marginBottom: 4
    },
    sender: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: SPACING.md
    },
    messageBox: {
      width: '100%',
      backgroundColor: colors.subtleBg,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: SPACING.lg
    },
    messageText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '500'
    },
    dismissBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      width: '100%',
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary
    },
    dismissBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14
    }
  })

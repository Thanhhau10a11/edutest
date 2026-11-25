import React, { useState, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { KeyRound, ShieldAlert, X } from 'lucide-react-native'

interface PinEntryModalProps {
  visible: boolean
  examTitle: string
  examCode: string
  onClose: () => void
  onSubmit: (pin: string) => Promise<void>
  isStarting: boolean
  errorMsg: string | null
}

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  visible,
  examTitle,
  examCode,
  onClose,
  onSubmit,
  isStarting,
  errorMsg
}) => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [pin, setPin] = useState('')

  const handleConfirm = () => {
    onSubmit(pin)
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <KeyRound size={20} color={colors.warning} />
            </View>
            <Text style={styles.headerTitle}>Xác Thực Ca Thi</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.examInfo}>
            {examCode}: <Text style={{ color: colors.text, fontWeight: '700' }}>{examTitle}</Text>
          </Text>

          <View style={styles.noticeBox}>
            <ShieldAlert size={16} color={colors.secondary} style={{ marginTop: 2 }} />
            <Text style={styles.noticeText}>
              Bảo mật ca thi: Tài khoản sẽ được <Text style={{ fontWeight: '700', color: colors.secondary }}>khóa trên thiết bị này</Text>. Không thể đăng nhập thiết bị thứ hai để làm hộ.
            </Text>
          </View>

          <Text style={styles.label}>Nhập Mã PIN Ca Thi (6 số do giáo viên cấp):</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="Nhập 6 chữ số PIN"
            placeholderTextColor={colors.textSubtle}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isStarting}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isStarting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={isStarting}
            >
              {isStarting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Vào thi ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(3, 5, 10, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      borderWidth: 1,
      borderColor: 'rgba(139, 124, 246, 0.35)'
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
      marginLeft: SPACING.sm
    },
    closeBtn: {
      padding: 4
    },
    examInfo: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: SPACING.md
    },
    noticeBox: {
      flexDirection: 'row',
      gap: SPACING.sm,
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.25)',
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      marginBottom: SPACING.lg
    },
    noticeText: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 16
    },
    label: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: SPACING.xs
    },
    pinInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: RADIUS.md,
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: 4,
      textAlign: 'center',
      paddingVertical: SPACING.md,
      marginBottom: SPACING.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginBottom: SPACING.sm,
      textAlign: 'center'
    },
    footer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginTop: SPACING.sm
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center'
    },
    cancelBtnText: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 13
    },
    submitBtn: {
      flex: 1.5,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      alignItems: 'center'
    },
    submitBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13
    }
  })

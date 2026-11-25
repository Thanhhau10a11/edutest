import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react-native'

export const LoginScreen = () => {
  const { login } = useAuth()
  const { colors, isDark, setTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  const safeTop = Math.max(insets.top, statusBarHeight) + 8

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập mã học sinh và mật khẩu')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const res = await login({ student_code: username.trim(), password: password.trim() })
    setIsLoading(false)

    if (!res.success) {
      setErrorMsg(res.message || 'Mã học sinh hoặc mật khẩu không chính xác')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top Bar với thanh gạt Giao diện Sáng / Tối (Đã ẩn hoàn toàn nút răng cưa) */}
      <View style={[styles.topBar, { paddingTop: safeTop }]}>
        <View />
        <View style={styles.themeToggleSegmented}>
          <TouchableOpacity
            style={[styles.themeSegmentBtn, !isDark && styles.themeSegmentBtnActive]}
            onPress={() => setTheme('light')}
            activeOpacity={0.8}
          >
            <Sun size={14} color={!isDark ? '#f59e0b' : colors.textMuted} />
            <Text style={[styles.themeToggleText, !isDark && styles.themeToggleTextActive]}>
              Sáng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeSegmentBtn, isDark && styles.themeSegmentBtnActive]}
            onPress={() => setTheme('dark')}
            activeOpacity={0.8}
          >
            <Moon size={14} color={isDark ? colors.primary : colors.textMuted} />
            <Text style={[styles.themeToggleText, isDark && styles.themeToggleTextActive]}>
              Tối
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <GraduationCap size={36} color="#fff" />
          </View>
          <Text style={styles.appTitle}>EduTest</Text>
          <Text style={styles.appSubtitle}>CỔNG KHẢO THÍ HỌC SINH</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>
          <Text style={styles.cardDesc}>Sử dụng tài khoản học sinh được cấp để vào phòng thi</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã học sinh</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nhập mã học sinh (VD: HS001)"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpRow}>
            <Text style={styles.helpText}>Quên mật khẩu? Liên hệ giáo viên chủ nhiệm</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hệ thống Khảo thí & Đánh giá Trực tuyến EduTest</Text>
          <Text style={styles.footerSub}>Phiên bản 2.6 Enterprise</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingBottom: 10
    },
    themeToggleSegmented: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 3,
      borderRadius: RADIUS.full,
      backgroundColor: colors.panelSolid,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    themeSegmentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.full
    },
    themeSegmentBtnActive: {
      backgroundColor: colors.primaryGlow
    },
    themeToggleText: {
      color: colors.textMuted,
      fontSize: 11.5,
      fontWeight: '600'
    },
    themeToggleTextActive: {
      color: colors.text,
      fontWeight: '800'
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl
    },
    logoBadge: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      shadowColor: colors.primary,
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10
    },
    appTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5
    },
    appSubtitle: {
      fontSize: 10,
      color: colors.primary,
      letterSpacing: 1.5,
      fontWeight: '800',
      marginTop: 4
    },
    card: {
      backgroundColor: colors.panelSolid,
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4
    },
    cardDesc: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: SPACING.lg,
      lineHeight: 18
    },
    errorBox: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: 'rgba(239, 95, 112, 0.35)',
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.md
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600'
    },
    inputGroup: {
      marginBottom: SPACING.md
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: SPACING.md,
      height: 48
    },
    inputIcon: {
      marginRight: SPACING.sm
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '500'
    },
    loginBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      height: 48,
      borderRadius: RADIUS.md,
      marginTop: SPACING.sm,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 4
    },
    loginBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700'
    },
    helpRow: {
      marginTop: SPACING.lg,
      alignItems: 'center'
    },
    helpText: {
      color: colors.textMuted,
      fontSize: 12
    },
    footer: {
      marginTop: SPACING.xxl,
      alignItems: 'center'
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '500'
    },
    footerSub: {
      color: colors.textSubtle,
      fontSize: 10,
      marginTop: 2
    }
  })

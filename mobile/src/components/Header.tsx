import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { LogOut, Coins, Award, Sun, Moon } from 'lucide-react-native'

interface HeaderProps {
  title?: string
  subtitle?: string
  showUserStats?: boolean
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showUserStats = true }) => {
  const { user, logout } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  // Đảm bảo khoảng cách an toàn, tránh hoàn toàn phần Notch, Camera nốt ruồi và Status Bar
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  const safeTop = Math.max(insets.top, statusBarHeight) + 8

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.left}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>ET</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title || user?.full_name || 'Học sinh'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || (user?.classroom_name ? `Lớp ${user.classroom_name}` : 'EduTest Mobile')}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {showUserStats && (
          <>
            <View style={styles.statBadge}>
              <Coins size={13} color={colors.coin} />
              <Text style={styles.statValue}>{user?.wallet_coins ?? 0}</Text>
            </View>

            <View style={[styles.statBadge, styles.pointBadge]}>
              <Award size={13} color={colors.point} />
              <Text style={[styles.statValue, { color: colors.point }]}>
                {user?.reward_points ?? 0}
              </Text>
            </View>
          </>
        )}

        {/* Nút chuyển đổi giao diện Sáng / Tối (Hiển thị đúng trạng thái hiện tại) */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.75}
        >
          {isDark ? (
            <Moon size={16} color={colors.primary} />
          ) : (
            <Sun size={16} color={colors.coin} />
          )}
        </TouchableOpacity>

        {showUserStats && (
          <TouchableOpacity
            onPress={logout}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.75}
          >
            <LogOut size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
      marginRight: SPACING.sm
    },
    brandMark: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 4
    },
    brandMarkText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14
    },
    infoCol: {
      flex: 1,
      minWidth: 0
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700'
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 1
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: 'rgba(245, 173, 82, 0.3)'
    },
    pointBadge: {
      borderColor: 'rgba(139, 124, 246, 0.3)'
    },
    statValue: {
      color: colors.coin,
      fontSize: 11,
      fontWeight: '700'
    },
    iconBtn: {
      padding: 7,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    }
  })

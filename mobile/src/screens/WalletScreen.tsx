import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Switch
} from 'react-native'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { studentApi } from '../api/student.api'
import { Coins, Award, LogOut, ArrowUpRight, ShieldCheck, Sun, Moon } from 'lucide-react-native'

export const WalletScreen = () => {
  const { user, logout } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [wallet, setWallet] = useState<any>({
    balance: { wallet_coins: 0, reward_points: 0 },
    transactions: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchWallet = async () => {
    try {
      const res = await studentApi.getWallet()
      if (res.success && res.data) {
        setWallet(res.data)
      }
    } catch (err) {
      console.log('Error fetching wallet:', err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [])

  const transactions: any[] = wallet?.transactions || []

  return (
    <View style={styles.container}>
      <Header subtitle="VÍ THƯỞNG & TÀI KHOẢN HỌC SINH" showUserStats={false} />

      <FlatList
        data={transactions}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchWallet()
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Student Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'H'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{user?.full_name}</Text>
                <Text style={styles.studentCode}>Mã HS: {user?.student_code} · Lớp {user?.classroom_name || '10A1'}</Text>
                <View style={styles.roleTag}>
                  <ShieldCheck size={12} color={colors.secondary} />
                  <Text style={styles.roleText}>Tài khoản Học sinh chính thức</Text>
                </View>
              </View>
            </View>

            {/* Theme Switcher Card */}
            <TouchableOpacity
              style={styles.themeCard}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <View style={styles.themeIconWrap}>
                {isDark ? (
                  <Moon size={18} color={colors.primary} />
                ) : (
                  <Sun size={18} color={colors.coin} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.themeTitle}>
                  Chế độ Tối (Dark Mode)
                </Text>
                <Text style={styles.themeSub}>
                  Đang bật: {isDark ? 'Giao diện Tối (Ban đêm)' : 'Giao diện Sáng (Ban ngày)'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#cbd5e1', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </TouchableOpacity>

            {/* Balances Card */}
            <View style={styles.balanceGrid}>
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Coins size={20} color={colors.coin} />
                  <Text style={styles.balanceTitle}>EduCoins</Text>
                </View>
                <Text style={[styles.balanceValue, { color: colors.coin }]}>
                  {wallet?.balance?.wallet_coins ?? user?.wallet_coins ?? 0}
                </Text>
                <Text style={styles.balanceSub}>Xu thưởng hoàn thành bài thi</Text>
              </View>

              <View style={[styles.balanceCard, { borderColor: 'rgba(139, 124, 246, 0.35)' }]}>
                <View style={styles.balanceHeader}>
                  <Award size={20} color={colors.point} />
                  <Text style={[styles.balanceTitle, { color: colors.point }]}>EduPoints</Text>
                </View>
                <Text style={[styles.balanceValue, { color: colors.point }]}>
                  {wallet?.balance?.reward_points ?? user?.reward_points ?? 0}
                </Text>
                <Text style={styles.balanceSub}>Điểm kinh nghiệm tích lũy</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Lịch sử biến động số dư thưởng</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txIcon}>
              <ArrowUpRight size={16} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc}>{item.description || 'Thưởng hoàn thành ca thi đạt yêu cầu'}</Text>
              <Text style={styles.txDate}>{new Date(item.created_at || Date.now()).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.txAmount}>+{item.amount || item.coins || 40} Xu</Text>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut size={16} color={colors.danger} />
            <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
          </TouchableOpacity>
        }
      />
    </View>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: SPACING.md
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center'
    },
    avatarText: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '800'
    },
    studentName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700'
    },
    studentCode: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2
    },
    roleTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4
    },
    roleText: {
      color: colors.secondary,
      fontSize: 11,
      fontWeight: '600'
    },
    themeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: colors.panelSolid,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: SPACING.md
    },
    themeIconWrap: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    themeTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700'
    },
    themeSub: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2
    },
    balanceGrid: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.lg
    },
    balanceCard: {
      flex: 1,
      backgroundColor: colors.panelSolid,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACING.sm
    },
    balanceTitle: {
      color: colors.coin,
      fontSize: 12,
      fontWeight: '700'
    },
    balanceValue: {
      fontSize: 28,
      fontWeight: '900',
      marginBottom: 4
    },
    balanceSub: {
      color: colors.textMuted,
      fontSize: 10
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: SPACING.sm
    },
    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: colors.panelSolid,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    txIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.successBg,
      justifyContent: 'center',
      alignItems: 'center'
    },
    txDesc: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500'
    },
    txDate: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2
    },
    txAmount: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '800'
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.dangerBg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      marginTop: SPACING.xl,
      borderWidth: 1,
      borderColor: 'rgba(239, 95, 112, 0.3)'
    },
    logoutText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700'
    }
  })

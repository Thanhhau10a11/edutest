import React, { useState, useMemo } from 'react'
import { TouchableOpacity, StyleSheet, View } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

import { LoginScreen } from '../screens/LoginScreen'
import { ExamsScreen } from '../screens/ExamsScreen'
import { ExamRoomScreen } from '../screens/ExamRoomScreen'
import { RecoveryScreen } from '../screens/RecoveryScreen'
import { HistoryScreen } from '../screens/HistoryScreen'
import { WalletScreen } from '../screens/WalletScreen'
import { AIChatModal } from '../screens/AIChatModal'

import { FileText, Brain, History, User, Bot, Sparkles } from 'lucide-react-native'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function MainTabNavigator() {
  const [showAiChat, setShowAiChat] = useState(false)
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarLabelStyle: styles.tabLabel
        }}
      >
        <Tab.Screen
          name="Exams"
          component={ExamsScreen}
          options={{
            tabBarLabel: 'Kho đề thi',
            tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />
          }}
        />

        <Tab.Screen
          name="Recovery"
          component={RecoveryScreen}
          options={{
            tabBarLabel: 'Luyện tập',
            tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />
          }}
        />

        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'Lịch sử',
            tabBarIcon: ({ color, size }) => <History size={size} color={color} />
          }}
        />

        <Tab.Screen
          name="Wallet"
          component={WalletScreen}
          options={{
            tabBarLabel: 'Ví & Tôi',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />
          }}
        />
      </Tab.Navigator>

      {/* Floating AI Chatbox Widget */}
      <TouchableOpacity
        style={styles.floatingAiBtn}
        onPress={() => setShowAiChat(true)}
        activeOpacity={0.85}
      >
        <Bot size={22} color="#fff" />
        <View style={styles.aiSparkle}>
          <Sparkles size={10} color={colors.coin} />
        </View>
      </TouchableOpacity>

      <AIChatModal visible={showAiChat} onClose={() => setShowAiChat(false)} />
    </View>
  )
}

export const AppNavigator = () => {
  const { user, isLoading } = useAuth()
  const { colors, isDark } = useTheme()

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.panelSolid,
        text: colors.text,
        border: colors.cardBorder,
        primary: colors.primary
      }
    }
  }, [isDark, colors])

  if (isLoading) {
    return null
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="ExamRoom"
              component={ExamRoomScreen}
              options={{ gestureEnabled: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.tabBarBg,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      height: 60,
      paddingBottom: 8,
      paddingTop: 6
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '700'
    },
    floatingAiBtn: {
      position: 'absolute',
      bottom: 74,
      right: 18,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.25)'
    },
    aiSparkle: {
      position: 'absolute',
      top: 6,
      right: 8
    }
  })

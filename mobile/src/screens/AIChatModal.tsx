import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RADIUS, SPACING, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'
import { MathLatexText } from '../components/MathLatexText'
import { studentApi } from '../api/student.api'
import { useAuth } from '../context/AuthContext'
import { Bot, Send, X, Sparkles, User } from 'lucide-react-native'

interface Message {
  id: string
  sender: 'user' | 'ai'
  content: string
  timestamp: string
}

interface AIChatModalProps {
  visible: boolean
  onClose: () => void
}

const QUICK_MATH_SYMBOLS = ['x²', 'x³', 'x₁', 'x₂', 'Δ', '√', '±', '≤', '≥', '≠', '∈', '⇒', '⇔']

export const AIChatModal: React.FC<AIChatModalProps> = ({ visible, onClose }) => {
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  const safeTop = Math.max(insets.top, statusBarHeight) + 6

  const flatListRef = useRef<FlatList>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      content:
        'Xin chào em! Thầy là Trợ lý AI EduTest. Em đang gặp khó khăn ở bài tập hay công thức nào cần thầy giải thích chi tiết không?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages, isSending])

  const handleInsertSymbol = (sym: string) => {
    setInputText((prev) => prev + sym)
  }

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return

    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: inputText.trim(),
      timestamp: nowTime
    }

    setMessages((prev) => [...prev, userMsg])
    const prompt = inputText.trim()
    setInputText('')
    setIsSending(true)

    try {
      const historyForApi = messages
        .filter((m) => m.id !== 'welcome-msg' && !m.content.includes('đang phản hồi chậm'))
        .slice(-8)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        }))

      const res = await studentApi.sendChatMessage({
        message: prompt,
        history: historyForApi,
        userName: user?.full_name || 'Học sinh',
        userRole: 'student'
      })

      const rawReply =
        res.data?.reply ||
        res.reply ||
        res.data?.message ||
        res.message ||
        'Thầy đã nhận được câu hỏi. Đối với dạng bài này, em hãy áp dụng đúng công thức và xét các điều kiện xác định nhé!'

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        content: rawReply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err: any) {
      console.log('AI Chat error:', err)
      const errorText =
        err.response?.data?.message ||
        err.message ||
        'Hệ thống AI đang phản hồi chậm, em vui lòng thử lại sau giây lát nhé!'

      const errMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        content: errorText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: safeTop }]}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <Bot size={20} color="#fff" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.botTitle}>Trợ Lý Trí Tuệ Nhân Tạo AI</Text>
                <Sparkles size={14} color={colors.coin} />
              </View>
              <Text style={styles.botSub}>Groq LPU & Gemini 2.0 · Hỗ trợ giải bài & ôn thi</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isAi = item.sender === 'ai'
            return (
              <View
                style={[
                  styles.msgRow,
                  isAi ? styles.msgRowAi : styles.msgRowUser
                ]}
              >
                {isAi ? (
                  <View style={styles.msgAvatarAi}>
                    <Bot size={14} color="#fff" />
                  </View>
                ) : null}

                <View
                  style={[
                    styles.bubble,
                    isAi ? styles.bubbleAi : styles.bubbleUser
                  ]}
                >
                  <MathLatexText
                    content={item.content}
                    style={[styles.msgText, !isAi && { color: '#fff' }]}
                  />
                  <Text style={[styles.msgTime, !isAi && { color: 'rgba(255,255,255,0.75)' }]}>
                    {item.timestamp}
                  </Text>
                </View>

                {!isAi ? (
                  <View style={styles.msgAvatarUser}>
                    <User size={14} color="#fff" />
                  </View>
                ) : null}
              </View>
            )
          }}
        />

        {isSending && (
          <View style={styles.typingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Trợ lý AI đang suy nghĩ câu trả lời...</Text>
          </View>
        )}

        {/* Quick Math Symbols Bar */}
        <View style={styles.quickBar}>
          <Text style={styles.quickBarLabel}>Chèn nhanh:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.symbolList}>
            {QUICK_MATH_SYMBOLS.map((sym, sIdx) => (
              <TouchableOpacity
                key={`sym_${sIdx}`}
                style={styles.symbolBtn}
                onPress={() => handleInsertSymbol(sym)}
                activeOpacity={0.7}
              >
                <Text style={styles.symbolText}>{sym}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Input Bar */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Hỏi AI về câu hỏi khó, công thức toán..."
            placeholderTextColor={colors.textSubtle}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: colors.panelSolid,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm
    },
    botAvatar: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center'
    },
    botTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700'
    },
    botSub: {
      color: colors.textMuted,
      fontSize: 10
    },
    closeBtn: {
      padding: 6,
      borderRadius: RADIUS.md,
      backgroundColor: colors.subtleBg
    },
    msgRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACING.sm
    },
    msgRowAi: {
      justifyContent: 'flex-start'
    },
    msgRowUser: {
      justifyContent: 'flex-end'
    },
    msgAvatarAi: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4
    },
    msgAvatarUser: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4
    },
    bubble: {
      maxWidth: '78%',
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: 10
    },
    bubbleAi: {
      backgroundColor: colors.panelSolid,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomLeftRadius: 4
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4
    },
    msgText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text
    },
    msgTime: {
      fontSize: 9,
      color: colors.textSubtle,
      alignSelf: 'flex-end',
      marginTop: 4
    },
    typingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 6,
      backgroundColor: 'rgba(139, 124, 246, 0.08)'
    },
    typingText: {
      color: colors.primary,
      fontSize: 11
    },
    quickBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.panelStrong,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingVertical: 6,
      paddingHorizontal: SPACING.md
    },
    quickBarLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      marginRight: 6
    },
    symbolList: {
      gap: 6
    },
    symbolBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    symbolText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600'
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingTop: 8,
      backgroundColor: colors.panelSolid,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder
    },
    input: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: RADIUS.md,
      color: colors.text,
      fontSize: 13,
      paddingHorizontal: SPACING.md,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      maxHeight: 90
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center'
    }
  })

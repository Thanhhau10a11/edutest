import React, { useMemo } from 'react'
import { View, Text, Image, TextStyle, StyleProp, StyleSheet } from 'react-native'
import { RADIUS, ThemeColors } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'

interface MathLatexTextProps {
  content: string
  style?: StyleProp<TextStyle>
}

function cleanMath(text: string): string {
  if (!text) return ''
  return text
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\in/g, '∈')
}

const IMAGE_URL_REGEX = /(https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s"'<>]*)?)/gi
const MARKDOWN_IMG_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi

export const MathLatexText: React.FC<MathLatexTextProps> = ({ content, style }) => {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (!content) return null

  const trimmed = content.trim()

  const directImageMatch = trimmed.match(/^https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s"'<>]*)?$/i)
  if (directImageMatch) {
    return (
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: trimmed }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    )
  }

  const normalized = trimmed.replace(MARKDOWN_IMG_REGEX, '$2')
  const parts = normalized.split(IMAGE_URL_REGEX)

  if (parts.length <= 1) {
    return (
      <Text style={[styles.defaultText, style]}>
        {cleanMath(content)}
      </Text>
    )
  }

  return (
    <View style={styles.container}>
      {parts.map((part, index) => {
        if (!part) return null

        const isImg = IMAGE_URL_REGEX.test(part)
        IMAGE_URL_REGEX.lastIndex = 0

        if (isImg) {
          return (
            <View key={`img_${index}`} style={styles.imageWrap}>
              <Image
                source={{ uri: part.trim() }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )
        }

        const textClean = cleanMath(part).trim()
        if (!textClean) return null

        return (
          <Text key={`txt_${index}`} style={[styles.defaultText, style]}>
            {textClean}
          </Text>
        )
      })}
    </View>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: 6
    },
    defaultText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22
    },
    imageWrap: {
      marginVertical: 6,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      backgroundColor: colors.subtleBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4
    },
    image: {
      width: '100%',
      height: 180,
      borderRadius: RADIUS.sm
    }
  })

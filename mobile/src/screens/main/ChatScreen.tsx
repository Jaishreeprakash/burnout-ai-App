import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import { chatApi, ChatResponse } from '../../services/api';
import {
  detectIntent,
  buildResponse,
  buildContextFromDashboard,
} from '../../services/chatEngine';

const { width } = Dimensions.get('window');
const contentWidth = Math.min(width, 680);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  aiSource?: 'gpt' | 'smart-engine' | 'offline';
}

const STARTER_PROMPTS = [
  { text: "I'm feeling very stressed", icon: 'emoticon-sad-outline' },
  { text: 'How can I sleep better?', icon: 'moon-waning-crescent' },
  { text: "What's my burnout score?", icon: 'chart-line' },
  { text: 'Help me calm down now', icon: 'meditation' },
  { text: 'I work too many hours', icon: 'briefcase-outline' },
];

const ChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, scheme === 'light'), [colors, scheme]);
  const { user } = useAuth();
  const { data: dashboardData } = useDashboard();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'gpt' | 'smart-engine' | 'offline'>('smart-engine');

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi ${firstName}! 👋 I'm your BurnoutAI wellness coach. I can see your wellness data and I'm here to help. What's on your mind today?`,
      timestamp: new Date().toISOString(),
      aiSource: 'smart-engine',
    },
  ]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Build history for API context (last 8 messages)
    const history = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    let reply: string;
    let source: 'gpt' | 'smart-engine' | 'offline' = 'offline';

    try {
      // Try backend API first
      const resp: ChatResponse = await chatApi.sendMessage(trimmed, history);
      reply = resp.reply;
      source = resp.ai_source === 'gpt' ? 'gpt' : 'smart-engine';
    } catch {
      // Offline fallback — use client-side rule engine
      const ctx = buildContextFromDashboard(dashboardData, firstName);
      const intent = detectIntent(trimmed);
      reply = buildResponse(intent, ctx);
      source = 'offline';
    }

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      aiSource: source,
    };

    setMessages(prev => [...prev, assistantMsg]);
    setAiSource(source);
    setIsLoading(false);
  }, [isLoading, messages, dashboardData, firstName]);

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Fresh start! I'm here to help. What would you like to talk about, ${firstName}?`,
      timestamp: new Date().toISOString(),
      aiSource: 'smart-engine',
    }]);
  };

  const statusColor =
    aiSource === 'gpt' ? colors.success :
    aiSource === 'smart-engine' ? colors.primary :
    colors.warning;

  const statusLabel =
    aiSource === 'gpt' ? 'GPT-4o · Live AI' :
    aiSource === 'smart-engine' ? 'Smart Wellness Engine' :
    'Offline Mode · Local AI';

  // ── Animated Message Component ─────────────────────────────────────────
  const MessageBubble = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Avatar */}
        {!isUser && (
          <View style={styles.avatarBot}>
            <MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.primary} />
          </View>
        )}

        {/* Bubble */}
        {isUser ? (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark || '#5B4BC4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubbleUser]}
          >
            <Text style={styles.bubbleUserText}>{item.content}</Text>
            <Text style={styles.bubbleUserTime}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        ) : (
          <NeumorphicView variant="raised" borderRadius={20} padding={14} style={styles.bubbleAssistant}>
            <Text style={styles.bubbleAssistantText}>{item.content}</Text>
            <Text style={styles.bubbleAssistantTime}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </NeumorphicView>
        )}

        {isUser && (
          <View style={styles.avatarUser}>
            <MaterialCommunityIcons name="account" size={16} color={colors.textMuted} />
          </View>
        )}
      </Animated.View>
    );
  }, [colors, styles]);

  // ── Typing Indicator ───────────────────────────────────────────────────
  const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = (val: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        ).start();
      animate(dot1, 0);
      animate(dot2, 150);
      animate(dot3, 300);
    }, []);

    return (
      <View style={[styles.messageRow, styles.messageRowAssistant]}>
        <View style={styles.avatarBot}>
          <MaterialCommunityIcons name="robot-happy-outline" size={18} color={colors.primary} />
        </View>
        <NeumorphicView variant="raised" borderRadius={16} padding={12} style={styles.typingBubble}>
          <View style={styles.typingDots}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.typingDot,
                  { backgroundColor: colors.primary, transform: [{ translateY: dot }] },
                ]}
              />
            ))}
          </View>
        </NeumorphicView>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <NeumorphicView variant="raised" borderRadius={0} padding={16} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialCommunityIcons name="brain" size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Wellness Coach</Text>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.statusLabel}>{statusLabel}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.newChatButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="refresh" size={16} color={colors.textMuted} />
          <Text style={styles.newChatText}>New</Text>
        </TouchableOpacity>
      </NeumorphicView>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* ── Starter Prompts ─────────────────────────────────────────── */}
        {messages.length <= 1 && (
          <View style={styles.starterContainer}>
            {STARTER_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt.text}
                onPress={() => sendMessage(prompt.text)}
                activeOpacity={0.8}
              >
                <NeumorphicView variant="pressed" borderRadius={20} padding={10} style={styles.starterChip}>
                  <MaterialCommunityIcons name={prompt.icon as any} size={15} color={colors.primary} />
                  <Text style={styles.starterText}>{prompt.text}</Text>
                </NeumorphicView>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input Bar ───────────────────────────────────────────────── */}
        <View style={[styles.inputBarContainer, { paddingBottom: Math.max(insets.bottom, 8) + 90 }]}>
          <NeumorphicView variant="pressed" borderRadius={22} padding={4} style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask your wellness coach..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              activeOpacity={0.8}
              style={[
                styles.sendButton,
                { backgroundColor: input.trim() ? colors.primary : colors.surfacePressed },
              ]}
            >
              <MaterialCommunityIcons
                name="send"
                size={18}
                color={input.trim() ? '#FFFFFF' : colors.textDim}
              />
            </TouchableOpacity>
          </NeumorphicView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isLight: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      maxWidth: 680,
      alignSelf: 'center',
      width: '100%',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    statusLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    newChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    newChatText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    messageList: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      maxWidth: 680,
      alignSelf: 'center',
      width: '100%',
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: 14,
      alignItems: 'flex-end',
      gap: 8,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAssistant: {
      justifyContent: 'flex-start',
    },
    avatarBot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    avatarUser: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    bubbleUser: {
      maxWidth: Math.min(contentWidth * 0.75, 460),
      borderRadius: 20,
      borderBottomRightRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    bubbleUserText: {
      color: '#FFFFFF',
      fontSize: 14,
      lineHeight: 21,
    },
    bubbleUserTime: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 10,
      marginTop: 6,
      textAlign: 'right',
    },
    bubbleAssistant: {
      maxWidth: Math.min(contentWidth * 0.75, 460),
      borderBottomLeftRadius: 6,
    },
    bubbleAssistantText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    bubbleAssistantTime: {
      color: colors.textDim,
      fontSize: 10,
      marginTop: 6,
    },
    typingBubble: {},
    typingDots: {
      flexDirection: 'row',
      gap: 5,
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    typingDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    starterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      maxWidth: 680,
      alignSelf: 'center',
      width: '100%',
    },
    starterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    starterText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '600',
    },
    inputBarContainer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      maxWidth: 680,
      alignSelf: 'center',
      width: '100%',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      height: 42,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 14,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 2,
    },
  });

export default ChatScreen;

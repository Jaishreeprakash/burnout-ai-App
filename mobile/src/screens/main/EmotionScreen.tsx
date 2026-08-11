import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { emotionApi } from '../../services/api';
import { EmotionRecord } from '../../types';
import { predictEmotionStress } from '../../services/mlEngine';
import EmotionBar from '../../components/EmotionBar';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';



type TabType = 'camera' | 'manual' | 'history';

const EMOTION_EMOJIS = [
  { emoji: '😊', label: 'Happy', value: 'Happy' },
  { emoji: '😢', label: 'Sad', value: 'Sad' },
  { emoji: '😡', label: 'Angry', value: 'Angry' },
  { emoji: '😐', label: 'Neutral', value: 'Neutral' },
  { emoji: '😲', label: 'Surprised', value: 'Surprised' },
  { emoji: '😰', label: 'Anxious', value: 'Anxious' },
];

const EmotionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 680);
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EmotionRecord | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [stressLevel, setStressLevel] = useState(5);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<EmotionRecord[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'camera' && permission?.granted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [activeTab, permission?.granted]);

  const loadHistory = async () => {
    try {
      const data = await emotionApi.getEmotionRecords(7);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let imageBase64 = 'mock_base64_image';
      if (cameraRef.current && (cameraRef.current as any).takePictureAsync) {
        try {
          const photo = await (cameraRef.current as any).takePictureAsync({ base64: true, quality: 0.5 });
          if (photo?.base64) imageBase64 = photo.base64;
        } catch {
          // ignore frame capture error and fallback
        }
      }

      await new Promise((r) => setTimeout(r, 1200));
      const result = await emotionApi.analyzeCamera(imageBase64);
      const emotionsList = result.emotions && result.emotions.length
        ? result.emotions
        : [{ emotion: result.dominant_emotion || 'Neutral', confidence: result.confidence || 0.85 }];

      const mlResult = predictEmotionStress(
        result.dominant_emotion || 'Neutral',
        result.stress_level ? Math.round(result.stress_level / 10) : 4,
        result.valence ?? 0.5,
        result.arousal ?? 0.5,
        new Date().getHours()
      );

      const finalResult: EmotionRecord = {
        ...result,
        emotions: emotionsList,
        notes: `ML Stability Score: ${mlResult.stabilityIndex}/100 (${mlResult.stressCategory})`,
      };

      setAnalysisResult(finalResult);
      await loadHistory();

      Alert.alert(
        'Facial Emotion Analyzed!',
        `Detected: ${finalResult.dominant_emotion} (${Math.round(finalResult.confidence * 100)}% Confidence)\n\nML Stress State: ${mlResult.stressCategory}`
      );
    } catch (err) {
      Alert.alert('Analysis Failed', 'Could not analyze emotion. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedEmotion) {
      Alert.alert('Select Emotion', 'Please select an emotion first.');
      return;
    }
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await emotionApi.logEmotion({
        dominant_emotion: selectedEmotion,
        stress_level: stressLevel * 10,
        source: 'manual',
        notes,
        emotions: [{ emotion: selectedEmotion, confidence: 1.0 }],
        confidence: 1.0,
        valence: 0.5,
        arousal: 0.5,
      });
      Alert.alert('Logged!', 'Your emotion has been recorded.', [{ text: 'OK', onPress: loadHistory }]);
      setSelectedEmotion('');
      setNotes('');
      setStressLevel(5);
    } catch (err) {
      Alert.alert('Error', 'Failed to log emotion. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scanY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'camera', label: 'Camera', icon: 'camera-outline' },
    { key: 'manual', label: 'Manual', icon: 'pencil-outline' },
    { key: 'history', label: 'History', icon: 'history' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Emotion Tracker</Text>
          <Text style={styles.headerSubtitle}>Monitor and analyze your emotional wellness</Text>
        </View>

        {/* Tab Bar */}
        <NeumorphicView variant="pressed" borderRadius={18} padding={4} style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                Haptics.selectionAsync();
              }}
              accessibilityLabel={`${tab.label} tab`}
              accessibilityRole="tab"
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </NeumorphicView>

        {/* Tab Content */}
        {activeTab === 'camera' && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {!permission ? (
              <View style={styles.permissionPlaceholder}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !permission.granted ? (
              <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.permissionCard}>
                <MaterialCommunityIcons name="camera-off" size={60} color={colors.textMuted} />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                  We need camera access to analyze your facial expressions and detect emotional state.
                </Text>
                <NeumorphicButton
                  title="Grant Camera Access"
                  variant="primary"
                  size="large"
                  onPress={requestPermission}
                  style={{ width: '100%', marginTop: 8 }}
                />
                <TouchableOpacity
                  style={styles.manualFallback}
                  onPress={() => setActiveTab('manual')}
                >
                  <Text style={styles.manualFallbackText}>Or log manually →</Text>
                </TouchableOpacity>
              </NeumorphicView>
            ) : (
              <>
                {/* Camera View Container */}
                <NeumorphicView variant="raised" borderRadius={24} padding={0} style={styles.cameraContainer}>
                  <View style={styles.cameraWrapper}>
                    <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                    {/* Overlay sits outside CameraView to avoid children warning */}
                    <View style={[styles.faceOverlay, StyleSheet.absoluteFillObject]} pointerEvents="none">
                      <View style={styles.faceFrame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                        <Animated.View
                          style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}
                        />
                      </View>
                    </View>
                    <View style={[styles.cameraStatus, { position: 'absolute', bottom: 0, left: 0, right: 0 }]} pointerEvents="none">
                      <Animated.View
                        style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]}
                      />
                      <Text style={styles.statusText}>
                        {isAnalyzing ? 'Analyzing facial metrics...' : 'Position face inside the frame'}
                      </Text>
                    </View>
                  </View>
                </NeumorphicView>

                {/* Analyze Button */}
                <NeumorphicButton
                  title={isAnalyzing ? 'Analyzing...' : 'Scan & Analyze Emotion'}
                  icon="face-recognition"
                  variant="primary"
                  size="large"
                  disabled={isAnalyzing}
                  onPress={handleAnalyze}
                  style={{ marginTop: 14 }}
                />

                {/* Results */}
                {analysisResult && (
                  <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.resultsCard}>
                    <Text style={styles.resultsTitle}>Detected Emotion</Text>
                    <View style={styles.dominantEmotion}>
                      <Text style={styles.dominantEmoji}>
                        {EMOTION_EMOJIS.find((e) => e.value === analysisResult.dominant_emotion)?.emoji || '😐'}
                      </Text>
                      <View>
                        <Text style={styles.dominantLabel}>{analysisResult.dominant_emotion}</Text>
                        <Text style={styles.dominantConfidence}>
                          {Math.round(analysisResult.confidence * 100)}% confidence
                        </Text>
                      </View>
                    </View>
                    <View style={styles.emotionBars}>
                      {analysisResult.emotions.slice(0, 4).map((e, i) => (
                        <EmotionBar key={i} emotion={e.emotion} confidence={e.confidence} isTop={i === 0} />
                      ))}
                    </View>
                  </NeumorphicView>
                )}
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'manual' && (
          <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.manualTitle}>How are you feeling right now?</Text>

            {/* Emoji Grid */}
            <View style={styles.emojiGrid}>
              {EMOTION_EMOJIS.map((e) => {
                const isActive = selectedEmotion === e.value;
                return (
                  <TouchableOpacity
                    key={e.value}
                    onPress={() => {
                      setSelectedEmotion(e.value);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                  >
                    <NeumorphicView
                      variant={isActive ? 'pressed' : 'raised'}
                      active={isActive}
                      borderRadius={20}
                      padding={12}
                      style={[styles.emojiButton, { width: (contentWidth - 64) / 3 }]}
                    >
                      <Text style={styles.emojiButtonEmoji}>{e.emoji}</Text>
                      <Text style={[styles.emojiButtonLabel, isActive && styles.emojiButtonLabelActive]}>
                        {e.label}
                      </Text>
                    </NeumorphicView>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stress Level */}
            <NeumorphicView variant="raised" borderRadius={24} padding={18} style={styles.section}>
              <Text style={styles.sectionTitle}>Stress Level: {stressLevel}/10</Text>
              <View style={styles.stressSlider}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                  const stressColors = ['#00B894', '#00B894', '#00B894', '#FFAB00', '#FFAB00', '#FFAB00', '#FF7675', '#FF7675', '#FF5252', '#FF5252'];
                  const isSelected = level <= stressLevel;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.stressDot,
                        { backgroundColor: isSelected ? stressColors[level - 1] : colors.surfacePressed },
                      ]}
                      onPress={() => { setStressLevel(level); Haptics.selectionAsync(); }}
                    />
                  );
                })}
              </View>
              <View style={styles.stressLabels}>
                <Text style={styles.stressLabel}>Low / Calm</Text>
                <Text style={styles.stressLabel}>High Stress</Text>
              </View>
            </NeumorphicView>

            {/* Notes */}
            <NeumorphicView variant="pressed" borderRadius={20} padding={14} style={styles.section}>
              <Text style={styles.sectionTitle}>Reflection & Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="What's on your mind? Describe your day..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </NeumorphicView>

            <NeumorphicButton
              title={isSubmitting ? 'Saving...' : 'Save Emotion Log'}
              icon="heart-pulse"
              variant="primary"
              size="large"
              disabled={isSubmitting}
              onPress={handleManualSubmit}
              style={{ marginTop: 14 }}
            />
          </ScrollView>
        )}

        {activeTab === 'history' && (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <NeumorphicView variant="raised" borderRadius={24} padding={40} style={styles.emptyState}>
                <MaterialCommunityIcons name="emoticon-outline" size={60} color={colors.textMuted} />
                <Text style={styles.emptyText}>No emotion records yet</Text>
                <Text style={styles.emptySubtext}>Start by logging your current emotion</Text>
              </NeumorphicView>
            }
            renderItem={({ item }) => {
              const emoji = EMOTION_EMOJIS.find((e) => e.value === item.dominant_emotion)?.emoji || '😐';
              return (
                <NeumorphicView variant="raised" borderRadius={20} padding={14} style={styles.historyCard}>
                  <View style={styles.historyEmoji}>
                    <Text style={styles.historyEmojiText}>{emoji}</Text>
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyEmotion}>{item.dominant_emotion}</Text>
                    <Text style={styles.historyMeta}>
                      {format(new Date(item.timestamp), 'MMM d, h:mm a')} • {item.source}
                    </Text>
                    <Text style={styles.historyConfidence}>
                      {Math.round(item.confidence * 100)}% confidence
                    </Text>
                  </View>
                  <View style={styles.historyStress}>
                    <Text style={styles.historyStressLabel}>Stress</Text>
                    <Text style={styles.historyStressValue}>{item.stress_level}%</Text>
                  </View>
                </NeumorphicView>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    headerContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, maxWidth: 680, alignSelf: 'center', width: '100%' },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, marginBottom: 12, maxWidth: 680, alignSelf: 'center', width: '100%' },
    tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
    tabActive: { backgroundColor: colors.surface, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    tabLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    tabLabelActive: { color: colors.primary, fontWeight: '700' },
    tabContent: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 680, alignSelf: 'center', width: '100%' },
    permissionPlaceholder: { height: 300, justifyContent: 'center', alignItems: 'center' },
    permissionCard: { alignItems: 'center', gap: 14, marginVertical: 20 },
    permissionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    permissionText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
    manualFallback: { paddingVertical: 8, marginTop: 4 },
    manualFallbackText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    cameraContainer: { overflow: 'hidden', height: 290 },
    cameraWrapper: { flex: 1, position: 'relative' as const },
    camera: { flex: 1 },
    faceOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    faceFrame: { width: 170, height: 210, position: 'relative' },
    corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.primary, borderWidth: 3 },
    topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
    topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
    bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
    bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
    scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary },
    cameraStatus: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
    statusText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    resultsCard: { marginTop: 16 },
    resultsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 },
    dominantEmotion: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, backgroundColor: colors.primary + '1A', padding: 14, borderRadius: 16 },
    dominantEmoji: { fontSize: 38 },
    dominantLabel: { fontSize: 20, fontWeight: '800', color: colors.text },
    dominantConfidence: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    emotionBars: { gap: 4 },
    manualTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    emojiButton: { aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
    emojiButtonEmoji: { fontSize: 32, marginBottom: 4 },
    emojiButtonLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    emojiButtonLabelActive: { color: colors.primary, fontWeight: '700' },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
    stressSlider: { flexDirection: 'row', gap: 6 },
    stressDot: { flex: 1, height: 34, borderRadius: 8 },
    stressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    stressLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    notesInput: { color: colors.text, minHeight: 90, padding: 4, fontSize: 14 },
    emptyState: { alignItems: 'center', padding: 40, gap: 12, marginVertical: 20 },
    emptyText: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptySubtext: { fontSize: 14, color: colors.textMuted },
    historyCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    historyEmoji: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.surfacePressed, justifyContent: 'center', alignItems: 'center' },
    historyEmojiText: { fontSize: 26 },
    historyContent: { flex: 1 },
    historyEmotion: { fontSize: 16, fontWeight: '700', color: colors.text },
    historyMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    historyConfidence: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '600' },
    historyStress: { alignItems: 'center' },
    historyStressLabel: { fontSize: 10, color: colors.textMuted },
    historyStressValue: { fontSize: 16, fontWeight: '800', color: colors.warning },
  });

export default EmotionScreen;

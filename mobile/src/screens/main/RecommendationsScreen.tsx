import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recommendationsApi } from '../../services/api';
import { Recommendation } from '../../types';
import RecommendationCard from '../../components/RecommendationCard';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

type FilterCategory = 'all' | 'sleep' | 'phone' | 'activity' | 'mental';

const FILTERS: { key: FilterCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'view-grid-outline' },
  { key: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
  { key: 'phone', label: 'Phone', icon: 'cellphone' },
  { key: 'activity', label: 'Activity', icon: 'run' },
  { key: 'mental', label: 'Mental', icon: 'brain' },
];

const RecommendationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await recommendationsApi.getRecommendations();
      setRecommendations(data);
    } catch {
      console.error('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = (id: number) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const filtered = recommendations.filter((r) => {
    if (dismissed.has(r.id)) return false;
    if (activeFilter === 'all') return true;
    return r.category === activeFilter;
  });

  const highPriority = filtered.filter((r) => r.priority === 'high');
  const others = filtered.filter((r) => r.priority !== 'high');

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(item.key)}
              activeOpacity={0.8}
              accessibilityLabel={`Filter: ${item.label}`}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={14}
                color={activeFilter === item.key ? '#fff' : colors.textMuted}
              />
              <Text style={[styles.filterLabel, activeFilter === item.key && styles.filterLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading AI recommendations...</Text>
        </View>
      ) : (
        <FlatList
          data={[...highPriority, ...others]}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filtered.length > 0 ? (
              <View style={styles.summaryBanner}>
                <MaterialCommunityIcons name="brain" size={18} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {filtered.length} recommendations • {highPriority.length} high priority
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.success} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtext}>
                No recommendations for this category.
                {dismissed.size > 0 && '\nYou dismissed some recommendations.'}
              </Text>
              {dismissed.size > 0 && (
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => setDismissed(new Set())}
                  accessibilityLabel={`Restore ${dismissed.size} dismissed recommendations`}
                  accessibilityRole="button"
                >
                  <Text style={styles.restoreText}>Restore dismissed ({dismissed.size})</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <RecommendationCard recommendation={item} />
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => dismiss(item.id)}
                accessibilityLabel="Dismiss this recommendation"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterList: { paddingHorizontal: 20, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filterLabelActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  listContent: { padding: 20 },
  summaryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '11', padding: 12, borderRadius: 12, marginBottom: 16 },
  summaryText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  cardWrapper: { marginBottom: 4 },
  dismissButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8, opacity: 0.6 },
  dismissText: { fontSize: 12, color: colors.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  restoreButton: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  restoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});

export default RecommendationsScreen;

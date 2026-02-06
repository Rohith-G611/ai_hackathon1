import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getProblems } from '@/lib/supabase';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react-native';

interface Problem {
  id: string;
  title: string;
  description: string;
  priority_score: number;
  complaint_count: number;
  trend: string;
  keywords: string[];
}

export default function ProblemsScreen() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadProblems = async () => {
    try {
      const response = await getProblems();
      if (response.success) {
        setProblems(response.problems);
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProblems();
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return '#dc2626';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#3b82f6';
    return '#6b7280';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') {
      return <TrendingUp size={18} color="#dc2626" />;
    } else if (trend === 'falling') {
      return <TrendingDown size={18} color="#16a34a" />;
    }
    return <Minus size={18} color="#6b7280" />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading problems...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        <Text style={styles.title}>Discovered Problems</Text>
        <Text style={styles.subtitle}>
          AI-identified issues ranked by priority and urgency
        </Text>
      </View>

      {problems.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No problems discovered yet</Text>
          <Text style={styles.emptySubtext}>
            Submit complaints and run AI analysis to discover local problems
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.stats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{problems.length}</Text>
              <Text style={styles.statLabel}>Problems</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {problems.reduce((sum, p) => sum + p.complaint_count, 0)}
              </Text>
              <Text style={styles.statLabel}>Complaints</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {
                  problems.filter((p) => p.priority_score >= 60).length
                }
              </Text>
              <Text style={styles.statLabel}>High Priority</Text>
            </View>
          </View>

          <View style={styles.problemsList}>
            {problems.map((problem) => (
              <TouchableOpacity
                key={problem.id}
                style={styles.problemCard}
                onPress={() =>
                  router.push(`/problem/${problem.id}` as any)
                }>
                <View style={styles.problemHeader}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor: getPriorityColor(
                          problem.priority_score
                        ),
                      },
                    ]}>
                    <Text style={styles.priorityText}>
                      {getPriorityLabel(problem.priority_score)}
                    </Text>
                  </View>
                  <View style={styles.trendBadge}>
                    {getTrendIcon(problem.trend)}
                  </View>
                </View>

                <Text style={styles.problemTitle}>{problem.title}</Text>

                <View style={styles.problemMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Priority Score:</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color: getPriorityColor(problem.priority_score),
                        },
                      ]}>
                      {problem.priority_score}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Complaints:</Text>
                    <Text style={styles.metaValue}>
                      {problem.complaint_count}
                    </Text>
                  </View>
                </View>

                {problem.keywords && problem.keywords.length > 0 && (
                  <View style={styles.keywords}>
                    {problem.keywords.slice(0, 4).map((keyword, idx) => (
                      <View key={idx} style={styles.keywordTag}>
                        <Text style={styles.keywordText}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.problemFooter}>
                  <Text style={styles.viewDetails}>View Details</Text>
                  <ChevronRight size={18} color="#2563eb" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  problemsList: {
    gap: 16,
  },
  problemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  problemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  trendBadge: {
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 8,
  },
  problemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  problemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  keywordTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  problemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  viewDetails: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginRight: 4,
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProblemDetails } from '@/lib/supabase';
import {
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  FileText,
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

interface Complaint {
  id: string;
  text: string;
  location: string;
  created_at: string;
}

export default function ProblemDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProblemDetails();
  }, [id]);

  const loadProblemDetails = async () => {
    try {
      const response = await getProblemDetails(id as string);
      if (response.success) {
        setProblem(response.problem);
        setComplaints(response.complaints);
      }
    } catch (err) {
      console.error('Failed to load problem details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return '#dc2626';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#3b82f6';
    return '#6b7280';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return 'CRITICAL PRIORITY';
    if (score >= 60) return 'HIGH PRIORITY';
    if (score >= 40) return 'MEDIUM PRIORITY';
    return 'LOW PRIORITY';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') {
      return <TrendingUp size={24} color="#dc2626" />;
    } else if (trend === 'falling') {
      return <TrendingDown size={24} color="#16a34a" />;
    }
    return <Minus size={24} color="#6b7280" />;
  };

  const getTrendText = (trend: string) => {
    if (trend === 'rising') return 'Escalating';
    if (trend === 'falling') return 'Improving';
    return 'Stable';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading problem details...</Text>
      </View>
    );
  }

  if (!problem) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color="#dc2626" />
        <Text style={styles.errorText}>Problem not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}>
        <ArrowLeft size={24} color="#2563eb" />
        <Text style={styles.backText}>Back to Problems</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(problem.priority_score) },
          ]}>
          <Text style={styles.priorityText}>
            {getPriorityLabel(problem.priority_score)}
          </Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{problem.priority_score}</Text>
          <Text style={styles.scoreLabel}>Priority Score</Text>
        </View>
      </View>

      <Text style={styles.title}>{problem.title}</Text>

      <View style={styles.trendSection}>
        <View style={styles.trendBadge}>{getTrendIcon(problem.trend)}</View>
        <View style={styles.trendInfo}>
          <Text style={styles.trendLabel}>Trend Status</Text>
          <Text style={styles.trendValue}>{getTrendText(problem.trend)}</Text>
        </View>
      </View>

      <View style={styles.explainSection}>
        <Text style={styles.sectionTitle}>AI Explanation</Text>
        <View style={styles.explainBox}>
          <Text style={styles.explainText}>
            {problem.description || 'No explanation available'}
          </Text>
        </View>
      </View>

      {problem.keywords && problem.keywords.length > 0 && (
        <View style={styles.keywordsSection}>
          <Text style={styles.sectionTitle}>Key Terms Detected</Text>
          <View style={styles.keywords}>
            {problem.keywords.map((keyword, idx) => (
              <View key={idx} style={styles.keywordTag}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <FileText size={32} color="#2563eb" />
          <Text style={styles.statValue}>{problem.complaint_count}</Text>
          <Text style={styles.statLabel}>Total Complaints</Text>
        </View>
        <View style={styles.statCard}>
          <MapPin size={32} color="#2563eb" />
          <Text style={styles.statValue}>
            {
              new Set(
                complaints.map((c) => c.location).filter((l) => l)
              ).size
            }
          </Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
      </View>

      <View style={styles.complaintsSection}>
        <Text style={styles.sectionTitle}>Sample Complaints</Text>
        <Text style={styles.sectionSubtitle}>
          Representative citizen reports that contributed to this problem
        </Text>

        {complaints.slice(0, 5).map((complaint, idx) => (
          <View key={complaint.id} style={styles.complaintCard}>
            <View style={styles.complaintHeader}>
              <View style={styles.complaintNumber}>
                <Text style={styles.complaintNumberText}>{idx + 1}</Text>
              </View>
              {complaint.location ? (
                <View style={styles.locationBadge}>
                  <MapPin size={14} color="#6b7280" />
                  <Text style={styles.locationText}>{complaint.location}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.complaintText}>{complaint.text}</Text>
            <Text style={styles.complaintDate}>
              {new Date(complaint.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}

        {complaints.length > 5 && (
          <Text style={styles.moreComplaints}>
            +{complaints.length - 5} more complaints not shown
          </Text>
        )}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    lineHeight: 36,
  },
  trendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trendBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trendInfo: {
    flex: 1,
  },
  trendLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  explainSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  explainBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
  },
  explainText: {
    fontSize: 15,
    color: '#78350f',
    lineHeight: 24,
  },
  keywordsSection: {
    marginBottom: 20,
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  keywordText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
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
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  complaintsSection: {
    marginBottom: 20,
  },
  complaintCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  complaintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  complaintNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  complaintNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  complaintText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  complaintDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  moreComplaints: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { analyzeAllComplaints, getAgentLogs } from '@/lib/supabase';
import { Brain, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';

interface AgentLog {
  id: string;
  agent_name: string;
  status: string;
  execution_time_ms: number;
  created_at: string;
  output_data: any;
}

export default function AnalyzeScreen() {
  const [analyzing, setAnalyzing] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const loadRecentLogs = async () => {
    try {
      const response = await getAgentLogs();
      if (response.success) {
        setLogs(response.logs.slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    loadRecentLogs();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await analyzeAllComplaints();

      if (response.success) {
        setResult(response);
        await loadRecentLogs();
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getAgentIcon = (status: string) => {
    if (status === 'completed') {
      return <CheckCircle size={20} color="#16a34a" />;
    } else if (status === 'running') {
      return <Clock size={20} color="#f59e0b" />;
    } else {
      return <AlertCircle size={20} color="#dc2626" />;
    }
  };

  const formatAgentName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Agent';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Brain size={48} color="#2563eb" />
        <Text style={styles.title}>AI Agent Analysis</Text>
        <Text style={styles.subtitle}>
          Run autonomous agents to discover and prioritize local problems
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
        onPress={handleAnalyze}
        disabled={analyzing}>
        {analyzing ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#ffffff" size="small" />
            <Text style={styles.buttonText}>Analyzing...</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <Brain size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Run AI Analysis</Text>
          </View>
        )}
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Analysis Complete!</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Complaints Analyzed:</Text>
            <Text style={styles.resultValue}>{result.total_complaints}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Problems Discovered:</Text>
            <Text style={styles.resultValue}>
              {result.problems_discovered}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Agents Executed:</Text>
            <Text style={styles.resultValue}>
              {result.agents_executed?.length || 0}
            </Text>
          </View>
          <Text style={styles.resultHint}>
            View discovered problems in the Problems tab
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agent Execution Logs</Text>
        <Text style={styles.sectionSubtitle}>
          Real-time agent activity and performance
        </Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Brain size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No agent logs yet</Text>
          <Text style={styles.emptySubtext}>
            Submit complaints and run analysis to see agent activity
          </Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logIcon}>{getAgentIcon(log.status)}</View>
                <View style={styles.logInfo}>
                  <Text style={styles.logName}>
                    {formatAgentName(log.agent_name)}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(log.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.logBadge}>
                  <Text style={styles.logBadgeText}>{log.status}</Text>
                </View>
              </View>
              {log.execution_time_ms > 0 && (
                <Text style={styles.logExecution}>
                  Execution: {log.execution_time_ms}ms
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.agentsInfo}>
        <Text style={styles.agentsInfoTitle}>
          5 Autonomous AI Agents
        </Text>
        <View style={styles.agentItem}>
          <Text style={styles.agentNumber}>1</Text>
          <Text style={styles.agentName}>Ingestion Agent</Text>
          <Text style={styles.agentDesc}>Validates and cleans data</Text>
        </View>
        <View style={styles.agentItem}>
          <Text style={styles.agentNumber}>2</Text>
          <Text style={styles.agentName}>Understanding Agent</Text>
          <Text style={styles.agentDesc}>NLP semantic analysis</Text>
        </View>
        <View style={styles.agentItem}>
          <Text style={styles.agentNumber}>3</Text>
          <Text style={styles.agentName}>Discovery Agent</Text>
          <Text style={styles.agentDesc}>Clusters similar issues</Text>
        </View>
        <View style={styles.agentItem}>
          <Text style={styles.agentNumber}>4</Text>
          <Text style={styles.agentName}>Priority Agent</Text>
          <Text style={styles.agentDesc}>Calculates urgency scores</Text>
        </View>
        <View style={styles.agentItem}>
          <Text style={styles.agentNumber}>5</Text>
          <Text style={styles.agentName}>Explainability Agent</Text>
          <Text style={styles.agentDesc}>Explains AI decisions</Text>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  analyzeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  resultBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    color: '#166534',
    fontWeight: '700',
  },
  resultHint: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 8,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  logsList: {
    marginBottom: 20,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logBadgeText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  logExecution: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  agentsInfo: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  agentsInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 16,
  },
  agentItem: {
    marginBottom: 12,
  },
  agentNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 2,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78350f',
    marginBottom: 2,
  },
  agentDesc: {
    fontSize: 13,
    color: '#92400e',
  },
});

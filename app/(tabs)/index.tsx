import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { submitComplaint } from '@/lib/supabase';
import { CheckCircle, AlertCircle } from 'lucide-react-native';

export default function SubmitComplaintScreen() {
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please enter a complaint description');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await submitComplaint(text, location);

      if (result.success) {
        setSuccess(true);
        setText('');
        setLocation('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to submit complaint');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Report a Local Issue</Text>
        <Text style={styles.subtitle}>
          Help us identify and solve problems in your community
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Complaint Description *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue you're experiencing..."
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Minimum 10 characters</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Ward 12, Main Street"
            placeholderTextColor="#9ca3af"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <CheckCircle size={20} color="#16a34a" />
            <Text style={styles.successText}>
              Complaint submitted successfully!
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Submit Complaint</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>1.</Text>
          <Text style={styles.infoText}>
            Your complaint is validated by our Ingestion Agent
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>2.</Text>
          <Text style={styles.infoText}>
            Understanding Agent analyzes the complaint using NLP
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>3.</Text>
          <Text style={styles.infoText}>
            Visit the AI Analysis tab to discover problems
          </Text>
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
    marginBottom: 24,
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
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 120,
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 8,
    width: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    flex: 1,
    lineHeight: 20,
  },
});

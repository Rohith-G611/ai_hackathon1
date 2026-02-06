import { Tabs } from 'expo-router';
import { FileText, Brain, AlertCircle } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Submit Complaint',
          tabBarIcon: ({ size, color }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'AI Analysis',
          tabBarIcon: ({ size, color }) => <Brain size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="problems"
        options={{
          title: 'Problems',
          tabBarIcon: ({ size, color }) => (
            <AlertCircle size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

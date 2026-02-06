import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function submitComplaint(text: string, location: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'submit_complaint',
      data: { text, location },
    }),
  });

  return await response.json();
}

export async function analyzeAllComplaints() {
  const response = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'analyze_all',
      data: {},
    }),
  });

  return await response.json();
}

export async function getProblems() {
  const response = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'get_problems',
      data: {},
    }),
  });

  return await response.json();
}

export async function getProblemDetails(problemId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'get_problem_details',
      data: { problem_id: problemId },
    }),
  });

  return await response.json();
}

export async function getAgentLogs() {
  const response = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'get_agent_logs',
      data: {},
    }),
  });

  return await response.json();
}

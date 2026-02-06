import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PriorityFactors {
  complaint_count: number;
  severity_score: number;
  recency_score: number;
  location_density: number;
}

function calculateSeverityScore(complaints: any[]): number {
  const urgentKeywords = [
    'urgent',
    'emergency',
    'critical',
    'immediate',
    'severe',
    'dangerous',
    'unsafe',
    'health',
    'hospital',
    'children',
    'death',
    'injury',
  ];

  const importantKeywords = [
    'important',
    'serious',
    'concern',
    'problem',
    'broken',
    'damage',
    'leak',
    'overflow',
    'stuck',
  ];

  let severityScore = 0;

  complaints.forEach((complaint) => {
    const text = complaint.cleaned_text.toLowerCase();

    urgentKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        severityScore += 3;
      }
    });

    importantKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        severityScore += 1;
      }
    });
  });

  return Math.min(severityScore / complaints.length, 10);
}

function calculateRecencyScore(complaints: any[]): number {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  let recencyScore = 0;

  complaints.forEach((complaint) => {
    const createdAt = new Date(complaint.created_at).getTime();
    const age = now - createdAt;

    if (age < oneDay) {
      recencyScore += 3;
    } else if (age < oneWeek) {
      recencyScore += 1.5;
    } else {
      recencyScore += 0.5;
    }
  });

  return recencyScore / complaints.length;
}

function calculateLocationDensity(complaints: any[]): number {
  const locationMap: { [key: string]: number } = {};

  complaints.forEach((complaint) => {
    if (complaint.location) {
      locationMap[complaint.location] = (locationMap[complaint.location] || 0) + 1;
    }
  });

  const maxDensity = Math.max(...Object.values(locationMap), 1);
  return Math.log10(maxDensity + 1) * 3;
}

function calculatePriorityScore(factors: PriorityFactors): number {
  const weights = {
    complaint_count: 0.4,
    severity_score: 0.35,
    recency_score: 0.15,
    location_density: 0.1,
  };

  const normalizedCount = Math.min(factors.complaint_count / 10, 1) * 100;

  const score =
    normalizedCount * weights.complaint_count +
    factors.severity_score * 10 * weights.severity_score +
    factors.recency_score * 10 * weights.recency_score +
    factors.location_density * 10 * weights.location_density;

  return Math.round(Math.min(score, 100));
}

function determineTrend(complaints: any[]): string {
  if (complaints.length < 2) return 'stable';

  const sortedComplaints = complaints.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const halfPoint = Math.floor(sortedComplaints.length / 2);
  const firstHalf = sortedComplaints.slice(0, halfPoint);
  const secondHalf = sortedComplaints.slice(halfPoint);

  const avgTimeFirst =
    firstHalf.reduce((sum, c) => sum + new Date(c.created_at).getTime(), 0) /
    firstHalf.length;
  const avgTimeSecond =
    secondHalf.reduce((sum, c) => sum + new Date(c.created_at).getTime(), 0) /
    secondHalf.length;

  const timeDiff = avgTimeSecond - avgTimeFirst;
  const expectedDiff = (Date.now() - new Date(sortedComplaints[0].created_at).getTime()) / 2;

  const growthRate = secondHalf.length / firstHalf.length;

  if (growthRate > 1.3 && timeDiff < expectedDiff * 0.7) {
    return 'rising';
  } else if (growthRate < 0.7) {
    return 'falling';
  }

  return 'stable';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const startTime = Date.now();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logId = crypto.randomUUID();
    await supabase.from('agent_logs').insert({
      id: logId,
      agent_name: 'priority',
      status: 'running',
      input_data: { action: 'calculate_priorities' },
    });

    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('*');

    if (problemsError) throw problemsError;

    if (!problems || problems.length === 0) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'completed',
          output_data: { message: 'No problems to prioritize' },
          execution_time_ms: Date.now() - startTime,
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({ message: 'No problems to prioritize', updated: [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const updatedProblems = [];

    for (const problem of problems) {
      const { data: complaintLinks } = await supabase
        .from('complaint_problems')
        .select('complaint_id')
        .eq('problem_id', problem.id);

      if (!complaintLinks || complaintLinks.length === 0) continue;

      const complaintIds = complaintLinks.map((link) => link.complaint_id);

      const { data: complaints } = await supabase
        .from('complaints')
        .select('*')
        .in('id', complaintIds);

      if (!complaints || complaints.length === 0) continue;

      const factors: PriorityFactors = {
        complaint_count: complaints.length,
        severity_score: calculateSeverityScore(complaints),
        recency_score: calculateRecencyScore(complaints),
        location_density: calculateLocationDensity(complaints),
      };

      const priorityScore = calculatePriorityScore(factors);
      const trend = determineTrend(complaints);

      await supabase
        .from('problems')
        .update({
          priority_score: priorityScore,
          trend,
          complaint_count: complaints.length,
        })
        .eq('id', problem.id);

      updatedProblems.push({
        id: problem.id,
        title: problem.title,
        priority_score: priorityScore,
        trend,
        factors,
      });
    }

    const executionTime = Date.now() - startTime;

    await supabase
      .from('agent_logs')
      .update({
        status: 'completed',
        output_data: {
          problems_updated: updatedProblems.length,
          highest_priority: updatedProblems.reduce((max, p) =>
            p.priority_score > max ? p.priority_score : max, 0
          ),
        },
        execution_time_ms: executionTime,
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedProblems,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Priority Agent Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

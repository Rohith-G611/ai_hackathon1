import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExplainabilityOutput {
  problem_id: string;
  reason: string;
  keywords: string[];
  sample_complaints: string[];
  priority_explanation: string;
}

function extractKeywords(complaints: any[]): string[] {
  const wordFreq: { [key: string]: number } = {};
  const importantWords = new Set([
    'water',
    'road',
    'garbage',
    'electric',
    'drain',
    'sewage',
    'urgent',
    'emergency',
    'broken',
    'damage',
    'leak',
    'overflow',
    'shortage',
    'supply',
    'power',
    'light',
    'street',
    'pothole',
    'safety',
    'health',
    'dangerous',
    'critical',
    'immediate',
    'hospital',
    'children',
    'school',
    'waste',
    'smell',
    'noise',
    'pollution',
  ]);

  complaints.forEach((complaint) => {
    const words = complaint.cleaned_text.split(' ');
    words.forEach((word) => {
      if (word.length > 3 && importantWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function selectRepresentativeComplaints(complaints: any[]): string[] {
  const sorted = [...complaints].sort((a, b) => {
    const aLength = a.cleaned_text.length;
    const bLength = b.cleaned_text.length;
    return bLength - aLength;
  });

  const selected = [];
  const maxSamples = Math.min(3, complaints.length);

  for (let i = 0; i < maxSamples; i++) {
    if (sorted[i]) {
      selected.push(sorted[i].text || sorted[i].cleaned_text);
    }
  }

  return selected;
}

function generateExplanation(
  problem: any,
  complaints: any[],
  keywords: string[]
): string {
  const reasons = [];

  if (problem.complaint_count >= 5) {
    reasons.push(
      `High volume of reports (${problem.complaint_count} complaints)`
    );
  } else if (problem.complaint_count >= 3) {
    reasons.push(`Multiple reports received (${problem.complaint_count} complaints)`);
  } else {
    reasons.push(`${problem.complaint_count} report(s) received`);
  }

  const urgentKeywords = [
    'urgent',
    'emergency',
    'critical',
    'dangerous',
    'unsafe',
    'health',
    'hospital',
  ];
  const hasUrgentKeywords = keywords.some((kw) => urgentKeywords.includes(kw));

  if (hasUrgentKeywords) {
    reasons.push('Contains safety or health-related concerns');
  }

  const locations = complaints
    .map((c) => c.location)
    .filter((l) => l && l.trim() !== '');
  const uniqueLocations = new Set(locations);

  if (uniqueLocations.size === 1 && locations.length >= 3) {
    reasons.push(`Concentrated in specific area (${[...uniqueLocations][0]})`);
  } else if (uniqueLocations.size > 3) {
    reasons.push(`Widespread issue affecting ${uniqueLocations.size} locations`);
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const recentComplaints = complaints.filter((c) => {
    const age = now - new Date(c.created_at).getTime();
    return age < oneDay;
  });

  if (recentComplaints.length >= 2) {
    reasons.push(`${recentComplaints.length} recent reports in the last 24 hours`);
  }

  if (problem.trend === 'rising') {
    reasons.push('Increasing trend detected');
  }

  return reasons.join('; ');
}

function generatePriorityExplanation(priorityScore: number, trend: string): string {
  let explanation = '';

  if (priorityScore >= 80) {
    explanation = 'CRITICAL PRIORITY: Requires immediate attention';
  } else if (priorityScore >= 60) {
    explanation = 'HIGH PRIORITY: Should be addressed soon';
  } else if (priorityScore >= 40) {
    explanation = 'MEDIUM PRIORITY: Needs attention within reasonable timeframe';
  } else {
    explanation = 'LOW PRIORITY: Can be scheduled for later';
  }

  if (trend === 'rising') {
    explanation += '. Problem is escalating and may worsen if not addressed.';
  } else if (trend === 'falling') {
    explanation += '. Problem appears to be improving or resolving.';
  } else {
    explanation += '. Problem is stable at current levels.';
  }

  return explanation;
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
      agent_name: 'explainability',
      status: 'running',
      input_data: { action: 'generate_explanations' },
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
          output_data: { message: 'No problems to explain' },
          execution_time_ms: Date.now() - startTime,
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({ message: 'No problems to explain', explanations: [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const explanations: ExplainabilityOutput[] = [];

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

      const keywords = extractKeywords(complaints);
      const sampleComplaints = selectRepresentativeComplaints(complaints);
      const reason = generateExplanation(problem, complaints, keywords);
      const priorityExplanation = generatePriorityExplanation(
        problem.priority_score,
        problem.trend
      );

      await supabase
        .from('problems')
        .update({
          keywords,
          description: priorityExplanation,
        })
        .eq('id', problem.id);

      explanations.push({
        problem_id: problem.id,
        reason,
        keywords,
        sample_complaints: sampleComplaints,
        priority_explanation: priorityExplanation,
      });
    }

    const executionTime = Date.now() - startTime;

    await supabase
      .from('agent_logs')
      .update({
        status: 'completed',
        output_data: {
          explanations_generated: explanations.length,
        },
        execution_time_ms: executionTime,
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        explanations,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Explainability Agent Error:', error);
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

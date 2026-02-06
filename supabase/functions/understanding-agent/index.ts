import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UnderstandingInput {
  cleaned_text: string;
  complaint_id: string;
}

interface UnderstandingOutput {
  embedding: number[];
  complaint_id: string;
  tokens: string[];
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateEmbedding(text: string): number[] {
  const problemCategories = [
    ['water', 'tap', 'supply', 'pipe', 'leak', 'drinking', 'dry', 'shortage'],
    ['road', 'street', 'pothole', 'crack', 'damage', 'broken', 'repair', 'pavement'],
    ['garbage', 'trash', 'waste', 'dump', 'smell', 'dirty', 'cleanliness', 'bin'],
    ['electric', 'power', 'light', 'street', 'lamp', 'dark', 'outage', 'wire'],
    ['drain', 'sewage', 'overflow', 'block', 'clog', 'flood', 'stagnant', 'smell'],
    ['noise', 'loud', 'sound', 'construction', 'pollution', 'disturbance'],
    ['health', 'hospital', 'clinic', 'medicine', 'doctor', 'medical', 'emergency'],
    ['safety', 'crime', 'theft', 'danger', 'security', 'police', 'unsafe'],
    ['park', 'garden', 'tree', 'green', 'playground', 'maintenance'],
    ['transport', 'bus', 'traffic', 'signal', 'vehicle', 'parking', 'congestion'],
  ];

  const severityTerms = [
    ['urgent', 'emergency', 'critical', 'immediate', 'severe', 'dangerous'],
    ['important', 'serious', 'concern', 'problem', 'issue', 'need'],
    ['help', 'please', 'request', 'require', 'necessary'],
  ];

  const embedding: number[] = new Array(384).fill(0);
  const words = text.toLowerCase().split(' ');
  const wordSet = new Set(words);

  problemCategories.forEach((category, idx) => {
    let categoryScore = 0;
    category.forEach((keyword) => {
      if (wordSet.has(keyword)) {
        categoryScore += 1;
      }
      words.forEach((word) => {
        if (word.includes(keyword) || keyword.includes(word)) {
          categoryScore += 0.5;
        }
      });
    });

    const baseIdx = idx * 30;
    for (let i = 0; i < 30; i++) {
      embedding[baseIdx + i] = categoryScore / (category.length + 1);
    }
  });

  severityTerms.forEach((severity, idx) => {
    let severityScore = 0;
    severity.forEach((keyword) => {
      if (wordSet.has(keyword)) {
        severityScore += 1;
      }
    });

    const baseIdx = 300 + idx * 20;
    for (let i = 0; i < 20; i++) {
      embedding[baseIdx + i] = severityScore / (severity.length + 1);
    }
  });

  words.forEach((word, idx) => {
    if (word.length > 3) {
      const hash = simpleHash(word);
      const position = hash % 384;
      embedding[position] += 0.1;
    }
  });

  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
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
    const { cleaned_text, complaint_id }: UnderstandingInput = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logId = crypto.randomUUID();
    await supabase.from('agent_logs').insert({
      id: logId,
      agent_name: 'understanding',
      status: 'running',
      input_data: { cleaned_text, complaint_id },
    });

    const embedding = generateEmbedding(cleaned_text);
    const tokens = cleaned_text.split(' ').filter((w) => w.length > 2);

    await supabase
      .from('complaints')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', complaint_id);

    const output: UnderstandingOutput = {
      embedding,
      complaint_id,
      tokens,
    };

    const executionTime = Date.now() - startTime;

    await supabase
      .from('agent_logs')
      .update({
        status: 'completed',
        output_data: { tokens, embedding_dimensions: embedding.length },
        execution_time_ms: executionTime,
      })
      .eq('id', logId);

    return new Response(JSON.stringify(output), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Understanding Agent Error:', error);
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

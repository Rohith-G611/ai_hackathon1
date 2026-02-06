import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface IngestionInput {
  text: string;
  location?: string;
}

interface IngestionOutput {
  cleaned_text: string;
  location: string;
  is_valid: boolean;
  reason?: string;
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
    const { text, location = '' }: IngestionInput = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const logId = crypto.randomUUID();
    await supabase.from('agent_logs').insert({
      id: logId,
      agent_name: 'ingestion',
      status: 'running',
      input_data: { text, location },
    });

    let cleaned_text = text.trim().toLowerCase();
    cleaned_text = cleaned_text.replace(/\s+/g, ' ');

    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that',
    ]);

    const words = cleaned_text.split(' ').filter((word) =>
      word.length > 2 && !stopWords.has(word)
    );

    let is_valid = true;
    let reason = '';

    if (text.length < 10) {
      is_valid = false;
      reason = 'Text too short (minimum 10 characters)';
    } else if (words.length < 3) {
      is_valid = false;
      reason = 'Not enough meaningful words';
    } else if (/^(.)\1{5,}/.test(text)) {
      is_valid = false;
      reason = 'Contains repeated characters (spam detected)';
    }

    cleaned_text = words.join(' ');

    const output: IngestionOutput = {
      cleaned_text,
      location: location.trim(),
      is_valid,
      reason,
    };

    const executionTime = Date.now() - startTime;

    await supabase
      .from('agent_logs')
      .update({
        status: 'completed',
        output_data: output,
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
    console.error('Ingestion Agent Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        is_valid: false,
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

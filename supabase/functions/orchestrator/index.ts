import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function callAgent(agentName: string, payload: any): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${agentName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${agentName} failed: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, data } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'submit_complaint') {
      const { text, location } = data;

      const ingestionResult = await callAgent('ingestion-agent', {
        text,
        location,
      });

      if (!ingestionResult.is_valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: ingestionResult.reason || 'Complaint validation failed',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const { data: complaint, error: insertError } = await supabase
        .from('complaints')
        .insert({
          text,
          cleaned_text: ingestionResult.cleaned_text,
          location: ingestionResult.location,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await callAgent('understanding-agent', {
        cleaned_text: ingestionResult.cleaned_text,
        complaint_id: complaint.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          complaint_id: complaint.id,
          message: 'Complaint submitted successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'analyze_all') {
      const runId = crypto.randomUUID();

      await supabase.from('analysis_runs').insert({
        id: runId,
        status: 'processing',
        started_at: new Date().toISOString(),
      });

      const { count: totalComplaints } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing');

      const discoveryResult = await callAgent('discovery-agent', {});

      const priorityResult = await callAgent('priority-agent', {});

      const explainabilityResult = await callAgent('explainability-agent', {});

      const { data: problems } = await supabase
        .from('problems')
        .select('*')
        .order('priority_score', { ascending: false });

      await supabase
        .from('analysis_runs')
        .update({
          status: 'completed',
          total_complaints: totalComplaints || 0,
          problems_discovered: problems?.length || 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({
          success: true,
          run_id: runId,
          total_complaints: totalComplaints || 0,
          problems_discovered: problems?.length || 0,
          problems: problems || [],
          agents_executed: ['discovery', 'priority', 'explainability'],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'get_agent_logs') {
      const { data: logs } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({
          success: true,
          logs: logs || [],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'get_problems') {
      const { data: problems } = await supabase
        .from('problems')
        .select('*')
        .order('priority_score', { ascending: false });

      return new Response(
        JSON.stringify({
          success: true,
          problems: problems || [],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'get_problem_details') {
      const { problem_id } = data;

      const { data: problem } = await supabase
        .from('problems')
        .select('*')
        .eq('id', problem_id)
        .single();

      if (!problem) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Problem not found',
          }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const { data: complaintLinks } = await supabase
        .from('complaint_problems')
        .select('complaint_id')
        .eq('problem_id', problem_id);

      const complaintIds = complaintLinks?.map((link) => link.complaint_id) || [];

      const { data: complaints } = await supabase
        .from('complaints')
        .select('*')
        .in('id', complaintIds);

      return new Response(
        JSON.stringify({
          success: true,
          problem,
          complaints: complaints || [],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Orchestrator Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
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

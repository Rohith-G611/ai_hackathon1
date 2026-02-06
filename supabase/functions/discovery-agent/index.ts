import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Complaint {
  id: string;
  cleaned_text: string;
  embedding: number[];
  location: string;
}

interface Cluster {
  id: number;
  complaints: Complaint[];
  centroid: number[];
  title: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

function kMeansClustering(complaints: Complaint[], k: number): Cluster[] {
  if (complaints.length === 0) return [];

  k = Math.min(k, complaints.length);

  const clusters: Cluster[] = [];
  const embeddingDim = complaints[0].embedding.length;

  for (let i = 0; i < k; i++) {
    const randomComplaint = complaints[Math.floor(Math.random() * complaints.length)];
    clusters.push({
      id: i,
      complaints: [],
      centroid: [...randomComplaint.embedding],
      title: '',
    });
  }

  const maxIterations = 20;
  for (let iter = 0; iter < maxIterations; iter++) {
    clusters.forEach((cluster) => (cluster.complaints = []));

    complaints.forEach((complaint) => {
      let bestCluster = 0;
      let bestSimilarity = -1;

      clusters.forEach((cluster, idx) => {
        const similarity = cosineSimilarity(complaint.embedding, cluster.centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = idx;
        }
      });

      clusters[bestCluster].complaints.push(complaint);
    });

    let changed = false;
    clusters.forEach((cluster) => {
      if (cluster.complaints.length === 0) return;

      const newCentroid = new Array(embeddingDim).fill(0);
      cluster.complaints.forEach((complaint) => {
        complaint.embedding.forEach((val, idx) => {
          newCentroid[idx] += val;
        });
      });

      newCentroid.forEach((val, idx) => {
        newCentroid[idx] /= cluster.complaints.length;
      });

      const distance = cosineSimilarity(cluster.centroid, newCentroid);
      if (distance < 0.999) {
        changed = true;
        cluster.centroid = newCentroid;
      }
    });

    if (!changed) break;
  }

  return clusters.filter((c) => c.complaints.length > 0);
}

function generateClusterTitle(complaints: Complaint[]): string {
  const wordFreq: { [key: string]: number } = {};

  complaints.forEach((complaint) => {
    const words = complaint.cleaned_text.split(' ');
    words.forEach((word) => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });

  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  if (sortedWords.length === 0) return 'General Issues';

  return sortedWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' & ') + ' Issues';
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
      agent_name: 'discovery',
      status: 'running',
      input_data: { action: 'cluster_complaints' },
    });

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('id, cleaned_text, embedding, location')
      .not('embedding', 'is', null)
      .eq('status', 'processing');

    if (error) throw error;

    if (!complaints || complaints.length === 0) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'completed',
          output_data: { message: 'No complaints to cluster' },
          execution_time_ms: Date.now() - startTime,
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({ message: 'No complaints to process', clusters: [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const parsedComplaints: Complaint[] = complaints.map((c: any) => ({
      id: c.id,
      cleaned_text: c.cleaned_text,
      embedding: typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding,
      location: c.location,
    }));

    const numClusters = Math.min(Math.max(3, Math.ceil(parsedComplaints.length / 3)), 8);
    const clusters = kMeansClustering(parsedComplaints, numClusters);

    await supabase.from('problems').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('complaint_problems')
      .delete()
      .neq('complaint_id', '00000000-0000-0000-0000-000000000000');

    const problemsCreated = [];

    for (const cluster of clusters) {
      const title = generateClusterTitle(cluster.complaints);

      const { data: problem, error: problemError } = await supabase
        .from('problems')
        .insert({
          title,
          cluster_id: cluster.id,
          complaint_count: cluster.complaints.length,
          priority_score: 0,
          trend: 'stable',
          keywords: [],
        })
        .select()
        .single();

      if (problemError) {
        console.error('Error creating problem:', problemError);
        continue;
      }

      for (const complaint of cluster.complaints) {
        await supabase.from('complaint_problems').insert({
          complaint_id: complaint.id,
          problem_id: problem.id,
          confidence: 0.8,
        });

        await supabase
          .from('complaints')
          .update({ status: 'analyzed' })
          .eq('id', complaint.id);
      }

      problemsCreated.push({
        id: problem.id,
        title,
        complaint_count: cluster.complaints.length,
      });
    }

    const executionTime = Date.now() - startTime;

    await supabase
      .from('agent_logs')
      .update({
        status: 'completed',
        output_data: {
          clusters_created: clusters.length,
          problems_created: problemsCreated.length,
          total_complaints: parsedComplaints.length,
        },
        execution_time_ms: executionTime,
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        clusters: problemsCreated,
        total_complaints: parsedComplaints.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Discovery Agent Error:', error);
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

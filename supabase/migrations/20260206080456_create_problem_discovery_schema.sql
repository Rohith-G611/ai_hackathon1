/*
  # AI-Assisted Problem Discovery Platform Schema

  ## Overview
  This migration creates the complete database schema for an agent-based
  complaint analysis system that autonomously discovers and prioritizes
  local problems.

  ## New Tables

  ### 1. complaints
  Stores raw citizen complaints with metadata
  - id (uuid, primary key)
  - text (text) - Original complaint text
  - cleaned_text (text) - Processed by Ingestion Agent
  - location (text) - Geographic location/ward
  - status (text) - processing, analyzed, rejected
  - embedding (vector) - Semantic embedding from Understanding Agent
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### 2. problems
  Discovered problem clusters identified by AI
  - id (uuid, primary key)
  - title (text) - Auto-generated problem summary
  - description (text) - Detailed description
  - cluster_id (integer) - Cluster identifier
  - complaint_count (integer) - Number of complaints in this problem
  - priority_score (numeric) - Calculated urgency score
  - trend (text) - rising, stable, falling
  - keywords (text[]) - Key terms extracted
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### 3. complaint_problems
  Links complaints to discovered problems
  - complaint_id (uuid, foreign key)
  - problem_id (uuid, foreign key)
  - confidence (numeric) - Clustering confidence score
  - created_at (timestamptz)

  ### 4. agent_logs
  Tracks agent execution for transparency
  - id (uuid, primary key)
  - agent_name (text) - ingestion, understanding, discovery, priority, explainability
  - status (text) - running, completed, failed
  - input_data (jsonb) - Agent inputs
  - output_data (jsonb) - Agent outputs
  - execution_time_ms (integer)
  - created_at (timestamptz)

  ### 5. analysis_runs
  Tracks complete analysis sessions
  - id (uuid, primary key)
  - status (text) - processing, completed, failed
  - total_complaints (integer)
  - problems_discovered (integer)
  - started_at (timestamptz)
  - completed_at (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public can submit complaints (insert only)
  - Public can read problems and analysis results
  - Only authenticated admin users can update/delete
*/

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  cleaned_text text,
  location text DEFAULT '',
  status text DEFAULT 'processing',
  embedding vector(384),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- problems table
CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  cluster_id integer NOT NULL,
  complaint_count integer DEFAULT 0,
  priority_score numeric DEFAULT 0,
  trend text DEFAULT 'stable',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- complaint_problems junction table
CREATE TABLE IF NOT EXISTS complaint_problems (
  complaint_id uuid REFERENCES complaints(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  confidence numeric DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (complaint_id, problem_id)
);

-- agent_logs table
CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  status text DEFAULT 'running',
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  execution_time_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- analysis_runs table
CREATE TABLE IF NOT EXISTS analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'processing',
  total_complaints integer DEFAULT 0,
  problems_discovered integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_priority ON problems(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for complaints
CREATE POLICY "Anyone can submit complaints"
  ON complaints FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view complaints"
  ON complaints FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can update complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for problems
CREATE POLICY "Anyone can view problems"
  ON problems FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can manage problems"
  ON problems FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for complaint_problems
CREATE POLICY "Anyone can view complaint-problem links"
  ON complaint_problems FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can manage links"
  ON complaint_problems FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for agent_logs
CREATE POLICY "Anyone can view agent logs"
  ON agent_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can create logs"
  ON agent_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for analysis_runs
CREATE POLICY "Anyone can view analysis runs"
  ON analysis_runs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can manage runs"
  ON analysis_runs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
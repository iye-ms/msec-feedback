--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: feedback_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reddit_id text NOT NULL,
    author text NOT NULL,
    title text NOT NULL,
    content text,
    score integer DEFAULT 0 NOT NULL,
    url text NOT NULL,
    sentiment text,
    topic text,
    type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'Reddit'::text NOT NULL,
    feedback_type text,
    engagement_score integer DEFAULT 0 NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_date date NOT NULL,
    total_feedback integer DEFAULT 0 NOT NULL,
    sentiment_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    top_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary text NOT NULL,
    emerging_issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    sentiment_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: feedback_entries feedback_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_entries
    ADD CONSTRAINT feedback_entries_pkey PRIMARY KEY (id);


--
-- Name: feedback_entries feedback_entries_reddit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_entries
    ADD CONSTRAINT feedback_entries_reddit_id_key UNIQUE (reddit_id);


--
-- Name: weekly_reports weekly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_pkey PRIMARY KEY (id);


--
-- Name: weekly_reports weekly_reports_report_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT weekly_reports_report_date_key UNIQUE (report_date);


--
-- Name: idx_feedback_entries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_entries_created_at ON public.feedback_entries USING btree (created_at DESC);


--
-- Name: idx_feedback_entries_reddit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_entries_reddit_id ON public.feedback_entries USING btree (reddit_id);


--
-- Name: idx_feedback_entries_sentiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_entries_sentiment ON public.feedback_entries USING btree (sentiment);


--
-- Name: idx_feedback_entries_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_entries_timestamp ON public.feedback_entries USING btree ("timestamp" DESC);


--
-- Name: idx_feedback_entries_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_entries_topic ON public.feedback_entries USING btree (topic);


--
-- Name: idx_weekly_reports_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weekly_reports_date ON public.weekly_reports USING btree (report_date DESC);


--
-- Name: feedback_entries Allow public read access to feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to feedback" ON public.feedback_entries FOR SELECT USING (true);


--
-- Name: weekly_reports Allow public read access to reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to reports" ON public.weekly_reports FOR SELECT USING (true);


--
-- Name: feedback_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



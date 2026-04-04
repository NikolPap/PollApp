import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Survey, SurveyQuestion, FormattedQuestion, RealtimePayload } from '../models/survey.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Initialize Supabase client with project URL and Public API Key
    this.supabase = createClient(
      'https://naajbjdnbkiwqffbgltw.supabase.co', 
      'sb_publishable_9H_NbQ76dl0X-20wjGoHgQ_CZ2i4iIv'
    );
  }

   /**
   * Fetches all surveys along with their nested questions.
   * @returns A promise resolving to an array of surveys.
   */
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*, questions(*)');
    
    if (error) throw error;
    return data as Survey[];
  }

   /**
   * Fetches a specific survey by its ID and parses question options.
   * @param id - The unique identifier of the survey.
   * @returns The survey data or null if not found.
   */
  async getSurveyById(id: string): Promise<Survey | null> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select(`*, questions (*)`)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (data?.questions) {
      data.questions = data.questions.map((q: SurveyQuestion) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));
    }

    return data as Survey | null;
  }

  /**
   * Creates a new survey and its associated questions in a sequential flow.
   * @param surveyData - The main survey details (title, description, etc.).
   * @param questionsData - An array of question objects to be linked to the survey.
   */
  async createSurvey(surveyData: Partial<Survey>, questionsData: FormattedQuestion[]): Promise<Survey> {
    const { data: survey, error: surveyError } = await this.supabase
      .from('surveys')
      .insert([surveyData])
      .select()
      .single();

    if (surveyError) throw surveyError;

    const qsToInsert = questionsData.map(q => ({
      survey_id: survey.id,
      title: q.text,
      allow_multiple: q.allowMultiple,
      options: q.answers.map((a, index) => ({
        letter: String.fromCharCode(65 + index), 
        text: a.text,
        votes: 0
      }))
    }));

    const { error: qError } = await this.supabase.from('questions').insert(qsToInsert);
    if (qError) throw qError;
    
    return survey as Survey;
  }

   /**
   * Executes a database RPC (Stored Procedure) to increment or decrement a vote count.
   * @param questionId - The ID of the question being voted on.
   * @param optionLetter - The specific option letter (e.g., 'A').
   * @param addVote - Boolean indicating whether to add (true) or remove (false) a vote.
   */
  async vote(questionId: string, optionLetter: string, addVote: boolean): Promise<void> {
    const { error } = await this.supabase.rpc('toggle_vote', {
      q_id: questionId,
      opt_letter: optionLetter,
      add_vote: addVote 
    });
    
    if (error) throw error;
  }

    /**
   * Sets up a Realtime subscription to listen for database updates on specific questions.
   * @param surveyId - The survey ID to filter changes for.
   * @param callback - Function executed whenever a row update is detected.
   * @returns The active realtime channel instance.
   */
   listenToSurveyResults(surveyId: string, callback: (payload: RealtimePayload) => void): RealtimeChannel {
    return this.supabase
      .channel('live-survey-results')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `survey_id=eq.${surveyId}` },
        (payload) => callback(payload as unknown as RealtimePayload)
      )
      .subscribe();
  }

  /**
   * Removes and unsubscribes from a specific Realtime channel.
   * @param channel - The channel instance to be removed.
   */
  removeChannel(channel: RealtimeChannel): void {
    this.supabase.removeChannel(channel);
  }
}
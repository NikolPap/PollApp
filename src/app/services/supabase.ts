import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  async getSurveys(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*, questions(*)');
    
    if (error) throw error;
    return data;
  }

  /**
   * Fetches a specific survey by its ID and parses question options.
   * @param id - The unique identifier of the survey.
   * @returns The survey data or null if not found.
   */
  async getSurveyById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    // Ensure question options are parsed from JSON strings if necessary
    if (data?.questions) {
      data.questions = data.questions.map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));
    }

    return data;
  }

  /**
   * Creates a new survey and its associated questions in a sequential flow.
   * @param surveyData - The main survey details (title, description, etc.).
   * @param questionsData - An array of question objects to be linked to the survey.
   */
  async createSurvey(surveyData: any, questionsData: any[]): Promise<any> {
    // 1. Insert the main survey record
    const { data: survey, error: surveyError } = await this.supabase
      .from('surveys')
      .insert([surveyData])
      .select()
      .single();

    if (surveyError) throw surveyError;

    // 2. Map questions to the new survey ID and format options
    const qsToInsert = questionsData.map(q => ({
      survey_id: survey.id,
      title: q.text,
      allow_multiple: q.allowMultiple,
      options: q.answers.map((a: any, index: number) => ({
        letter: String.fromCharCode(65 + index), // Convert index to A, B, C...
        text: a.text,
        votes: 0
      }))
    }));

    // 3. Bulk insert the questions
    const { error: qError } = await this.supabase.from('questions').insert(qsToInsert);
    if (qError) throw qError;
    
    return survey;
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
  listenToSurveyResults(surveyId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('live-survey-results')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'questions',
          filter: `survey_id=eq.${surveyId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Removes and unsubscribes from a specific Realtime channel.
   * @param channel - The channel instance to be removed.
   */
  removeChannel(channel: any): void {
    this.supabase.removeChannel(channel);
  }
}
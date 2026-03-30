import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient('https://naajbjdnbkiwqffbgltw.supabase.co', 'sb_publishable_9H_NbQ76dl0X-20wjGoHgQ_CZ2i4iIv');
  }


  async getSurveys() {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*, questions(*)');
    if (error) throw error;
    return data;
  }

async getSurveyById(id: string) {
  const { data, error } = await this.supabase
    .from('surveys')
    .select(`
      *,
      questions (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (data?.questions) {
    data.questions = data.questions.map((q: any) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
  }

  return data;
}

  async createSurvey(surveyData: any, questionsData: any[]) {

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
      options: q.answers.map((a: any, index: number) => ({
        letter: String.fromCharCode(65 + index),
        text: a.text,
        votes: 0
      }))
    }));

    const { error: qError } = await this.supabase.from('questions').insert(qsToInsert);
    if (qError) throw qError;
    
    return survey;
  }

 async vote(questionId: string, optionLetter: string, addVote: boolean) {
    const { error } = await this.supabase.rpc('toggle_vote', {
      q_id: questionId,
      opt_letter: optionLetter,
      add_vote: addVote 
    });
    if (error) throw error;
  }

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

removeChannel(channel: any) {
  this.supabase.removeChannel(channel);
}
}
export interface Answer {
  id: number;
  text: string;
}

export interface Question {
  id: number;
  text: string;
  allowMultiple: boolean;
  answers: Answer[];
}

export const SURVEY_CATEGORIES = [
  'Team Activities',
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Lifestyle & Preferences',
  'Technology & Innovation'
] as const; 

export type SurveyCategory = typeof SURVEY_CATEGORIES[number];

export interface SurveyOption {
  letter: string;
  text: string;
  votes?: number;
  percentage?: number; 
  selected?: boolean;  
  locked?: boolean;    
}

export interface SurveyQuestion {
  id: string; 
  survey_id: string;
  title: string;
  allow_multiple: boolean;
  options: SurveyOption[]; // <-- ΑΦΑΙΡΕΘΗΚΕ ΤΟ | string. Τώρα η Angular ξέρει ότι είναι σίγουρα Array!
  hasVoted?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  end_date: string | null;
  category: SurveyCategory | string;
  questions?: SurveyQuestion[];
}

export interface FormattedQuestion {
  text: string;
  allowMultiple: boolean;
  answers: Answer[];
}

export interface RealtimePayload {
  new: SurveyQuestion;
}
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
];
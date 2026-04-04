import { Injectable } from '@angular/core';
import { SurveyQuestion, SurveyOption } from '../models/survey.types';

@Injectable({
  providedIn: 'root'
})
export class SurveyLogicService {
  /**
   * Orchestrates the percentage calculation for all questions in a survey.
   * Ensures that percentages are calculated accurately based on total votes.
   * @param questions - Array of question objects containing options and vote counts.
   */
  calculatePercentages(questions: SurveyQuestion[]): void {
    if (!questions) return;

    questions.forEach((q) => {
      const options = q.options;
      const total = this.getTotalVotes(options);
      
      if (total === 0) {
        options.forEach(opt => (opt.percentage = 0));
        return;
      }
      this.assignPercentages(options, total);
    });
  }

    /**
   * Sums the total number of votes across all options for a specific question.
   */
  private getTotalVotes(options: SurveyOption[]): number {
    return options.reduce((sum, opt) => sum + Number(opt.votes || 0), 0);
  }

    /**
   * Calculates percentages for each option using the Largest Remainder Method.
   * This ensures the sum of all percentages equals exactly 100%.
   * @param options - The list of options for a question.
   * @param total - The total vote count for the question.
   */
  private assignPercentages(options: SurveyOption[], total: number): void {
    let sumFloored = 0;
    const stats = options.map((opt) => {
      const exact = (Number(opt.votes || 0) / total) * 100;
      const floored = Math.floor(exact);
      sumFloored += floored;
      return { opt, floored, remainder: exact - floored };
    });

    this.applyRemainder(stats, 100 - sumFloored);
  }

  /**
   * Distributes the "missing" percentage points to options with the highest decimal remainders.
   * @param stats - Processed stats including floored values and remainders.
   * @param missing - The difference needed to reach 100%.
   */
  private applyRemainder(stats: { opt: SurveyOption; floored: number; remainder: number }[], missing: number): void {
    stats.sort((a, b) => b.remainder - a.remainder);
    stats.forEach((stat, i) => {
      stat.opt.percentage = i < missing ? stat.floored + 1 : stat.floored;
    });
  }

  /**
   * Updates the UI state of questions and options immediately after a user clicks.
   * Handles logic for both single-choice and multiple-choice questions.
   * @param questions - The full list of survey questions.
   * @param questionToUpdate - The specific question the user interacted with.
   * @param letter - The option letter (e.g., 'A') being toggled.
   * @param checked - The new checkbox/radio state.
   */
  applyVoteUI(questions: SurveyQuestion[], questionToUpdate: SurveyQuestion, letter: string, checked: boolean): SurveyQuestion[] {
    return questions.map((q) => {
      if (q.id !== questionToUpdate.id) return q;
      return q.allow_multiple
        ? this.updateMultipleChoice(q, letter, checked)
        : this.updateSingleChoice(q, letter);
    });
  }

   /**
   * Logic for single-choice questions: selects one option and deselects the previous one.
   */
  private updateSingleChoice(q: SurveyQuestion, letter: string): SurveyQuestion {
    const options = q.options.map((opt) => {
      const votes = Number(opt.votes || 0);
      
      if (opt.letter === letter) {
        return { ...opt, selected: true, votes: votes + 1 };
      }
      if (opt.selected) {
        return { ...opt, selected: false, votes: Math.max(0, votes - 1) };
      }
      return opt;
    });
    return { ...q, options };
  }

  /**
   * Logic for multiple-choice questions: increments/decrements votes based on checkbox state.
   */
  private updateMultipleChoice(q: SurveyQuestion, letter: string, checked: boolean): SurveyQuestion {
    const options = q.options.map((opt) => {
      if (opt.letter !== letter) return opt;
      
      const votes = Number(opt.votes || 0);
      return {
        ...opt,
        selected: checked,
        votes: checked ? votes + 1 : Math.max(0, votes - 1),
      };
    });
    return { ...q, options };
  }
}
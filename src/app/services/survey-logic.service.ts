import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SurveyLogicService {
  
  /**
   * Orchestrates the percentage calculation for all questions in a survey.
   * Ensures that percentages are calculated accurately based on total votes.
   * @param questions - Array of question objects containing options and vote counts.
   */
  calculatePercentages(questions: any[]): void {
    if (!questions) return;

    questions.forEach((q: any) => {
      const total = this.getTotalVotes(q.options);
      if (total === 0) {
        q.options.forEach((opt: any) => (opt.percentage = 0));
        return;
      }
      this.assignPercentages(q.options, total);
    });
  }

  /**
   * Sums the total number of votes across all options for a specific question.
   */
  private getTotalVotes(options: any[]): number {
    return options.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);
  }

  /**
   * Calculates percentages for each option using the Largest Remainder Method.
   * This ensures the sum of all percentages equals exactly 100%.
   * @param options - The list of options for a question.
   * @param total - The total vote count for the question.
   */
  private assignPercentages(options: any[], total: number): void {
    let sumFloored = 0;
    const stats = options.map((opt) => {
      const exact = (Number(opt.votes || 0) / total) * 100;
      const floored = Math.floor(exact);
      sumFloored += floored;
      return { opt, floored, remainder: exact - floored };
    });

    // Distribute the remaining percentage points to bridge the gap to 100%
    this.applyRemainder(stats, 100 - sumFloored);
  }

  /**
   * Distributes the "missing" percentage points to options with the highest decimal remainders.
   * @param stats - Processed stats including floored values and remainders.
   * @param missing - The difference needed to reach 100%.
   */
  private applyRemainder(stats: any[], missing: number): void {
    // Sort by largest remainder to determine who gets the extra +1%
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
  applyVoteUI(questions: any[], questionToUpdate: any, letter: string, checked: boolean): any[] {
    return questions.map((q: any) => {
      if (q.id !== questionToUpdate.id) return q;
      return q.allow_multiple
        ? this.updateMultipleChoice(q, letter, checked)
        : this.updateSingleChoice(q, letter);
    });
  }

  /**
   * Logic for single-choice questions: selects one option and deselects the previous one.
   */
  private updateSingleChoice(q: any, letter: string): any {
    const options = q.options.map((opt: any) => {
      const votes = Number(opt.votes || 0);
      
      // If this is the newly selected option
      if (opt.letter === letter) {
        return { ...opt, selected: true, votes: votes + 1 };
      }
      
      // If this was previously selected, remove the vote and selection
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
  private updateMultipleChoice(q: any, letter: string, checked: boolean): any {
    const options = q.options.map((opt: any) => {
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
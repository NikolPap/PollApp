import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SurveyLogicService {

  // --- Υπολογισμός Ποσοστών ---
  calculatePercentages(questions: any[]) {
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

  private getTotalVotes(options: any[]) {
    return options.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);
  }

  private assignPercentages(options: any[], total: number) {
    let sumFloored = 0;
    const stats = options.map((opt) => {
      const exact = (Number(opt.votes || 0) / total) * 100;
      const floored = Math.floor(exact);
      sumFloored += floored;
      return { opt, floored, remainder: exact - floored };
    });

    this.applyRemainder(stats, 100 - sumFloored);
  }

  private applyRemainder(stats: any[], missing: number) {
    stats.sort((a, b) => b.remainder - a.remainder);
    stats.forEach((stat, i) => {
      stat.opt.percentage = i < missing ? stat.floored + 1 : stat.floored;
    });
  }

  // --- Λογική Επιλογής Ψήφου (Optimistic UI) ---
  applyVoteUI(questions: any[], questionToUpdate: any, letter: string, checked: boolean) {
    return questions.map((q: any) => {
      if (q.id !== questionToUpdate.id) return q;
      return q.allow_multiple
        ? this.updateMultipleChoice(q, letter, checked)
        : this.updateSingleChoice(q, letter);
    });
  }

  private updateSingleChoice(q: any, letter: string) {
    const options = q.options.map((opt: any) => {
      const votes = Number(opt.votes || 0);
      if (opt.letter === letter) return { ...opt, selected: true, votes: votes + 1 };
      if (opt.selected) return { ...opt, selected: false, votes: Math.max(0, votes - 1) };
      return opt;
    });
    return { ...q, options };
  }

  private updateMultipleChoice(q: any, letter: string, checked: boolean) {
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
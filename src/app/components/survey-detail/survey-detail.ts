import { Component, OnInit, OnDestroy, ChangeDetectorRef , signal} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe} from '@angular/common';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {

  survey: any = null;
  isLoading = true;
  realtimeChannel: any;
  showMobileResults = signal<boolean>(true);

  toggleMobileResults() {
  this.showMobileResults.update(val => !val);
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly supabase: SupabaseService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes survey data and realtime updates
   */
  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.isLoading = false;
      return;
    }

    await this.loadSurvey(id);
    this.setupRealtime(id);
  }

  /**
   * Cleans up realtime subscription
   */
  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Fetches survey and prepares UI state
   */
  async loadSurvey(id: string) {
    this.isLoading = true;

    try {
      const data = await this.supabase.getSurveyById(id);
      if (!data) return;

      this.survey = this.prepareSurvey(data);
      this.calculatePercentages();
    } catch (err) {
      console.error('LOAD ERROR:', err);
    }

    this.finishLoading();
  }

  /**
   * Transforms raw survey data into UI-ready format
   */
  private prepareSurvey(data: any) {
    const questions = (data.questions || []).map((q: any) => ({
      ...q,
      options: this.prepareOptions(q.options),
      hasVoted: false,
    }));

    return { ...data, questions };
  }

  /**
   * Parses and enriches options with UI state
   */
  private prepareOptions(options: any) {
    const parsed = typeof options === 'string' ? JSON.parse(options) : options;

    return parsed.map((opt: any) => ({
      ...opt,
      selected: false,
      locked: false,
    }));
  }

  /**
   * Finalizes loading state and triggers change detection
   */
  private finishLoading() {
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  /**
   * Calculates vote percentages with fair rounding
   */
  calculatePercentages() {
    if (!this.survey?.questions) return;

    this.survey.questions.forEach((q: any) => {
      const total = this.getTotalVotes(q.options);

      if (total === 0) {
        q.options.forEach((opt: any) => (opt.percentage = 0));
        return;
      }

      this.assignPercentages(q.options, total);
    });
  }

  /**
   * Sums total votes for a question
   */
  private getTotalVotes(options: any[]) {
    return options.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);
  }

  /**
   * Distributes percentages ensuring sum = 100
   */
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

  /**
   * Distributes remaining percentage points
   */
  private applyRemainder(stats: any[], missing: number) {
    stats.sort((a, b) => b.remainder - a.remainder);

    stats.forEach((stat, i) => {
      stat.opt.percentage = i < missing ? stat.floored + 1 : stat.floored;
    });
  }

  /**
   * Subscribes to realtime survey updates
   */
  setupRealtime(surveyId: string) {
    this.realtimeChannel = this.supabase.listenToSurveyResults(surveyId, (payload) =>
      this.handleRealtimeUpdate(payload),
    );
  }

  /**
   * Handles incoming realtime updates
   */
  private handleRealtimeUpdate(payload: any) {
    const updated = payload.new;
    const index = this.findQuestionIndex(updated.id);

    if (index === -1) return;

    this.updateQuestionOptions(index, updated.options);
    this.calculatePercentages();
    this.cdr.detectChanges();
  }

  /**
   * Finds question index by ID
   */
  private findQuestionIndex(id: number) {
    return this.survey.questions.findIndex((q: any) => q.id === id);
  }

  /**
   * Updates options while preserving UI state
   */
  private updateQuestionOptions(index: number, options: any) {
    const newOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const current = this.survey.questions[index].options;

    this.survey.questions[index].options = newOptions.map((opt: any) => {
      const old = current.find((o: any) => o.letter === opt.letter);

      return {
        ...opt,
        selected: old?.selected || false,
        locked: old?.locked || false,
      };
    });
  }

  /**
   * Handles voting logic and optimistic UI update
   */
  async onVote(question: any, letter: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const prevState = this.cloneQuestions();

    this.applyVoteUI(question, letter, checked);
    this.calculatePercentages();
    this.cdr.detectChanges();

    try {
      await this.syncVote(question, letter, checked);
    } catch (error) {
      this.rollbackVote(prevState);
    }
  }

  /**
   * Deep clones questions state
   */
  private cloneQuestions() {
    return JSON.parse(JSON.stringify(this.survey.questions));
  }

  /**
   * Applies vote changes locally (optimistic update)
   */
  private applyVoteUI(question: any, letter: string, checked: boolean) {
    this.survey.questions = this.survey.questions.map((q: any) => {
      if (q.id !== question.id) return q;

      return q.allow_multiple
        ? this.updateMultipleChoice(q, letter, checked)
        : this.updateSingleChoice(q, letter);
    });
  }

  /**
   * Updates single-choice question votes
   */
  private updateSingleChoice(q: any, letter: string) {
    const options = q.options.map((opt: any) => {
      const votes = Number(opt.votes || 0);

      if (opt.letter === letter) return { ...opt, selected: true, votes: votes + 1 };

      if (opt.selected) return { ...opt, selected: false, votes: Math.max(0, votes - 1) };

      return opt;
    });

    return { ...q, options };
  }

  /**
   * Updates multiple-choice question votes
   */
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

  /**
   * Syncs vote with backend
   */
  private async syncVote(question: any, letter: string, checked: boolean) {
    if (question.allow_multiple) {
      await this.supabase.vote(question.id, letter, checked);
      return;
    }

    const previous = this.findPreviousSelection(question, letter);

    if (previous) {
      await this.supabase.vote(question.id, previous.letter, false);
    }

    await this.supabase.vote(question.id, letter, true);
  }

  /**
   * Finds previously selected option (single choice)
   */
  private findPreviousSelection(question: any, letter: string) {
    return question.options.find((opt: any) => opt.selected && opt.letter !== letter);
  }

  /**
   * Restores previous state on error
   */
  private rollbackVote(prevState: any) {
    console.error('Error voting');

    this.survey.questions = prevState;
    this.calculatePercentages();
    this.cdr.detectChanges();

    alert('something is wrong.');
  }
}

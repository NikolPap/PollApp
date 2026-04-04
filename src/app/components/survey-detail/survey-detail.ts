import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';
import { SurveyLogicService } from '../../services/survey-logic.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Survey, SurveyQuestion, SurveyOption, RealtimePayload } from '../../models/survey.types';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {
  // Dependencies
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly surveyLogic = inject(SurveyLogicService);

  survey: Survey | null = null;
  isLoading = true;
  realtimeChannel: RealtimeChannel | undefined;
  showMobileResults = signal<boolean>(true);

 /**
   * Toggles the mobile results view state.
   */
  toggleMobileResults(): void {
    this.showMobileResults.update(val => !val);
  }

 /**
   * Initialization: Fetches survey ID from route and sets up data/listeners.
   */
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading = false;
      return;
    }
    await this.loadSurvey(id);
    this.setupRealtime(id);
  }

 /**
   * Cleanup: Unsubscribes from Supabase realtime channels.
   */
  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Fetches survey data by ID and calculates initial percentages.
   */
  async loadSurvey(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const data = await this.supabase.getSurveyById(id);
      if (!data) return;

      this.survey = this.prepareSurvey(data);
      if (this.survey.questions) {
        this.surveyLogic.calculatePercentages(this.survey.questions);
      }
    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  /**
   * Prepares survey data structure and injects UI-specific flags.
   */
  private prepareSurvey(data: Survey): Survey {
    const questions = (data.questions || []).map((q) => ({
      ...q,
      options: this.prepareOptions(q.options),
      hasVoted: false,
    }));
    return { ...data, questions };
  }

  /**
   * Parses options and initializes selection/lock states.
   */
  private prepareOptions(options: unknown): SurveyOption[] {
    const parsed =
      typeof options === 'string'
        ? (JSON.parse(options) as SurveyOption[])
        : (options as SurveyOption[]);

    return parsed.map((opt) => ({
      ...opt,
      selected: false,
      locked: false,
    }));
  }

  /**
   * Subscribes to realtime updates for a specific survey.
   */
  setupRealtime(surveyId: string): void {
    this.realtimeChannel = this.supabase.listenToSurveyResults(
      surveyId,
      (payload: RealtimePayload) => this.handleRealtimeUpdate(payload),
    );
  }

  /**
   * Handles incoming realtime data updates and refreshes the UI.
   */
  private handleRealtimeUpdate(payload: RealtimePayload): void {
    if (!this.survey || !this.survey.questions) return;

    const updated = payload.new;
    const index = this.survey.questions.findIndex((q) => q.id === updated.id);
    if (index === -1) return;

    this.updateQuestionOptions(index, updated.options);
    this.surveyLogic.calculatePercentages(this.survey.questions);
    this.cdr.detectChanges();
  }

  /**
   * Updates specific question options while preserving user interaction state.
   */
  private updateQuestionOptions(index: number, options: unknown): void {
    if (!this.survey || !this.survey.questions) return;

    const newOptions =
      typeof options === 'string'
        ? (JSON.parse(options) as SurveyOption[])
        : (options as SurveyOption[]);

    const current = this.survey.questions[index].options;

    this.survey.questions[index].options = newOptions.map((opt) => {
      const old = current.find((o) => o.letter === opt.letter);
      return {
        ...opt,
        selected: old?.selected || false,
        locked: old?.locked || false,
      };
    });
  }

  /**
   * Manages the voting process with Optimistic UI updates.
   */
  async onVote(
    question: SurveyQuestion,
    letter: string,
    event: Event,
  ): Promise<void> {
    if (!this.survey || !this.survey.questions) return;

    const checked = (event.target as HTMLInputElement).checked;
    const prevState = JSON.parse(
      JSON.stringify(this.survey.questions),
    ) as SurveyQuestion[];

    this.survey.questions = this.surveyLogic.applyVoteUI(
      this.survey.questions,
      question,
      letter,
      checked,
    );

    this.surveyLogic.calculatePercentages(this.survey.questions);
    this.cdr.detectChanges();

    try {
      await this.syncVote(question, letter, checked);
    } catch (error) {
      this.rollbackVote(prevState);
    }
  }

   /**
   * Synchronizes the user's vote with the backend database.
   */
  private async syncVote(
    question: SurveyQuestion,
    letter: string,
    checked: boolean,
  ): Promise<void> {
    if (question.allow_multiple) {
      await this.supabase.vote(question.id, letter, checked);
      return;
    }

    const options = question.options;
    const previous = options.find(
      (opt) => opt.selected && opt.letter !== letter,
    );

    if (previous) {
      await this.supabase.vote(question.id, previous.letter, false);
    }

    await this.supabase.vote(question.id, letter, true);
  }

/**
   * Reverts UI state and alerts the user if the voting request fails.
   */
  private rollbackVote(prevState: SurveyQuestion[]): void {
    if (!this.survey) return;

    console.error('Voting Sync Failed');
    this.survey.questions = prevState;
    this.surveyLogic.calculatePercentages(this.survey.questions);
    this.cdr.detectChanges();

    alert('Something went wrong. Your vote could not be registered.');
  }
}
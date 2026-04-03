import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';
import { SurveyLogicService } from '../../services/survey-logic.service'; // Η νέα κλάση

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail implements OnInit, OnDestroy {
  // ΟΛΑ ΓΙΝΟΝΤΑΙ INJECT
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly surveyLogic = inject(SurveyLogicService); // Inject της λογικής

  survey: any = null;
  isLoading = true;
  realtimeChannel: any;
  showMobileResults = signal<boolean>(true);

  toggleMobileResults() {
    this.showMobileResults.update(val => !val);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading = false;
      return;
    }
    await this.loadSurvey(id);
    this.setupRealtime(id);
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }

  async loadSurvey(id: string) {
    this.isLoading = true;
    try {
      const data = await this.supabase.getSurveyById(id);
      if (!data) return;

      this.survey = this.prepareSurvey(data);
      this.surveyLogic.calculatePercentages(this.survey.questions); // Χρήση του Service
    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private prepareSurvey(data: any) {
    const questions = (data.questions || []).map((q: any) => ({
      ...q,
      options: this.prepareOptions(q.options),
      hasVoted: false,
    }));
    return { ...data, questions };
  }

  private prepareOptions(options: any) {
    const parsed = typeof options === 'string' ? JSON.parse(options) : options;
    return parsed.map((opt: any) => ({ ...opt, selected: false, locked: false }));
  }

  setupRealtime(surveyId: string) {
    this.realtimeChannel = this.supabase.listenToSurveyResults(surveyId, (payload) =>
      this.handleRealtimeUpdate(payload),
    );
  }

  private handleRealtimeUpdate(payload: any) {
    const updated = payload.new;
    const index = this.survey.questions.findIndex((q: any) => q.id === updated.id);
    if (index === -1) return;

    this.updateQuestionOptions(index, updated.options);
    this.surveyLogic.calculatePercentages(this.survey.questions); // Χρήση του Service
    this.cdr.detectChanges();
  }

  private updateQuestionOptions(index: number, options: any) {
    const newOptions = typeof options === 'string' ? JSON.parse(options) : options;
    const current = this.survey.questions[index].options;
    this.survey.questions[index].options = newOptions.map((opt: any) => {
      const old = current.find((o: any) => o.letter === opt.letter);
      return { ...opt, selected: old?.selected || false, locked: old?.locked || false };
    });
  }

  async onVote(question: any, letter: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const prevState = JSON.parse(JSON.stringify(this.survey.questions));

    // Χρήση του Service για αλλαγή UI
    this.survey.questions = this.surveyLogic.applyVoteUI(this.survey.questions, question, letter, checked);
    this.surveyLogic.calculatePercentages(this.survey.questions); 
    this.cdr.detectChanges();

    try {
      await this.syncVote(question, letter, checked);
    } catch (error) {
      this.rollbackVote(prevState);
    }
  }

  private async syncVote(question: any, letter: string, checked: boolean) {
    if (question.allow_multiple) {
      await this.supabase.vote(question.id, letter, checked);
      return;
    }
    const previous = question.options.find((opt: any) => opt.selected && opt.letter !== letter);
    if (previous) {
      await this.supabase.vote(question.id, previous.letter, false);
    }
    await this.supabase.vote(question.id, letter, true);
  }

  private rollbackVote(prevState: any) {
    console.error('Error voting');
    this.survey.questions = prevState;
    this.surveyLogic.calculatePercentages(this.survey.questions);
    this.cdr.detectChanges();
    alert('Something went wrong.');
  }
}
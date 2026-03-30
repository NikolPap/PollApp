import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';

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

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadSurvey(id);
      this.setupRealtime(id); 
    } else {
      this.isLoading = false;
    }
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

      const fixedQuestions = (data.questions ||[]).map((q: any) => {
        const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        const optionsWithState = parsedOptions.map((opt: any) => ({
          ...opt,
          selected: false,
          locked: false 
        }));

        return {
          ...q,
          options: optionsWithState,
          hasVoted: false 
        };
      });

      this.survey = { ...data, questions: fixedQuestions };
      this.calculatePercentages();
    } catch (err) {
      console.error("LOAD ERROR:", err);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

 calculatePercentages() {
    if (!this.survey?.questions) return;

    this.survey.questions.forEach((q: any) => {
      const totalVotes = q.options.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);
      if (totalVotes === 0) {
        q.options.forEach((opt: any) => opt.percentage = 0);
        return; 
      }

      let sumFloored = 0;
      const stats = q.options.map((opt: any) => {
        const exact = (Number(opt.votes || 0) / totalVotes) * 100;
        const floored = Math.floor(exact);
        sumFloored += floored;
        
        return { 
          opt,               
          floored: floored,  
          remainder: exact - floored 
        };
      });

      const missing = 100 - sumFloored;
      stats.sort((a: any, b: any) => b.remainder - a.remainder);
      stats.forEach((stat: any, index: number) => {
        if (index < missing) {
          stat.opt.percentage = stat.floored + 1; 
        } else {
          stat.opt.percentage = stat.floored;     
        }
      });
      
    });
  }

  setupRealtime(surveyId: string) {
    this.realtimeChannel = this.supabase.listenToSurveyResults(surveyId, (payload) => {
      const updatedQuestion = payload.new;
      const qIndex = this.survey.questions.findIndex((q: any) => q.id === updatedQuestion.id);
      
      if (qIndex !== -1) {
        const newOptions = typeof updatedQuestion.options === 'string' 
          ? JSON.parse(updatedQuestion.options) 
          : updatedQuestion.options;
        const currentOptions = this.survey.questions[qIndex].options;
         this.survey.questions[qIndex].options = newOptions.map((newOpt: any) => {
          const oldOpt = currentOptions.find((o: any) => o.letter === newOpt.letter);
          return { 
            ...newOpt, 
            selected: oldOpt?.selected || false,
            locked: oldOpt?.locked || false 
          };
        });
        this.calculatePercentages();
        this.cdr.detectChanges();
      }
    });
  }

async onVote(question: any, optionLetter: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const previousQuestionsState = JSON.parse(JSON.stringify(this.survey.questions));
    this.survey.questions = this.survey.questions.map((q: any) => {
      if (q.id === question.id) {
        
        if (!q.allow_multiple) {

          const updatedOptions = q.options.map((opt: any) => {
            let currentVotes = Number(opt.votes || 0);       
            if (opt.letter === optionLetter) {
              return { ...opt, selected: true, votes: currentVotes + 1 };
            } else if (opt.selected) {
              return { ...opt, selected: false, votes: Math.max(0, currentVotes - 1) };
            }
            return opt;
          });
          return { ...q, options: updatedOptions };
        } 
        else {
          const updatedOptions = q.options.map((opt: any) => {
            if (opt.letter === optionLetter) {
              const currentVotes = Number(opt.votes || 0);
              return { 
                ...opt, 
                selected: isChecked,
                votes: isChecked ? currentVotes + 1 : Math.max(0, currentVotes - 1) 
              };
            }
            return opt;
          });
          return { ...q, options: updatedOptions };
        }
      }
      return q;
    });
    this.calculatePercentages();
    this.cdr.detectChanges();
    try {
      if (!question.allow_multiple) {
        const previouslySelected = question.options.find((opt: any) => opt.selected && opt.letter !== optionLetter);
        
        if (previouslySelected) {
           await this.supabase.vote(question.id, previouslySelected.letter, false); // -1 στο παλιό
        }
        await this.supabase.vote(question.id, optionLetter, true); // +1 στο καινούργιο
      } else {
        await this.supabase.vote(question.id, optionLetter, isChecked);
      }
    } catch (error) {
      console.error('Error voting:', error);
      this.survey.questions = previousQuestionsState;
      this.calculatePercentages();
      this.cdr.detectChanges();
      alert('Κάτι πήγε στραβά με την αποστολή της ψήφου.');
    }
  }}
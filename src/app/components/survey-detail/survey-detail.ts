import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class SurveyDetail implements OnInit {
  survey: any = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef // για χειροκίνητο update
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID:', id);

    if (id) {
      await this.loadSurvey(id);
    } else {
      console.error('Δεν βρέθηκε ID!');
      this.isLoading = false;
    }
  }

  async loadSurvey(id: string) {
    this.isLoading = true;

    try {
      const data = await this.supabase.getSurveyById(id);
      console.log('DATA:', data);

      if (!data) {
        this.survey = null;
        return;
      }

      // normalize options (αν είναι string JSON)
      const fixedQuestions = (data.questions || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string'
          ? JSON.parse(q.options)
          : q.options
      }));

      this.survey = {
        ...data,
        questions: fixedQuestions
      };

      // υπολογισμός ποσοστών
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
    const totalVotes = q.options.reduce((sum: number, opt: any) => 
      sum + Number(opt.votes || 0), 0
    );

    q.options.forEach((opt: any) => {
      const currentVotes = Number(opt.votes || 0);
      opt.percentage = totalVotes === 0 
        ? 0 
        : Math.round((currentVotes / totalVotes) * 100);
    });
  });
}

  //  Local vote update χωρίς reload
async onVote(questionId: string, optionLetter: string) {
  try {
    await this.supabase.vote(questionId, optionLetter);
    this.survey.questions = this.survey.questions.map((q: any) => {
      if (q.id === questionId) {
        const updatedOptions = q.options.map((opt: any) => {
          if (opt.letter === optionLetter) {
            return { 
              ...opt, 
              votes: Number(opt.votes || 0) + 1, 
              selected: !opt.selected 
            };
          }
          return opt;
        });
        return { ...q, options: updatedOptions };
      }
      return q;
    });
    this.calculatePercentages();
    this.cdr.detectChanges();

  } catch (error) {
    console.error('Error voting:', error);
    alert('Κάτι πήγε στραβά με την ψήφο σας.');
  }
}
  getSurveyStatus(endDate: string | null): string {
    if (!endDate) return 'Active';
    return new Date(endDate) >= new Date() ? 'Active' : 'Ended';
  }
  trackById(index: number, item: any) {
    return item.id;
  }
}
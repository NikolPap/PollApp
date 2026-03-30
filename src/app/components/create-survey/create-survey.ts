import { Component, signal, ElementRef, ViewChild, HostListener, inject,output, Output } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { EventEmitter } from '@angular/core';

interface Answer {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  allowMultiple: boolean;
  answers: Answer[];
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})



export class CreateSurvey {
  @Output() close = new EventEmitter<void>();

cancel() {
  this.close.emit();
}




  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // --- Form Main State ---
  surveyTitle: string = '';
  surveyDescription: string = '';
  surveyEndDate: string = '';
  isSubmitting = signal<boolean>(false);
  
  // Neuer State für die Validierung
  showValidationErrors = signal<boolean>(false);

  // --- Dropdown State ---
  isDropdownOpen = signal(false);
  selectedCategory = signal<string | null>(null);
  categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation'
  ];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  // --- Dynamic Form State (Questions) ---
  nextQuestionId = 2;
  nextAnswerId = 3;

  questions = signal<Question[]>([
    {
      id: 1,
      text: '',
      allowMultiple: false,
      answers: [
        { id: 1, text: '' },
        { id: 2, text: '' }
      ]
    }
  ]);

  // --- Helpers for Top Form Buttons ---
  clearTitle() { this.surveyTitle = ''; }
  clearDate() { this.surveyEndDate = ''; }
  clearDescription() { this.surveyDescription = ''; }

  // --- Form Logic ---
  addQuestion() {
    this.questions.update(qs => [
      ...qs,
      {
        id: this.nextQuestionId++,
        text: '',
        allowMultiple: false,
        answers: [
          { id: this.nextAnswerId++, text: '' },
          { id: this.nextAnswerId++, text: '' }
        ]
      }
    ]);
  }

  removeQuestion(id: number) {
    this.questions.update(qs => qs.filter(q => q.id !== id));
  }

  addAnswer(questionId: number) {
    this.questions.update(qs => qs.map(q => {
      if (q.id === questionId && q.answers.length < 6) {
        return { ...q, answers: [...q.answers, { id: this.nextAnswerId++, text: '' }] };
      }
      return q;
    }));
  }

  removeAnswer(questionId: number, answerId: number) {
    this.questions.update(qs => qs.map(q => {
      if (q.id === questionId) {
        return { ...q, answers: q.answers.filter(a => a.id !== answerId) };
      }
      return q;
    }));
  }

  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index); 
  }

  // Hilfsfunktion zur Überprüfung der Antworten pro Frage
  getValidAnswersCount(question: Question): number {
    return question.answers.filter(a => a.text.trim() !== '').length;
  }

  // --- Dropdown Logic ---
  toggleDropdown() {
    this.isDropdownOpen.update(open => !open);
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category); 
    this.isDropdownOpen.set(false);     
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.sortDropdownRef && !this.sortDropdownRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  async publishSurvey() {
    // Validierung aktivieren
    this.showValidationErrors.set(true);

    let hasErrors = false;

    // 1. Validierung: Titel und Kategorie
    if (!this.surveyTitle.trim() || !this.selectedCategory()) {
      hasErrors = true;
    }

    // 2. Validierung: Fragen und Antworten
    const formattedQuestions = [];
    for (const q of this.questions()) {
      const validAnswers = q.answers.filter(a => a.text.trim() !== '');
      
      if (!q.text.trim() || validAnswers.length < 2) {
        hasErrors = true;
      } else {
        formattedQuestions.push({
          text: q.text,
          allowMultiple: q.allowMultiple,
          answers: validAnswers
        });
      }
    }

    if (hasErrors || formattedQuestions.length === 0) {
      return;
    }

    const surveyData = {
      title: this.surveyTitle,
      description: this.surveyDescription,
      category: this.selectedCategory(),
      end_date: this.surveyEndDate ? new Date(this.surveyEndDate).toISOString() : null
    };

    this.isSubmitting.set(true);
    try {
      await this.supabaseService.createSurvey(surveyData, formattedQuestions);
      alert('Survey published successfully!');
      this.router.navigate(['/']); 
    } catch (error: any) {
      console.error('Database Error:', error);
      alert('Error publishing survey: ' + error.message);
    } finally {
      this.isSubmitting.set(false);
    }
     this.close.emit();
  }
}
import { Component, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports:[RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  isDropdownOpen = signal(false);
  selectedCategory = signal<string | null>(null);
  categories =[
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation'
  ];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  // --- Dynamic Form State ---
  nextQuestionId = 2;
  nextAnswerId = 3;

  questions = signal<Question[]>([
    {
      id: 1,
      text: '',
      allowMultiple: false,
      answers:[
        { id: 1, text: '' },
        { id: 2, text: '' }
      ]
    }
  ]);

  // --- Form Logic ---
  addQuestion() {
    this.questions.update(qs =>[
      ...qs,
      {
        id: this.nextQuestionId++,
        text: '',
        allowMultiple: false,
        answers:[
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
      // Limit to 6 answers maximum
      if (q.id === questionId && q.answers.length < 6) {
        return {
          ...q,
          answers:[...q.answers, { id: this.nextAnswerId++, text: '' }]
        };
      }
      return q;
    }));
  }

  removeAnswer(questionId: number, answerId: number) {
    this.questions.update(qs => qs.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: q.answers.filter(a => a.id !== answerId)
        };
      }
      return q;
    }));
  }

  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.
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

  
}
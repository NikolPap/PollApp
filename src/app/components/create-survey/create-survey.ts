import { Component, signal, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { ModalService } from '../../services/modal.service';
import { DropdownService } from '../../services/dropdown.service';
import { Question, Answer, SURVEY_CATEGORIES } from '../../models/survey.types';

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
  providers: [DropdownService]
})
export class CreateSurvey {
  private supabaseService = inject(SupabaseService);
  modalService = inject(ModalService);
  dropdown = inject(DropdownService);
  categories = SURVEY_CATEGORIES;

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  cancel() {
    this.modalService.isCreateSurveyOpen.set(false);
  }

  showToast = signal<boolean>(false);
  private toastTimeout: any;

  surveyTitle: string = '';
  surveyDescription: string = '';
  surveyEndDate: string = '';
  isSubmitting = signal<boolean>(false);
  showValidationErrors = signal<boolean>(false);

  nextQuestionId = 2;
  nextAnswerId = 3;

  questions = signal<Question[]>([
    { id: 1, text: '', allowMultiple: false, answers: [{ id: 1, text: '' }, { id: 2, text: '' }] }
  ]);

  clearTitle() { this.surveyTitle = ''; }
  clearDate() { this.surveyEndDate = ''; }
  clearDescription() { this.surveyDescription = ''; }

  toggleAllowMultiple(questionId: number, newValue: boolean) {
    this.questions.update(qs => qs.map(q => {
      if (q.id === questionId) {
        return { ...q, allowMultiple: newValue };
      }
      return q;
    }));
  }

  addQuestion() {
    this.questions.update(qs => [...qs, { id: this.nextQuestionId++, text: '', allowMultiple: false, answers: [{ id: this.nextAnswerId++, text: '' }, { id: this.nextAnswerId++, text: '' }] }]);
  }

  removeQuestion(id: number) { this.questions.update(qs => qs.filter(q => q.id !== id)); }

  addAnswer(questionId: number) {
    this.questions.update(qs => qs.map(q => q.id === questionId && q.answers.length < 6 ? { ...q, answers: [...q.answers, { id: this.nextAnswerId++, text: '' }] } : q));
  }

  removeAnswer(questionId: number, answerId: number) {
    this.questions.update(qs => qs.map(q => q.id === questionId ? { ...q, answers: q.answers.filter(a => a.id !== answerId) } : q));
  }

  getAnswerLetter(index: number): string { return String.fromCharCode(65 + index); }
  getValidAnswersCount(question: Question): number { return question.answers.filter(a => a.text.trim() !== '').length; }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.sortDropdownRef && !this.sortDropdownRef.nativeElement.contains(event.target as Node)) {
      this.dropdown.close();
    }
  }

  async publishSurvey() {
    this.showValidationErrors.set(true);
    let hasErrors = false;
    if (!this.surveyTitle.trim() || !this.dropdown.selectedItem()) hasErrors = true;

    const formattedQuestions = [];
    for (const q of this.questions()) {
      const validAnswers = q.answers.filter(a => a.text.trim() !== '');
      if (!q.text.trim() || validAnswers.length < 2) hasErrors = true;
      else formattedQuestions.push({ text: q.text, allowMultiple: q.allowMultiple, answers: validAnswers });
    }

    if (hasErrors || formattedQuestions.length === 0) return;

    const surveyData = {
      title: this.surveyTitle, 
      description: this.surveyDescription,
      category: this.dropdown.selectedItem(), // Παίρνουμε την τιμή από το Service
      end_date: this.surveyEndDate ? new Date(this.surveyEndDate).toISOString() : null
    };

    this.isSubmitting.set(true);
    try {
      await this.supabaseService.createSurvey(surveyData, formattedQuestions);
      this.showToast.set(true);
      this.toastTimeout = setTimeout(() => { this.closeToastAndReload(); }, 5000);
    } catch (error: any) {
      console.error('Database Error:', error);
      alert('Error publishing survey: ' + error.message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeToastAndReload() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.showToast.set(false);
    this.modalService.isCreateSurveyOpen.set(false);
    window.location.reload(); 
  }
}
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
  providers: [DropdownService],
})
export class CreateSurvey {
  private readonly supabaseService = inject(SupabaseService);
  readonly modalService = inject(ModalService);
  readonly dropdown = inject(DropdownService);

  categories = SURVEY_CATEGORIES;

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  showToast = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showValidationErrors = signal<boolean>(false);

  private toastTimeout: any;

  surveyTitle = '';
  surveyDescription = '';
  surveyEndDate = '';

  nextQuestionId = 2;
  nextAnswerId = 3;

  questions = signal<Question[]>([
    {
      id: 1, text: '', allowMultiple: false,
      answers: [{ id: 1, text: '' }, { id: 2, text: '' }],
    },
  ]);

  cancel() {
    this.modalService.isCreateSurveyOpen.set(false);
  }

  clearTitle() {
    this.surveyTitle = '';
  }

  clearDate() {
    this.surveyEndDate = '';
  }

  clearDescription() {
    this.surveyDescription = '';
  }

  toggleAllowMultiple(questionId: number, newValue: boolean) {
    this.questions.update((qs) =>
      qs.map((q) => (q.id === questionId ? { ...q, allowMultiple: newValue } : q)),
    );
  }

  addQuestion() {
    const newQuestion: Question = {
      id: this.nextQuestionId++,
      text: '',
      allowMultiple: false,
      answers: [
        { id: this.nextAnswerId++, text: '' },
        { id: this.nextAnswerId++, text: '' },
      ],
    };
    this.questions.update((qs) => [...qs, newQuestion]);
  }

  removeQuestion(id: number) {
    this.questions.update((qs) => qs.filter((q) => q.id !== id));
  }

  addAnswer(questionId: number) {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId && q.answers.length < 6
          ? { ...q, answers: [...q.answers, this.createEmptyAnswer()] }
          : q,
      ),
    );
  }

  removeAnswer(questionId: number, answerId: number) {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId ? { ...q, answers: q.answers.filter((a) => a.id !== answerId) } : q,
      ),
    );
  }

  private createEmptyAnswer(): Answer {
    return { id: this.nextAnswerId++, text: '' };
  }

  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getValidAnswersCount(question: Question): number {
    return question.answers.filter((a) => a.text.trim() !== '').length;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const clickedOutside =
      this.sortDropdownRef && !this.sortDropdownRef.nativeElement.contains(event.target as Node);
    if (clickedOutside) this.dropdown.close();
  }

  async publishSurvey() {
    this.showValidationErrors.set(true);

    const validation = this.validateSurvey();
    if (!validation.isValid) return;

    this.isSubmitting.set(true);

    try {
      await this.supabaseService.createSurvey(this.buildSurveyData(), validation.questions);
      this.showSuccessToast();
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private validateSurvey() {
    let hasErrors = false;

    // ΑΦΑΙΡΕΘΗΚΕ ο έλεγχος για το category! Ελέγχει μόνο το Title τώρα.
    if (!this.surveyTitle.trim()) {
      hasErrors = true;
    }

    const questions = this.formatQuestions();
    if (questions.length === 0) hasErrors = true;

    return { isValid: !hasErrors, questions };
  }

  private formatQuestions() {
    const formatted: any[] = [];
    for (const q of this.questions()) {
      const validAnswers = q.answers.filter((a) => a.text.trim() !== '');
      if (!q.text.trim() || validAnswers.length < 2) continue;
      formatted.push({
        text: q.text,
        allowMultiple: q.allowMultiple,
        answers: validAnswers,
      });
    }
    return formatted;
  }

  private buildSurveyData() {
    const payload: any = {
      title: this.surveyTitle,
      description: this.surveyDescription,
      end_date: this.surveyEndDate ? new Date(this.surveyEndDate).toISOString() : null,
    };

    // Αν έχει επιλεγεί category το βάζουμε στο payload, αλλιώς δεν το στέλνουμε καθόλου!
    if (this.dropdown.selectedItem()) {
      payload.category = this.dropdown.selectedItem();
    }

    return payload;
  }

  private showSuccessToast() {
    this.showToast.set(true);
    this.toastTimeout = setTimeout(() => {
      this.closeToastAndReload();
    }, 5000);
  }

  private handleError(error: any) {
    console.error('Database Error:', error);
    alert('Error publishing survey: ' + error.message);
  }

  closeToastAndReload() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.showToast.set(false);
    this.modalService.isCreateSurveyOpen.set(false);
    window.location.reload();
  }
}
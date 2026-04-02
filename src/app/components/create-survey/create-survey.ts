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
    { id: 1, text: '', allowMultiple: false, answers: [{ id: 1, text: '' }, { id: 2, text: '' }] }
  ]);

  /**
   * Closes the modal without saving
   */
  cancel() {
    this.modalService.isCreateSurveyOpen.set(false);
  }

  /**
   * Clears survey title input
   */
  clearTitle() {
    this.surveyTitle = '';
  }

  /**
   * Clears survey end date input
   */
  clearDate() {
    this.surveyEndDate = '';
  }

  /**
   * Clears survey description input
   */
  clearDescription() {
    this.surveyDescription = '';
  }

  /**
   * Toggles multiple answers option for a question
   */
  toggleAllowMultiple(questionId: number, newValue: boolean) {
    this.questions.update(qs =>
      qs.map(q =>
        q.id === questionId ? { ...q, allowMultiple: newValue } : q
      )
    );
  }

  /**
   * Adds a new question with default answers
   */
  addQuestion() {
    const newQuestion: Question = {
      id: this.nextQuestionId++,
      text: '',
      allowMultiple: false,
      answers: [
        { id: this.nextAnswerId++, text: '' },
        { id: this.nextAnswerId++, text: '' }
      ]
    };

    this.questions.update(qs => [...qs, newQuestion]);
  }

  /**
   * Removes a question by ID
   */
  removeQuestion(id: number) {
    this.questions.update(qs => qs.filter(q => q.id !== id));
  }

  /**
   * Adds a new answer to a question (max 6)
   */
  addAnswer(questionId: number) {
    this.questions.update(qs =>
      qs.map(q =>
        q.id === questionId && q.answers.length < 6
          ? { ...q, answers: [...q.answers, this.createEmptyAnswer()] }
          : q
      )
    );
  }

  /**
   * Removes an answer from a question
   */
  removeAnswer(questionId: number, answerId: number) {
    this.questions.update(qs =>
      qs.map(q =>
        q.id === questionId
          ? { ...q, answers: q.answers.filter(a => a.id !== answerId) }
          : q
      )
    );
  }

  /**
   * Generates a new empty answer object
   */
  private createEmptyAnswer(): Answer {
    return { id: this.nextAnswerId++, text: '' };
  }

  /**
   * Converts index to letter (A, B, C...)
   */
  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /**
   * Counts valid (non-empty) answers for a question
   */
  getValidAnswersCount(question: Question): number {
    return question.answers.filter(a => a.text.trim() !== '').length;
  }

  /**
   * Closes dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const clickedOutside =
      this.sortDropdownRef &&
      !this.sortDropdownRef.nativeElement.contains(event.target as Node);

    if (clickedOutside) this.dropdown.close();
  }

  /**
   * Handles survey publishing flow
   */
  async publishSurvey() {
    this.showValidationErrors.set(true);

    const validation = this.validateSurvey();
    if (!validation.isValid) return;

    this.isSubmitting.set(true);

    try {
      await this.supabaseService.createSurvey(
        this.buildSurveyData(),
        validation.questions
      );

      this.showSuccessToast();

    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Validates survey data and prepares formatted questions
   */
  private validateSurvey() {
    let hasErrors = false;

    if (!this.surveyTitle.trim() || !this.dropdown.selectedItem()) {
      hasErrors = true;
    }

    const questions = this.formatQuestions();
    if (questions.length === 0) hasErrors = true;

    return { isValid: !hasErrors, questions };
  }

  /**
   * Formats and filters valid questions & answers
   */
  private formatQuestions() {
    const formatted: any[] = [];

    for (const q of this.questions()) {
      const validAnswers = q.answers.filter(a => a.text.trim() !== '');

      if (!q.text.trim() || validAnswers.length < 2) continue;

      formatted.push({
        text: q.text,
        allowMultiple: q.allowMultiple,
        answers: validAnswers
      });
    }

    return formatted;
  }

  /**
   * Builds survey payload for API
   */
  private buildSurveyData() {
    return {
      title: this.surveyTitle,
      description: this.surveyDescription,
      category: this.dropdown.selectedItem(),
      end_date: this.surveyEndDate
        ? new Date(this.surveyEndDate).toISOString()
        : null
    };
  }

  /**
   * Displays success toast and schedules reload
   */
  private showSuccessToast() {
    this.showToast.set(true);

    this.toastTimeout = setTimeout(() => {
      this.closeToastAndReload();
    }, 5000);
  }

  /**
   * Handles API errors
   */
  private handleError(error: any) {
    console.error('Database Error:', error);
    alert('Error publishing survey: ' + error.message);
  }

  /**
   * Closes toast and reloads the page
   */
  closeToastAndReload() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.showToast.set(false);
    this.modalService.isCreateSurveyOpen.set(false);

    window.location.reload();
  }
}
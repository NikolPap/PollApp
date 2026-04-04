import { Component, signal, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { ModalService } from '../../services/modal.service';
import { DropdownService } from '../../services/dropdown.service';
import { Question, Answer, SURVEY_CATEGORIES, FormattedQuestion, Survey } from '../../models/survey.types';

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
  @ViewChild('dateElem') dateElem!: ElementRef<HTMLInputElement>;

  showToast = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showValidationErrors = signal<boolean>(false);

  private toastTimeout: ReturnType<typeof setTimeout> | undefined;

  surveyTitle = '';
  surveyDescription = '';
  surveyEndDate = '';

  nextQuestionId = 2;
  nextAnswerId = 3;

  questions = signal<Question[]>([
    {
      id: 1,
      text: '',
      allowMultiple: false,
      answers: [
        { id: 1, text: '' },
        { id: 2, text: '' },
      ],
    },
  ]);

  /**
   * Returns the minimum date/time (current moment) in ISO format.
   */
  get minDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Checks whether the selected date is invalid or in the past.
   */
  hasDateError(): boolean {
    const nativeInput = this.dateElem?.nativeElement;
    if (nativeInput && !nativeInput.validity.valid) {
      return true;
    }
    if (!this.surveyEndDate) {
      return false;
    }
    const selectedDate = new Date(this.surveyEndDate).getTime();
    if (isNaN(selectedDate)) return true;
    
    const now = new Date().getTime();
    return selectedDate < now;
  }

    /**
   * Closes the create survey modal.
   */
  cancel(): void {
    this.modalService.isCreateSurveyOpen.set(false);
  }

   /**
   * Clears the survey title input field.
   */
  clearTitle(): void {
    this.surveyTitle = '';
  }

   /**
   * Clears the survey end date.
   */
  clearDate(): void {
    this.surveyEndDate = '';
  }

/**
   * Clears the survey description field.
   */
  clearDescription(): void {
    this.surveyDescription = '';
  }

/**
   * Toggles whether a question allows multiple answers.
   */
  toggleAllowMultiple(questionId: number, newValue: boolean): void {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId ? { ...q, allowMultiple: newValue } : q
      ),
    );
  }

  /**
   * Adds a new empty question with two default answers.
   */
  addQuestion(): void {
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

  /**
   * Removes a question by its ID.
   */
  removeQuestion(id: number): void {
    this.questions.update((qs) => qs.filter((q) => q.id !== id));
  }

   /**
   * Adds a new answer to a specific question (max 6).
   */
  addAnswer(questionId: number): void {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId && q.answers.length < 6
          ? { ...q, answers: [...q.answers, this.createEmptyAnswer()] }
          : q,
      ),
    );
  }

 /**
   * Removes an answer from a specific question.
   */
  removeAnswer(questionId: number, answerId: number): void {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId
          ? { ...q, answers: q.answers.filter((a) => a.id !== answerId) }
          : q,
      ),
    );
  }

  /**
   * Creates a new empty answer with unique ID.
   */
  private createEmptyAnswer(): Answer {
    return { id: this.nextAnswerId++, text: '' };
  }

 /**
   * Returns A, B, C... based on index.
   */
  getAnswerLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

 /**
   * Counts valid (non-empty) answers in a question.
   */
  getValidAnswersCount(question: Question): number {
    return question.answers.filter((a) => a.text.trim() !== '').length;
  }

   /**
   * Closes dropdown when clicking outside.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const clickedOutside =
      this.sortDropdownRef &&
      !this.sortDropdownRef.nativeElement.contains(event.target as Node);

    if (clickedOutside) this.dropdown.close();
  }

 /**
   * Validates and submits the survey.
   */
  async publishSurvey(): Promise<void> {
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
    } catch (error: unknown) {
      this.handleError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

   /**
   * Validates survey fields and questions.
   */
  private validateSurvey(): { isValid: boolean; questions: FormattedQuestion[] } {
    let hasErrors = false;

    if (!this.surveyTitle.trim()) {
      hasErrors = true;
    }
    if (this.hasDateError()) {
      hasErrors = true;
    }

    const questions = this.formatQuestions();
    if (questions.length === 0) hasErrors = true;

    return { isValid: !hasErrors, questions };
  }

   /**
   * Formats valid questions for submission.
   */
  private formatQuestions(): FormattedQuestion[] {
    const formatted: FormattedQuestion[] = [];

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

 /**
   * Builds payload for API.
   */
  private buildSurveyData(): Partial<Survey> {
    const payload: Partial<Survey> = {
      title: this.surveyTitle,
      description: this.surveyDescription,
      end_date: this.surveyEndDate
        ? new Date(this.surveyEndDate).toISOString()
        : null,
    };

    if (this.dropdown.selectedItem()) {
      payload.category = this.dropdown.selectedItem()!;
    }

    return payload;
  }

  /**
   * Shows success toast and auto closes.
   */
  private showSuccessToast(): void {
    this.showToast.set(true);

    this.toastTimeout = setTimeout(() => {
      this.closeToastAndReload();
    }, 5000);
  }

 /**
   * Handles submission errors.
   */
  private handleError(error: unknown): void {
    console.error('Database Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    alert('Error publishing survey: ' + msg);
  }

  /**
   * Closes toast, modal and reloads page.
   */
  closeToastAndReload(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.showToast.set(false);
    this.modalService.isCreateSurveyOpen.set(false);
    window.location.reload();
  }
}
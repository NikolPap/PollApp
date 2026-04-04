import { Component, signal, computed, ElementRef, ViewChild, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';
import { DropdownService } from '../../services/dropdown.service';
import { SURVEY_CATEGORIES, Survey } from '../../models/survey.types';
import { SurveyFilterService } from '../../services/survey-filter.service';

@Component({
  selector: 'app-survey-list-filters',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-list-filters.html',
  styleUrl: './survey-list-filters.scss',
  providers: [DropdownService]
})
export class SurveyListFilters implements OnInit {
  // Dependencies
  private readonly supabaseService = inject(SupabaseService);
  private readonly surveyFilterService = inject(SurveyFilterService);
  readonly dropdown = inject(DropdownService);

  // Configuration Constants
  categories = ['All Categories', ...SURVEY_CATEGORIES];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  // State (typed properly)
  surveys = signal<Survey[]>([]);
  activeSurveys = signal<Survey[]>([]);
  pastSurveys = signal<Survey[]>([]);
  endingSoonSurveys = signal<Survey[]>([]);

  currentTab = signal<'active' | 'past'>('active');

  /**
   * Computed signal that filters active surveys based on the selected category.
   */
  filteredActiveSurveys = computed(() =>
    this.filterByCategory(this.activeSurveys())
  );

  /**
   * Computed signal that filters past surveys based on the selected category.
   */
  filteredPastSurveys = computed(() =>
    this.filterByCategory(this.pastSurveys())
  );

  /**
   * Initialization: Loads survey data on component start.
   */
  async ngOnInit(): Promise<void> {
    await this.loadSurveys();
  }

  /**
   * Fetches surveys from the database and categorizes them into 
   * active, past, and ending soon lists.
   */
  async loadSurveys(): Promise<void> {
    try {
      const data = await this.supabaseService.getSurveys();
      const now = new Date();

      this.surveys.set(data);

      this.activeSurveys.set(
        this.surveyFilterService.getActiveSurveys(data, now)
      );

      this.pastSurveys.set(
        this.surveyFilterService.getPastSurveys(data, now)
      );

      this.endingSoonSurveys.set(
        this.surveyFilterService.getEndingSoon(data, now)
      );

    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
  }

  /**
   * Filters a given survey array based on the current dropdown category selection.
   */
  private filterByCategory(surveys: Survey[]): Survey[] {
    const category = this.dropdown.selectedItem();

    if (!category || category === 'All Categories') {
      return surveys;
    }

    return surveys.filter(s => s.category === category);
  }

  /**
   * Closes the sort dropdown if a click is detected outside of the element.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const clickedOutside =
      this.sortDropdownRef &&
      !this.sortDropdownRef.nativeElement.contains(event.target as Node);

    if (clickedOutside) this.dropdown.close();
  }

  /**
   * Calculates the remaining days for a survey until its end date.
   */
  getDaysLeft(endDate: string | null): string {
    return this.surveyFilterService.getDaysLeft(endDate);
  }
}
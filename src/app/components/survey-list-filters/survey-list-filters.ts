import { Component, signal, computed, ElementRef, ViewChild, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';
import { DropdownService } from '../../services/dropdown.service';
import { SURVEY_CATEGORIES } from '../../models/survey.types';

@Component({
  selector: 'app-survey-list-filters',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-list-filters.html',
  styleUrl: './survey-list-filters.scss',
  providers: [DropdownService] 
})
export class SurveyListFilters implements OnInit {

  dropdown = inject(DropdownService);
  categories = ['All Categories', ...SURVEY_CATEGORIES];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  surveys = signal<any[]>([]);
  activeSurveys = signal<any[]>([]);
  pastSurveys = signal<any[]>([]);
  endingSoonSurveys = signal<any[]>([]);

  currentTab = signal<'active' | 'past'>('active');

  /**
   * Filters active surveys based on selected category
   */
  filteredActiveSurveys = computed(() => 
    this.filterByCategory(this.activeSurveys())
  );

  /**
   * Filters past surveys based on selected category
   */
  filteredPastSurveys = computed(() => 
    this.filterByCategory(this.pastSurveys())
  );

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Initializes survey loading
   */
  async ngOnInit() {
    await this.loadSurveys();
  }

  /**
   * Fetches surveys and categorizes them
   */
  async loadSurveys() {
    try {
      const data = await this.supabaseService.getSurveys();
      const now = new Date();

      this.surveys.set(data);
      this.activeSurveys.set(this.getActiveSurveys(data, now));
      this.pastSurveys.set(this.getPastSurveys(data, now));
      this.endingSoonSurveys.set(this.getEndingSoon(data, now));

    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
  }

  /**
   * Returns active surveys (not expired)
   */
  private getActiveSurveys(data: any[], now: Date) {
    return data.filter(s =>
      !s.end_date || new Date(s.end_date) >= now
    );
  }

  /**
   * Returns past surveys (expired)
   */
  private getPastSurveys(data: any[], now: Date) {
    return data.filter(s =>
      s.end_date && new Date(s.end_date) < now
    );
  }

  /**
   * Returns surveys ending within 3 days
   */
  private getEndingSoon(data: any[], now: Date) {
    const limit = this.getFutureDate(3);

    return this.getActiveSurveys(data, now)
      .filter(s =>
        s.end_date && new Date(s.end_date) <= limit
      )
      .sort((a, b) =>
        new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
      );
  }

  /**
   * Returns a future date by adding days
   */
  private getFutureDate(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Filters surveys by selected category
   */
  private filterByCategory(surveys: any[]) {
    const category = this.dropdown.selectedItem();

    if (!category || category === 'All Categories') {
      return surveys;
    }

    return surveys.filter(s => s.category === category);
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
   * Calculates remaining days until survey ends
   */
  getDaysLeft(endDate: string | null): string {
    if (!endDate) return 'No deadline';

    const diff = this.calculateDaysDifference(endDate);

    if (diff <= 0) return 'Ends today';
    if (diff === 1) return 'Ends in 1 day';

    return `Ends in ${diff} days`;
  }

  /**
   * Calculates day difference between now and a date
   */
  private calculateDaysDifference(endDate: string) {
    const diffTime =
      new Date(endDate).getTime() - new Date().getTime();

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
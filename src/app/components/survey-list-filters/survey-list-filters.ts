import { Component, signal, computed, ElementRef, ViewChild, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';
import { DropdownService } from '../../services/dropdown.service';
import { SURVEY_CATEGORIES } from '../../models/survey.types';
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
  private readonly supabaseService = inject(SupabaseService);
  private readonly surveyFilterService = inject(SurveyFilterService); // Inject της λογικής
  readonly dropdown = inject(DropdownService);

  categories = ['All Categories', ...SURVEY_CATEGORIES];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  surveys = signal<any[]>([]);
  activeSurveys = signal<any[]>([]);
  pastSurveys = signal<any[]>([]);
  endingSoonSurveys = signal<any[]>([]);

  currentTab = signal<'active' | 'past'>('active');

  filteredActiveSurveys = computed(() => this.filterByCategory(this.activeSurveys()));
  filteredPastSurveys = computed(() => this.filterByCategory(this.pastSurveys()));

  async ngOnInit() {
    await this.loadSurveys();
  }

  async loadSurveys() {
    try {
      const data = await this.supabaseService.getSurveys();
      const now = new Date();

      this.surveys.set(data);
      this.activeSurveys.set(this.surveyFilterService.getActiveSurveys(data, now));
      this.pastSurveys.set(this.surveyFilterService.getPastSurveys(data, now));
      this.endingSoonSurveys.set(this.surveyFilterService.getEndingSoon(data, now));

    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
  }

  private filterByCategory(surveys: any[]) {
    const category = this.dropdown.selectedItem();
    if (!category || category === 'All Categories') return surveys;
    return surveys.filter(s => s.category === category);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const clickedOutside =
      this.sortDropdownRef &&
      !this.sortDropdownRef.nativeElement.contains(event.target as Node);

    if (clickedOutside) this.dropdown.close();
  }

  getDaysLeft(endDate: string | null): string {
    return this.surveyFilterService.getDaysLeft(endDate);
  }
}
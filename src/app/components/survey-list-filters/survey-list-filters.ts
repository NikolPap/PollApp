import { Component, signal, computed, ElementRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-survey-list-filters',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-list-filters.html',
  styleUrl: './survey-list-filters.scss',
})
export class SurveyListFilters implements OnInit {

  isDropdownOpen = signal(false);
  selectedCategory = signal<string | null>(null);

  categories = [
    'All Categories',
    'Team Activities', 
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation'
  ];

  @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;

  // DATA
  surveys = signal<any[]>([]);
  activeSurveys = signal<any[]>([]);
  pastSurveys = signal<any[]>([]);
  endingSoonSurveys = signal<any[]>([]);

  currentTab = signal<'active' | 'past'>('active');

  // FILTERS
  filteredActiveSurveys = computed(() => {
    const category = this.selectedCategory();
    if (!category) return this.activeSurveys();
    return this.activeSurveys().filter(s => s.category === category);
  });

  filteredPastSurveys = computed(() => {
    const category = this.selectedCategory();
    if (!category) return this.pastSurveys();
    return this.pastSurveys().filter(s => s.category === category);
  });

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.loadSurveys();
  }

  async loadSurveys() {
    try {
      const data = await this.supabaseService.getSurveys();
      const now = new Date();

      const active = data.filter(s =>
        !s.end_date || new Date(s.end_date) >= now
      );

      const past = data.filter(s =>
        s.end_date && new Date(s.end_date) < now
      );

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const endingSoon = active
        .filter(s =>
          s.end_date && new Date(s.end_date) <= threeDaysFromNow
        )
        .sort((a, b) =>
          new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
        );

      this.surveys.set(data);
      this.activeSurveys.set(active);
      this.pastSurveys.set(past);
      this.endingSoonSurveys.set(endingSoon);

    } catch (err) {
      console.error('LOAD ERROR:', err);
    }
  }

  toggleDropdown() {
    this.isDropdownOpen.update(open => !open);
  }

  selectCategory(category: string) {
    if (category === 'All Categories') {
      this.selectedCategory.set(null);
    } else {
      this.selectedCategory.set(category);
    }
    this.isDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.sortDropdownRef && !this.sortDropdownRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  getDaysLeft(endDate: string | null): string {
    if (!endDate) return 'No deadline';

    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Ends today';
    if (diffDays === 1) return 'Ends in 1 day';
    return `Ends in ${diffDays} days`;
  }
}
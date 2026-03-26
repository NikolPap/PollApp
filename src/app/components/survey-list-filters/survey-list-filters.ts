import { Component,signal, ElementRef, ViewChild, HostListener } from '@angular/core';

@Component({
  selector: 'app-survey-list-filters',
  imports: [],
  templateUrl: './survey-list-filters.html',
  styleUrl: './survey-list-filters.scss',
})
export class SurveyListFilters {
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

import { Component, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-survey',
  imports: [RouterLink],
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

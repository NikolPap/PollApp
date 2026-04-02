import { Component, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from './layout/header/header';
import { ModalService } from './services/modal.service'; 
import { CreateSurvey } from './components/create-survey/create-survey'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Header, RouterOutlet, CreateSurvey], 
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  isWhiteBg = false;
  
  private router = inject(Router);
  modalService = inject(ModalService); 

 constructor() {
    // Listen to router events to detect navigation changes
    this.router.events.pipe(
      // Filter specifically for the end of a navigation cycle
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      /**
       * Check if the current URL contains 'surveyDetail'.
       * If it does, set isWhiteBg to true to apply specific styling.
       */
      this.isWhiteBg = event.urlAfterRedirects.includes('surveyDetail');
    });
  }
}
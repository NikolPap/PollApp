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
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isWhiteBg = event.urlAfterRedirects.includes('surveyDetail');
    });
  }
}
import { Component } from '@angular/core';
import { SurveyListFilters } from '../survey-list-filters/survey-list-filters';
import { HeroAndEnding } from '../hero-and-ending/hero-and-ending';

@Component({
  selector: 'app-survey-dashboard',
  imports: [SurveyListFilters, HeroAndEnding],
  templateUrl: './survey-dashboard.html',
  styleUrl: './survey-dashboard.scss',
})
export class SurveyDashboard {}

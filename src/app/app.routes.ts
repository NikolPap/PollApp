import { Routes } from '@angular/router';
import { SurveyDashboard } from './components/survey-dashboard/survey-dashboard';
import { SurveyDetail } from './components/survey-detail/survey-detail';

export const routes: Routes =[
    { path: '', component: SurveyDashboard },
    { path: 'surveyDetail/:id', component: SurveyDetail }
];
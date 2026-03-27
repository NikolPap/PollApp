import { Routes } from '@angular/router';
import { SurveyDashboard } from './components/survey-dashboard/survey-dashboard';
import { SurveyDetail } from './components/survey-detail/survey-detail';
import { CreateSurvey } from './components/create-survey/create-survey';

export const routes: Routes = [
    { path: '', component: SurveyDashboard },
    { path: 'surveyDetail', component: SurveyDetail },
    { path: 'createSurvey', component: CreateSurvey}
    

];

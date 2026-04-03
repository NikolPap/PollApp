import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SurveyFilterService {

  getActiveSurveys(data: any[], now: Date) {
    return data.filter(s => !s.end_date || new Date(s.end_date) >= now);
  }

  getPastSurveys(data: any[], now: Date) {
    return data.filter(s => s.end_date && new Date(s.end_date) < now);
  }

  getEndingSoon(data: any[], now: Date) {
    const date = new Date();
    date.setDate(date.getDate() + 3); // 3 days future limit
    const limit = date;

    return this.getActiveSurveys(data, now)
      .filter(s => s.end_date && new Date(s.end_date) <= limit)
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  }

  getDaysLeft(endDate: string | null): string {
    if (!endDate) return 'No deadline';
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diff <= 0) return 'Ends today';
    if (diff === 1) return 'Ends in 1 day';
    return `Ends in ${diff} days`;
  }
}
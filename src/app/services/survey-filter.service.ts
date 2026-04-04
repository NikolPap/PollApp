import { Injectable } from '@angular/core';
import { Survey } from '../models/survey.types';

@Injectable({
  providedIn: 'root'
})
export class SurveyFilterService {
  /**
   * Filters a list of surveys to return only those that are currently active.
   * A survey is active if it has no end date or if the end date is in the future.
   * @param data - The array of survey objects.
   * @param now - The current reference date.
   */
  getActiveSurveys(data: Survey[], now: Date): Survey[] {
    return data.filter(s => !s.end_date || new Date(s.end_date) >= now);
  }

   /**
   * Filters a list of surveys to return only those that have already expired.
   * @param data - The array of survey objects.
   * @param now - The current reference date.
   */
  getPastSurveys(data: Survey[], now: Date): Survey[] {
    return data.filter(s => s.end_date && new Date(s.end_date) < now);
  }

  /**
   * Identifies active surveys that are set to expire within the next 3 days.
   * Results are sorted by expiration date (closest first).
   * @param data - The array of survey objects.
   * @param now - The current reference date.
   */
  getEndingSoon(data: Survey[], now: Date): Survey[] {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 3);

    return this.getActiveSurveys(data, now)
      .filter(s => s.end_date && new Date(s.end_date) <= dateLimit)
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
  }

  /**
   * Calculates the human-readable string representing the time remaining 
   * until a survey's deadline.
   * @param endDate - The ISO date string or null.
   * @returns A formatted string (e.g., "Ends in 2 days", "Ends today").
   */
  getDaysLeft(endDate: string | null): string {
    if (!endDate) return 'No deadline';
    
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Ends today';
    if (diffDays === 1) return 'Ends in 1 day';
    
    return `Ends in ${diffDays} days`;
  }
}
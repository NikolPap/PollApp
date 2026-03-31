import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  isCreateSurveyOpen = signal<boolean>(false);
}
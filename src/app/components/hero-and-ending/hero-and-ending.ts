import { Component, inject } from '@angular/core';
import { ModalService } from '../../services/modal.service'; // Προσθήκη

@Component({
  selector: 'app-hero-and-ending',
  standalone: true,
  templateUrl: './hero-and-ending.html',
  styleUrl: './hero-and-ending.scss',
})
export class HeroAndEnding {
  modalService = inject(ModalService); 
}
import { Component, inject } from '@angular/core';
import { ModalService } from '../../services/modal.service';
import { NgOptimizedImage } from '@angular/common'; // Προσθήκη

@Component({
  selector: 'app-hero-and-ending',
  standalone: true,
  templateUrl: './hero-and-ending.html',
  styleUrl: './hero-and-ending.scss',
  imports: [NgOptimizedImage],
})
export class HeroAndEnding {
  modalService = inject(ModalService);
}

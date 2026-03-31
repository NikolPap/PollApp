import { Injectable, signal } from '@angular/core';

@Injectable() // ΔΕΝ βάζουμε το providedIn: 'root'
export class DropdownService {
  isOpen = signal<boolean>(false);
  selectedItem = signal<string | null>(null);

  toggle() {
    this.isOpen.update(val => !val);
  }

  close() {
    this.isOpen.set(false);
  }

  select(item: string | null) {
    this.selectedItem.set(item);
    this.isOpen.set(false); 
  }
}
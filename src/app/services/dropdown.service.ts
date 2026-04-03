import { Injectable, signal } from '@angular/core';
@Injectable()
export class DropdownService {
  isOpen = signal<boolean>(false);
  selectedItem = signal<string | null>(null);

  /**
   * Toggles the dropdown visibility state between open and closed.
   */
  toggle(): void {
    this.isOpen.update(val => !val);
  }

  /**
   * Explicitly closes the dropdown menu.
   */
  close(): void {
    this.isOpen.set(false);
  }

  /**
   * Updates the selected item and automatically closes the dropdown.
   * @param item - The string value to be selected, or null to clear selection.
   */
  select(item: string | null): void {
    this.selectedItem.set(item);
    this.isOpen.set(false); 
  }
}
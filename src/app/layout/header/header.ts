import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '../../services/modal.service'; // Προσθήκη

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
    path = '';
    private router = inject(Router);
    private routerSub: Subscription | undefined;
    modalService = inject(ModalService); // Προσθήκη

 ngOnInit() {
    // Set initial path value based on the current URL upon component initialization
    this.updatePath(this.router.url);

    // Subscribe to router events to keep 'path' in sync with navigation changes
    this.routerSub = this.router.events.subscribe((event) => {
      // Only react when a navigation cycle successfully completes
      if (event instanceof NavigationEnd) {
        this.updatePath(event.urlAfterRedirects);
      }
    });
  }

  /**
   * Helper method to map the full URL to a specific path identifier
   * @param url The current active URL string
   */
  private updatePath(url: string) {
    if (url === '/' || url === '') {
      this.path = '';
    } else if (url.includes('surveyDetail')) {
      this.path = 'surveyDetail';
    }
  }

  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks when the component is destroyed
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
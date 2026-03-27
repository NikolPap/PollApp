import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true, // Αν χρησιμοποιείς standalone components
  imports:[],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {


    path = '';
    private router = inject(Router);
    private routerSub: Subscription | undefined;

    ngOnInit() {
        this.updatePath(this.router.url);
        this.routerSub = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.updatePath(event.urlAfterRedirects);
            }
        });
    }

      private updatePath(url: string) {
    if (url === '/' || url === '') {
        this.path = '';
    } else if (url.includes('surveyDetail')) {
        this.path = 'surveyDetail';
    } else if (url.includes('createSurvey')) {
        this.path = 'createSurvey';
    }
}

    ngOnDestroy() {
        if (this.routerSub) {
            this.routerSub.unsubscribe();
        }
    }
}
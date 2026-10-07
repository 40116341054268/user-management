import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { PersianPaginatorIntl } from './shared/persian-paginator-intl';
import { routes } from './app.routes';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideNativeDateAdapter(),
    { provide: MatPaginatorIntl, useClass: PersianPaginatorIntl },
    provideCharts(withDefaultRegisterables()),
  ],
};

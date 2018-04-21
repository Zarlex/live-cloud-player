import 'backbone';
import 'underscore';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import {MainModule} from './app/modules/main/main.module';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(MainModule);

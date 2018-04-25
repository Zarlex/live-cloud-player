import './rxjs-extensions';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {NgModule} from '@angular/core';
import {MainComponent} from './components/main/main.component';
import {BackboneModule} from '../backbone/backbone.module';
import {SharedModule} from '../shared/shared.module';
import {PlayerModule} from '../player/player.module';
import {MainRoutingModule} from './main.routes';
import {TvComponent} from './components/tv/tv';
import {UserAnalyticsModule} from '../user-analytics/user-analytics.module';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    BackboneModule,
    SharedModule,
    PlayerModule,
    MainRoutingModule,
    UserAnalyticsModule
  ],
  declarations: [
    MainComponent,
    TvComponent
  ],
  providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
  bootstrap: [MainComponent]
})
export class MainModule {
}

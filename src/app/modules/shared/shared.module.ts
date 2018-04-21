import {NgModule} from '@angular/core';
import {HumanReadableSecondsPipe} from './pipes/h-readable-seconds.pipe';
import {BrowserModule} from '@angular/platform-browser';
import {BackboneModule} from '../backbone/backbone.module';
import {FormsModule} from '@angular/forms';
import {TimeAgoDirective} from './directives/time-ago.directive';
import {KMilShortenerPipe} from './pipes/k-mil-shortener.pipe';

import {LimitCollectionresultsPipe} from './pipes/limit-collection-results.pipe';
import {FullScreenService} from './services/fullscreen.service';
import {TrackCoverComponent} from './components/track-cover/track-cover.component';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    BackboneModule
  ],
  declarations: [
    TimeAgoDirective,
    HumanReadableSecondsPipe,
    KMilShortenerPipe,
    LimitCollectionresultsPipe,
    TrackCoverComponent
  ],
  exports: [
    TimeAgoDirective,
    HumanReadableSecondsPipe,
    KMilShortenerPipe,
    LimitCollectionresultsPipe,
    TrackCoverComponent
  ],
  providers: [
    HumanReadableSecondsPipe,
    FullScreenService
  ]
})
export class SharedModule {
}

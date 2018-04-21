import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {SharedModule} from '../shared/shared.module';
import {PlayerManagerComponent} from './components/player-manager/player-manager';
import {YoutubePlayerComponent} from './components/youtube-player/youtube-player';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    SharedModule
  ],
  declarations: [
    YoutubePlayerComponent,
    PlayerManagerComponent
  ],
  exports: [
    PlayerManagerComponent
  ]
})
export class PlayerModule {
}

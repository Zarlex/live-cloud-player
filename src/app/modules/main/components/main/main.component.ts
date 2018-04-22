import {Component, ViewEncapsulation} from '@angular/core';
import {ITrack} from '../../../api/tracks/track.interface';

@Component({
  selector: 'app-cloud-radio',
  templateUrl: './main.template.html',
  styleUrls: ['./main.style.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MainComponent {
  public location: string;
  public label: string;
  public markers: Array<{ latitude: number, longitude: number }> = [];
  public highlightMarker: { latitude: number, longitude: number };
  public timezoneOffset: number;

  public setLocation(location: string) {
    this.location = location;
  }

  public setLabel(country: string) {
    this.label = country;
  }

  public setMarkers(markers: Array<{ latitude: number, longitude: number }>) {
    this.markers = markers;
  }

  public setSelectedTrack(track: ITrack) {
    if (track) {
      this.highlightMarker = {latitude: track.location.latitude, longitude: track.location.longitude};
    } else {
      this.highlightMarker = null;
    }
  }

  public setTimezoneOffset(offset: number) {
    this.timezoneOffset = offset;
  }
}

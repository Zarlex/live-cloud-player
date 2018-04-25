import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {ITrack} from '../../../api/tracks/track.interface';
import {UserAnalyticsService} from '../../../user-analytics/services/user-analytics.service';

@Component({
  selector: 'app-cloud-radio',
  templateUrl: './main.template.html',
  styleUrls: ['./main.style.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MainComponent implements OnInit{
  private _tmpLocation: { latitude: number, longitude: number };
  public location: { latitude: number, longitude: number };
  public label: string;
  public markers: Array<{ latitude: number, longitude: number }> = [];
  public highlightMarker: { latitude: number, longitude: number };
  public introVisible = true;

  constructor(private userAnalyticsService: UserAnalyticsService){}

  public setLocation(location: { latitude: number, longitude: number }) {
    if(this.introVisible){
      this._tmpLocation = location;
    } else {
      this.location = location;
    }
  }

  public setLabel(country: string) {
    this.userAnalyticsService.trackEvent('country-change',country);
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

  public startSearching(){
    this.introVisible = false;
    if(this._tmpLocation){
      this.location = this._tmpLocation;
      this.userAnalyticsService.trackEvent('start-exploring','click');
    }
  }

  ngOnInit(){
    this.userAnalyticsService.trackEvent('start','ngOnInit');
  }
}

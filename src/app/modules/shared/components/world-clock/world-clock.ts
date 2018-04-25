import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {ApiKeys} from '../../../../../api-keys';
const moment = require('moment-timezone');

@Component({
  selector: 'app-world-clock',
  styleUrls: ['./world-clock.scss'],
  templateUrl: './world-clock.html'
})
export class WorldClockComponent implements OnInit, OnChanges {
  private zoneName: string;
  public ts: string;

  @Input()
  public location: { latitude: number, longitude: number };

  constructor(private http: HttpClient) {
  }

  private fetchTimezoneOffset(origin: { latitude: number, longitude: number }) {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('key', ApiKeys.timezoneDbKey);
    httpParams = httpParams.set('by', 'position');
    httpParams = httpParams.set('format', 'json');
    httpParams = httpParams.set('lat', origin.latitude.toString());
    httpParams = httpParams.set('lng', origin.longitude.toString());
    this.http.get(`https://api.timezonedb.com/v2/get-time-zone`, {
      params: httpParams
    }).toPromise().then((rsp: any) => {
      this.zoneName = rsp.zoneName;
    });
  }

  private updateClock() {
    if (this.zoneName) {
      const localeDate = moment.tz(new Date(), this.zoneName);
      this.ts = localeDate.format('HH:mm:ss');
    }
  }

  ngOnInit(): void {
    setInterval(this.updateClock.bind(this), 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.location) {
      this.fetchTimezoneOffset(this.location);
    }
  }
}

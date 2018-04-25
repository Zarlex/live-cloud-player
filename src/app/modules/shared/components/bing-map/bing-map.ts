import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {ApiKeys} from '../../../../../api-keys';

@Component({
  selector: 'app-bing-map',
  styleUrls: ['./bing-map.scss'],
  templateUrl: './bing-map.html'
})
export class BingMapComponent implements OnInit, OnChanges {
  private _bingApiReady = false;
  private _map: Microsoft.Maps.Map;
  private _markers: Array<Microsoft.Maps.Polygon>;
  private _scannerLines: Array<Microsoft.Maps.Polyline>;
  private _highlightMarker: Microsoft.Maps.Polygon;
  private _polygons: Array<Microsoft.Maps.Polygon>;
  private _radarCircle: Array<Microsoft.Maps.Location>;

  @Input()
  markers: Array<{ latitude: number, longitude: number }>;

  @Input()
  highlightMarker: { latitude: number, longitude: number };

  @Output()
  locationChange: EventEmitter<{ latitude: number, longitude: number }>;

  @Output()
  labelChange: EventEmitter<string>;

  constructor(private http: HttpClient) {
    this.locationChange = new EventEmitter();
    this.labelChange = new EventEmitter<string>();
    this._markers = [];
    this._polygons = [];
  }

  private initialiseBingSDK(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const bingElId = 'bingMapJsSdk';
      const bingScriptEl = document.getElementById(bingElId);
      if (this._bingApiReady) {
        resolve(true);
      } else {
        (<any>window).GetMap = () => {
          this._bingApiReady = true;
          resolve(true);
        };
        let js: HTMLScriptElement;
        const scripts = document.getElementsByTagName('script')[0];
        js = document.createElement('script');
        js.id = bingElId;
        js.src = `//www.bing.com/api/maps/mapcontrol?callback=GetMap&setMkt=en-US&setLang=en&key=${ApiKeys.microsoftKey}`;
        scripts.parentNode.insertBefore(js, bingScriptEl);
      }
    });
  }

  private getCircle(radius: number, origin: { latitude: number, longitude: number }): Array<any> {
    const locs = [];
    const earthRadius = 6371;
    const angDist = radius / earthRadius;
    const radPerDeg = Math.PI / 180;
    const lat = origin.latitude * radPerDeg;
    const lon = origin.longitude * radPerDeg;
    for (let x = 0; x <= 360; x++) { //making a 360-sided polygon
      let pLatitude, pLongitude;
      // With a nice, flat earth we could just say p2.Longitude = lon * sin(brng) and p2.Latitude = lat * cos(brng)
      // But it ain't, so we can't.  See http://www.movable-type.co.uk/scripts/latlong.html
      const brng = x * radPerDeg;
      pLatitude = Math.asin(Math.sin(lat) * Math.cos(angDist) + Math.cos(lat) * Math.sin(angDist) * Math.cos(brng)); //still in radians
      pLongitude = lon + Math.atan2(Math.sin(brng) * Math.sin(angDist) * Math.cos(lat), Math.cos(angDist) - Math.sin(lat) * Math.sin(pLatitude));
      pLatitude = pLatitude / radPerDeg;
      pLongitude = pLongitude / radPerDeg;
      locs.push(new Microsoft.Maps.Location(pLatitude, pLongitude));
    }
    return locs;
  }

  private drawScanner(origin: { latitude: number, longitude: number }, circle: Array<{ latitude: number, longitude: number }>, at: number) {
    if (at > circle.length) {
      at = circle.length;
    }
    this._scannerLines = [];
    const coords = [new Microsoft.Maps.Location(origin.latitude, origin.longitude), new Microsoft.Maps.Location(circle[at].latitude, circle[at].longitude)];

    //Create a polyline
    const line = new Microsoft.Maps.Polyline(coords, {
      strokeColor: '#00e13c',
      strokeThickness: 3,
      strokeDashArray: [4, 4]
    });
    this._scannerLines.push(line);
    this.drawPolygons();
  }

  private drawCircle(radius: number, origin: { latitude: number, longitude: number }) {
    this._radarCircle = this.getCircle(radius, origin);
    const bigCircleOptions = {
      visible: true,
      strokeThickness: 2,
      strokeDashArray: "1",
      fillColor: new Microsoft.Maps.Color(50, 0, 225, 60),
      strokeColor: new Microsoft.Maps.Color(200, 0, 225, 60)
    };
    const smallCircle = this.getCircle(50, origin);
    const smallCircleOptions = {
      visible: true,
      strokeThickness: 2,
      strokeDashArray: "1",
      fillColor: new Microsoft.Maps.Color(1000, 0, 225, 60),
      strokeColor: new Microsoft.Maps.Color(1000, 0, 225, 60)
    };
    this._polygons = [];
    this._polygons.push(new Microsoft.Maps.Polygon(this._radarCircle, bigCircleOptions));
    this._polygons.push(new Microsoft.Maps.Polygon(smallCircle, smallCircleOptions));
    this.drawPolygons();
  };

  private drawMarkers() {
    this._markers = [];
    this.markers.forEach((marker) => {
      const smallCircle = this.getCircle(50, {latitude: marker.latitude, longitude: marker.longitude});
      const smallCircleOptions = {
        visible: true,
        strokeThickness: 2,
        strokeDashArray: "1",
        fillColor: new Microsoft.Maps.Color(200, 200, 0, 0),
        strokeColor: new Microsoft.Maps.Color(200, 200, 0, 0)
      };
      this._markers.push(new Microsoft.Maps.Polygon(smallCircle, smallCircleOptions));
    });
    this.drawPolygons();
  }

  private drawHighlightMarker() {
    this._highlightMarker = null;
    if (this.highlightMarker) {
      const smallCircle = this.getCircle(50, {
        latitude: this.highlightMarker.latitude,
        longitude: this.highlightMarker.longitude
      });
      const smallCircleOptions = {
        visible: true,
        strokeThickness: 4,
        strokeDashArray: "0",
        fillColor: new Microsoft.Maps.Color(255, 200, 0, 0),
        strokeColor: new Microsoft.Maps.Color(255, 255, 255, 255)
      };
      this._highlightMarker = new Microsoft.Maps.Polygon(smallCircle, smallCircleOptions);
    }
    this.drawPolygons();
  }

  private drawPolygons() {
    if (this._map) {
      this._map.entities.clear();
      this._polygons.forEach((polygon) => {
        this._map.entities.push(polygon);
      });
      this._markers.forEach((polygon) => {
        this._map.entities.push(polygon);
      });
      if (this._highlightMarker) {
        this._map.entities.push(this._highlightMarker);
      }
      if (this._scannerLines) {
        this._scannerLines.forEach((polyline) => {
          this._map.entities.push(polyline);
        })
      }
    }
  }

  private fetchLocationName(origin: { latitude: number, longitude: number }) {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('key', ApiKeys.microsoftKey);
    httpParams = httpParams.set('includeEntityTypes', 'CountryRegion');
    httpParams = httpParams.set('includeNeighborhood', 'true');
    this.http.get(`https://dev.virtualearth.net/REST/v1/Locations/${origin.latitude},${origin.longitude}`, {
      params: httpParams
    }).toPromise().then((rsp: any) => {
      if (rsp.resourceSets && rsp.resourceSets[0] && rsp.resourceSets[0].resources.length > 0) {
        this.labelChange.emit(rsp.resourceSets[0].resources[0].address.countryRegion);
      } else {
        this.labelChange.emit('');
      }
    });
  }

  private scan(iteration: number = 0) {
    if (this._map && this._radarCircle) {
      this.drawScanner(this._map.getCenter(), this._radarCircle, iteration);
    }
    window.requestAnimationFrame(() => {
      if (iteration < 360) {
        iteration = iteration += 3;
        this.scan(iteration)
      } else {
        this._scannerLines = null;
        this.drawPolygons();
        window.setTimeout(this.scan.bind(this), 3000);
      }
    });
  }

  ngOnInit(): void {
    this.initialiseBingSDK().then(() => {
      this._map = new Microsoft.Maps.Map(document.getElementById('myMap'), {
        //center: new Microsoft.Maps.Location(47.616343, -122.203177),
        mapTypeId: Microsoft.Maps.MapTypeId.grayscale,
        showDashboard: false,
        maxZoom: 4,
        minZoom: 4,
        customMapStyle: {
          elements: {
            area: {fillColor: '#fff', labelVisible: false},
            water: {fillColor: '#006994', labelVisible: false},
            tollRoad: {fillColor: '#fff', strokeColor: '#fff', labelVisible: false},
            arterialRoad: {fillColor: '#ffffff', strokeColor: '#ffffff', labelVisible: false},
            road: {fillColor: '#ffffff', strokeColor: '#ffffff', labelVisible: false},
            street: {fillColor: '#ffffff', strokeColor: '#ffffff', labelVisible: false},
            transit: {fillColor: '#fff', labelVisible: false},
          },
          version: '1'
        },
      });

      Microsoft.Maps.Events.addHandler(this._map, 'viewchange', (e) => {
        const center = this._map.getCenter();
        this.drawCircle(800, center);
      });

      Microsoft.Maps.Events.addHandler(this._map, 'viewchangeend', (e) => {
        const center = this._map.getCenter();
        this.drawCircle(800, center);
        this.fetchLocationName(center);
        this.locationChange.emit({latitude: center.latitude, longitude: center.longitude});
      });
    });

    this.scan();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.markers) {
      this.drawMarkers();
    }

    if (changes.highlightMarker) {
      this.drawHighlightMarker();
    }
  }
}

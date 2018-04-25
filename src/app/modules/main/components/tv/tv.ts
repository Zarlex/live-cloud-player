import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {PlayQueue} from '../../../player/collections/play-queue';
import {PlayQueueItem} from '../../../player/models/play-queue-item';
import {PlayQueueItemStatus} from '../../../player/src/playqueue-item-status.enum';
import {TracksYoutubeCollection} from '../../../api/tracks/tracks-youtube.collection';
import {TrackYoutubeModel} from '../../../api/tracks/track-youtube.model';
import {ITrack} from '../../../api/tracks/track.interface';
import set = Reflect.set;

@Component({
  selector: 'app-tv',
  templateUrl: './tv.html',
  styleUrls: ['./tv.scss'],
})
export class TvComponent implements OnInit, OnChanges, AfterViewInit {
  private ready = false;
  private interval;
  public playQueue: PlayQueue<PlayQueueItem>;
  public playerVolume = 100;
  public tracks: TracksYoutubeCollection<TrackYoutubeModel>;
  public markers: Array<{ latitude: number, longitude: number }>;
  public ts: string;
  public title: string;

  @Input()
  showPlayer: boolean;

  @Input()
  location: { latitude: number, longitude: number };

  @Input()
  gmtOffset: number;

  @Output()
  markersChange: EventEmitter<Array<{ latitude: number, longitude: number }>>;

  @Output()
  selectedTrackChange: EventEmitter<ITrack>;

  constructor() {
    this.playQueue = new PlayQueue();
    this.tracks = new TracksYoutubeCollection();
    this.markers = [];
    this.markersChange = new EventEmitter();
    this.selectedTrackChange = new EventEmitter();
  }

  private addAllTracks() {
    console.log('ADD ALL');
    this.markers = [];
    this.playQueue.toJSON().forEach((item) => {
      if (!this.tracks.get(item.id)) {
        this.playQueue.remove(this.playQueue.get(item.id));
      }
    });
    this.tracks.each((track: ITrack) => {
      if (!this.playQueue.get(track.id)) {
        this.playQueue.add({
          provider: 'youtube',
          track: track
        }, {at: 0});
      }
      if(track.location && track.location.latitude && track.location.longitude){
        this.markers.push({
          latitude: track.location.latitude,
          longitude: track.location.longitude
        });
      }
    });
    this.markersChange.emit(this.markers);
  }

  private getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
  }

  private fetchTracks() {
    const location = `${this.location.latitude},${this.location.longitude}`;
    this.tracks.queryParams.location = location;
    this.tracks.queryParams.locationRadius = this.getRandomIntInclusive(500,600)+'km';
    console.log(location);
    this.tracks.fetch({reset: true}).then(this.addAllTracks.bind(this));
  }

  private onLocationChange() {
    if (this.ready) {
      this.fetchTracks();
      if (this.interval) {
        clearInterval(this.interval);
      }
      this.interval = setInterval(this.fetchTracks.bind(this), 15000);
    }
  }

  public setSelectedTrack(track: ITrack) {
    this.selectedTrackChange.emit(track);
    if (track) {
      this.title = track.title;
    } else {
      this.title = null;
    }
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.playQueue.addAndPlay({
      provider: 'youtube',
      track: {
        id: 'abc'
      }
    });
    setTimeout(() => {
      this.ready = true;
      if (this.location) {
        this.onLocationChange();
      }
    }, 1000)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.location && changes.location.currentValue) {
      this.onLocationChange();
    }
  }
}

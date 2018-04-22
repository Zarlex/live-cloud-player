import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {PlayQueue} from '../../../player/collections/play-queue';
import {PlayQueueItem} from '../../../player/models/play-queue-item';
import {PlayQueueItemStatus} from '../../../player/src/playqueue-item-status.enum';
import {TracksYoutubeCollection} from '../../../api/tracks/tracks-youtube.collection';
import {TrackYoutubeModel} from '../../../api/tracks/track-youtube.model';
import {ITrack} from '../../../api/tracks/track.interface';
import set = Reflect.set;
const moment = require('moment-timezone');

@Component({
  selector: 'app-tv',
  templateUrl: './tv.html',
  styleUrls: ['./tv.scss'],
})
export class TvComponent implements OnInit, OnChanges, AfterViewInit {
  private ready = false;
  private interval;
  public playQueue: PlayQueue<PlayQueueItem>;
  public isLoading = false;
  public playerVolume = 100;
  public tracks: TracksYoutubeCollection<TrackYoutubeModel>;
  public markers: Array<{ latitude: number, longitude: number }>;
  public ts: string;
  public title: string;

  @Input()
  showPlayer: boolean;

  @Input()
  location: string;

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
    this.markers = [];
    this.playQueue.toJSON().forEach((item) => {
      if (!this.tracks.get(item.id)) {
        this.playQueue.remove(this.playQueue.get(item.id));
      }
    });
    this.tracks.each((track: ITrack) => {
      this.playQueue.add({
        provider: 'youtube',
        track: track
      });
      this.markers.push({
        latitude: track.location.latitude,
        longitude: track.location.longitude
      });
    });
    this.markersChange.emit(this.markers);
  }

  private fetchTracks(){
    this.tracks.queryParams.location = this.location;
    this.tracks.queryParams.radius = '1000km';
    this.tracks.fetch({reset: true}).then(this.addAllTracks.bind(this));
  }

  private onLocationChange() {
    if (this.ready) {
      this.fetchTracks();
      if(this.interval){
        clearInterval(this.interval);
      }
      this.interval = setInterval(this.fetchTracks.bind(this),10000);
    }
  }

  private calcTime() {
    if(this.gmtOffset){
      const localeDate = moment.tz(new Date(), this.gmtOffset);
      this.ts = localeDate.format('HH:mm:ss');
    }
  }

  public setSelectedTrack(track: ITrack){
    this.selectedTrackChange.emit(track);
    if(track){
      this.title = track.title;
    } else {
      this.title = null;
    }
  }

  ngOnInit() {
    setInterval(this.calcTime.bind(this), 1000);
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
    },1000)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.location && changes.location.currentValue) {
      this.onLocationChange();
    }

    if (changes.gmtOffset && changes.gmtOffset.currentValue) {
      console.log(changes.gmtOffset);
      this.calcTime();
    }
  }
}

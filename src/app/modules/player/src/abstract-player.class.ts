import {Observable} from 'rxjs/Observable';
import {ElementRef, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {isNumber, throttle} from 'underscore';
import {PlayerStatus} from './player-status.enum';
import {EaseService} from '../../shared/services/ease.service';
import {IPlayerOptions, IPlayerSize} from './player.interface';
import {ITrack} from '../../api/tracks/track.interface';

export abstract class AbstractPlayer implements OnInit {
  private _duration: number;
  private _currentTime: number;
  private _volume: number;
  private _status: PlayerStatus;
  private _ableToPlay: boolean;
  private _initialised = false;
  private _initialisePromise: Promise<any>;
  private _subscriptionsPerState = {};
  private _viewReadyPromise: Promise<any>;
  private _viewReadyResolver: Function;
  private _ngOnInitCompleted = false;
  private _playerIsInitialised = false;
  private _playerSdkIsInitialised = false;
  private _allowedToPlay = false;
  private _initialiseCallbacks: Function[] = [];
  private _size: IPlayerSize = {width: 0, height: 0};
  private _error: string;
  private _throttledTimeUpdate = throttle(this.emitTimeChange.bind(this), 900);
  private _forcePlayStart = false;
  private _forcePlayStartTry = 0;

  @Input()
  public track: ITrack;

  @Output()
  public durationChange = new EventEmitter();

  @Output()
  public currentTimeChange = new EventEmitter();

  @Output()
  public statusChange = new EventEmitter();

  protected abstract initialisePlayerSDK(): Promise<any>;

  protected abstract initialisePlayer(options?: IPlayerOptions): Promise<any>;

  protected abstract deInitialisePlayer(): void;

  protected abstract bindListeners(): void;

  protected abstract unBindListeners(): void;

  protected abstract setPlayerVolume(volume: number): void;

  protected abstract setPlayerSize(size: IPlayerSize): void;

  protected abstract startPlayer(): void;

  protected abstract pausePlayer(): void;

  protected abstract stopPlayer(): void;

  protected abstract seekPlayerTo(to: number): void;

  protected abstract preloadTrack(track: ITrack, startTime?: number): void;

  protected abstract getPlayerEl(): ElementRef;

  constructor() {
    this._viewReadyPromise = new Promise((resolve) => {
      this._viewReadyResolver = resolve;
    });
  }

  protected setDuration(duration: number) {
    if (isNumber(duration) && duration > 0) {
      this._duration = duration;
      this.durationChange.emit(duration);
    }
  }

  public getDuration(): number {
    return this._duration;
  }

  private emitTimeChange(time: number) {
    this.currentTimeChange.emit(time);
  }

  protected setCurrentTime(currentTime: number): void {
    if (isNumber(currentTime) && currentTime > 0) {
      this._currentTime = currentTime;
      this._throttledTimeUpdate(currentTime);
    }
  }

  public getCurrentTime(): number {
    return this._currentTime;
  }

  protected setStatus(status: PlayerStatus) {
    if (this._status !== status) {
      this._status = status;
      this.statusChange.emit(status);
    }
  }

  public getStatus(): PlayerStatus {
    return this._status;
  }

  public setVolume(volume: number): void {
    this._volume = volume;
    if (this._initialised) {
      this.setPlayerVolume(volume);
    }
  }

  public getVolume(): number {
    return this._volume;
  }

  public setSize(size: IPlayerSize) {
    this._size = size;
    this.executeOnInitialised(() => {
      this.setPlayerSize(size);
    });
  }

  protected setAllowedToPlay(isAllowed: boolean): void {
    this._allowedToPlay = isAllowed;
  }

  public isAllowedToPlay(): boolean {
    return this._allowedToPlay;
  }

  protected setAbleToPlay(isAble: boolean): void {
    this._ableToPlay = isAble;
  }

  public isAbleToPlay(): boolean {
    return this._ableToPlay;
  }

  protected onDurationUpdate(duration: number) {
    this.setDuration(duration);
  }

  protected onCurrentTimeUpdate(currentTime: number) {
    this.setCurrentTime(currentTime);
  }

  protected onIsAbleToPlay() {
    this.setAbleToPlay(true);
  }

  protected onWaiting() {
    this.setStatus(PlayerStatus.Waiting);
  }

  protected onReady() {
    this.setStatus(PlayerStatus.Ready);
  }

  protected onPlaying() {
    this.setAbleToPlay(true);
    if (!this.isAllowedToPlay()) {
      this.pause();
    } else {
      this._forcePlayStart = false;
      this._forcePlayStartTry = 0;
      this.setStatus(PlayerStatus.Playing);
    }
    this._error = null;
  }

  protected onPaused() {
    if (this._forcePlayStart && this._forcePlayStartTry < 5 && this._currentTime !== this._duration) {
      this._forcePlayStartTry++;
      this.play();
    } else {
      this._forcePlayStartTry = 0;
      this.setStatus(PlayerStatus.Paused);
    }
  }

  protected onEnded() {
    this.setStatus(PlayerStatus.Ended);
  }

  protected onStopped() {
    this.setStatus(PlayerStatus.Stopped);
  }

  protected onError(err?: string) {
    if (!navigator.onLine) {
      const onlineListener = () => {
        window.removeEventListener('online', onlineListener);
        this.preload();
        this.seekPlayerTo(this.getCurrentTime());
        this.play();
      };
      window.addEventListener('online', onlineListener.bind(this));
      this.setStatus(PlayerStatus.Waiting);
    } else {
      if (err) {
        this._error = err.toString();
      } else {
        this._error = 'The player could not be started because an error occurred';
      }
      this.setStatus(PlayerStatus.Error);
    }
  }

  private resolveOnStatus(requiredStatus: PlayerStatus): Promise<any> {
    if (!this._subscriptionsPerState[requiredStatus]) {
      this._subscriptionsPerState[requiredStatus] = new Promise((resolve) => {
        if (this.getStatus() === requiredStatus) {
          resolve();
          this._subscriptionsPerState[requiredStatus] = null;
        } else {
          const subscription = this.statusChange
            .filter(newState => newState === requiredStatus)
            .subscribe(() => {
              resolve();
              subscription.unsubscribe();
              this._subscriptionsPerState[requiredStatus] = null;
            });
        }
      });
    }

    return this._subscriptionsPerState[requiredStatus];
  }

  private resolveOnOneOfStatus(requiredStates: PlayerStatus[]): Promise<any> {
    const promises = [];
    requiredStates.forEach((status) => {
      promises.push(this.resolveOnStatus(status));
    });
    return Promise.race(promises);
  }

  private executeInitialisingQueue(promiseQueue: Function[]) {
    if (promiseQueue.length > 0) {
      const promise = promiseQueue.shift();
      return Promise.resolve(promise.apply(this)).then(() => {
        return this.executeInitialisingQueue(promiseQueue);
      });
    } else {
      return Promise.resolve();
    }
  }

  private waitForViewReady(): Promise<any> {
    return this._viewReadyPromise;
  }

  private executeOnInitialised(callback: Function) {
    if (this._initialised) {
      callback.apply(this);
    } else {
      this._initialiseCallbacks.push(callback.bind(this));
    }
  }

  public initialise(options?: IPlayerOptions): Promise<any> {
    if (!this._initialisePromise) {
      this._initialisePromise = new Promise(resolve => {
        const promiseQueue = [];

        if (!this._ngOnInitCompleted) {
          promiseQueue.push(this.waitForViewReady);
        }

        if (!this._playerSdkIsInitialised) {
          promiseQueue.push(this.initialisePlayerSDK);
        }

        if (!this._playerIsInitialised) {
          promiseQueue.push(() => {
            return this.initialisePlayer(options);
          });
        }

        return this.executeInitialisingQueue(promiseQueue).then(() => {
          this._playerSdkIsInitialised = true;
          this._playerIsInitialised = true;

          this.bindListeners();
          if (isNumber(this.getVolume())) {
            this.setPlayerVolume(this.getVolume());
          }
          this._initialiseCallbacks.forEach((callback: Function) => {
            callback.apply(this);
          });
          this._initialiseCallbacks = [];
          this.setStatus(PlayerStatus.Initialised);
          this._initialised = true;

          if (!this.track.title) {
            this.track.fetch();
          }
          console.log('INITIALISED');
          resolve();
        });
      });
    }

    return this._initialisePromise;
  }

  public deInitialize(): void {
    this.unBindListeners();
    if (this._initialised) {
      this.stop();
      this.deInitialisePlayer();
    }
    this.setDuration(0);
    this.track = null;
    this._forcePlayStart = false;
    this._initialised = false;
    this._initialisePromise = null;
    this.setAllowedToPlay(false);
    this.setStatus(PlayerStatus.NotInitialised);
  }

  public preload(startTime?: number): void {
    this.setCurrentTime(startTime);
    this.executeOnInitialised(() => {
      this.preloadTrack(this.track, startTime);
    });
  }

  public play(from?): Promise<any> {
    this.setCurrentTime(from);
    this.setAllowedToPlay(true);
    this.executeOnInitialised(() => {
      this._forcePlayStart = true;
      if (isNumber(from)) {
        this.seekTo(from);
      }
      if (this.track) {
        this.startPlayer();
      } else {
        throw new Error('No track has been set to play!');
      }
    });
    return this.resolveOnStatus(PlayerStatus.Playing);
  }

  public pause(): Promise<any> {
    this._forcePlayStart = false;
    if (this._initialised && this._status !== PlayerStatus.Stopped && this._status !== PlayerStatus.Paused) {
      this.pausePlayer();
      return this.resolveOnOneOfStatus([PlayerStatus.Stopped, PlayerStatus.Paused]);
    } else {
      return Promise.resolve();
    }
  }

  public stop(): Promise<any> {
    this.setAllowedToPlay(false);
    this._forcePlayStart = false;
    if (this._initialised && this._status !== PlayerStatus.Stopped && this._status !== PlayerStatus.Paused) {
      this.stopPlayer();
      return this.resolveOnOneOfStatus([PlayerStatus.Stopped, PlayerStatus.Paused]);
    } else {
      return Promise.resolve();
    }
  }

  public seekTo(to: number): Promise<any> {
    this.executeOnInitialised(() => {
      this.seekPlayerTo(to);
    });
    return this.resolveOnStatus(PlayerStatus.Playing);
  }

  public fadeIn(duration: number): Observable<number> {
    const obs: Observable<number> = EaseService.easeInCirc(1, 0, duration);
    const subscription = obs.subscribe(newVal => {
      if (this._initialised) {
        this.setPlayerVolume(this.getVolume() - newVal);
      }
    });
    return obs;
  }

  public fadeOut(duration: number): Observable<number> {
    const obs: Observable<number> = EaseService.easeInCirc(0, 1, duration);
    const subscription = obs.subscribe(newVal => {
      if (this._initialised) {
        this.setPlayerVolume(this.getVolume() - newVal);
      }
    });
    return obs;
  }

  public updateTrack(track: ITrack): Promise<any> {
    if (this.track && track.id === this.track.id) {
      return Promise.resolve();
    } else {
      this.setStatus(PlayerStatus.Updating);
      this.track = track;
      if (this.getStatus() === PlayerStatus.Playing) {
        return this.stop().then(() => {
          this.preload();
        });
      } else {
        this.preload();
        return Promise.resolve();
      }
    }
  }

  public removeClass(className: string | RegExp) {
    if (className instanceof RegExp) {
      const removeClassNames: string[] = [];
      this.getPlayerEl().nativeElement.classList.forEach((foundClassName) => {
        if (foundClassName.match(className)) {
          removeClassNames.push(foundClassName);
        }
      });
      removeClassNames.forEach((removeClassName: string) => {
        this.removeClass(removeClassName);
      });
    } else {
      this.getPlayerEl().nativeElement.classList.remove(className);
    }
  }

  public addClass(className: string) {
    this.getPlayerEl().nativeElement.classList.add(className);
  }

  public setOpacity(opacity: number) {
    this.getPlayerEl().nativeElement.style.opacity = opacity;
  }

  public getError() {
    return this._error;
  }

  ngOnInit(): void {
    this._viewReadyResolver();
    this.initialise();
  }
}

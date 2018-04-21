import {
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';
import {PlayerStatus} from '../../src/player-status.enum';
import {IPlayer} from '../../src/player.interface';
import {PlayQueueItemStatus} from '../../src/playqueue-item-status.enum';
import {PlayerFactory} from '../../src/player-factory.class';
import {PlayQueue} from '../../collections/play-queue';
import {PlayQueueItem} from '../../models/play-queue-item';
import {YoutubePlayerComponent} from '../youtube-player/youtube-player';
import {isNumber} from 'underscore';
import {EaseService} from '../../../shared/services/ease.service';
import {FullScreenEventType, FullScreenService} from '../../../shared/services/fullscreen.service';
import {ITrack} from '../../../api/tracks/track.interface';

@Component({
  selector: 'app-player-manager',
  styleUrls: ['./player-manager.scss'],
  templateUrl: './player-manager.html',
  entryComponents: [
    YoutubePlayerComponent
  ]
})
export class PlayerManagerComponent implements OnInit, OnChanges {
  private _fadeDuration = 10;
  private _prepareTime = 30;
  private _volume = 1;
  private _playerStatus;
  private _errorOccured = false;
  private _playerSubscriptions;
  private _playerFactory: PlayerFactory;
  private _activePlayer: ComponentRef<IPlayer>;
  private _upcomingPlayer: ComponentRef<IPlayer>;
  private _sizeBeforeFullScreen: number = PlayerFactory.playerWidth;

  @ViewChild('playerContainer', {read: ViewContainerRef})
  private container: ViewContainerRef;

  @Input()
  public playQueue: PlayQueue<PlayQueueItem>;

  @Input()
  public volume: number;

  @Output()
  public playerStatusChange: EventEmitter<PlayerStatus> = new EventEmitter();

  constructor(private resolver: ComponentFactoryResolver,
              private el: ElementRef,
              private fullScreenService: FullScreenService) {
    this._playerSubscriptions = new Subscription();
    this._playerFactory = new PlayerFactory(this.resolver);
  }

  private setHeight(height: number) {
    const playerCtrlEl = this.el.nativeElement.querySelector('.player-controller');
    if (playerCtrlEl) {
      playerCtrlEl.style.height = `${height}px`;
    } else {
      console.warn('[PlayerManager:setHeight] No player controller element was found');
    }
  }

  private handlePlayerStatusChange(newStatus: PlayerStatus) {
    switch (newStatus) {
      case PlayerStatus.Playing:
        this._errorOccured = false;
        this.playQueue.getCurrentItem().status = PlayQueueItemStatus.Playing;
        break;
      case PlayerStatus.Paused:
        this.playQueue.getCurrentItem().status = PlayQueueItemStatus.Paused;
        break;
      case PlayerStatus.Stopped:
        this.playQueue.getCurrentItem().status = PlayQueueItemStatus.Stopped;
        break;
      case PlayerStatus.Ended:
        if (this.playQueue.hasNextItem()) {
          const nextItem = this.playQueue.getNextItem();
          const currentItem = this.playQueue.getCurrentItem();
          if (nextItem.id !== currentItem.id) {
            this.playQueue.getNextItem().play();
          } else {
            this.playQueue.getNextItem().restart();
          }
        } else {
          this.playQueue.getCurrentItem().stop();
        }
        break;
      case PlayerStatus.Error:
        this._errorOccured = true;
        this.playQueue.getCurrentItem().pause();
        break;
    }
    this._playerStatus = status;
    this.playerStatusChange.emit(newStatus);
  }

  private unBindListeners() {
    this._playerSubscriptions.unsubscribe();
    this._playerSubscriptions = new Subscription();
  }

  private getFadeDuration() {
    if (this._activePlayer && this._upcomingPlayer) {
      const currentPlayerDuration = this._activePlayer.instance.getDuration();
      const upcomingPlayerDuration = this._upcomingPlayer.instance.getDuration();
      const maxFadeDuration = Math.min(currentPlayerDuration / 2, upcomingPlayerDuration / 2);
      const minFadeDuration = Math.min(this._fadeDuration, maxFadeDuration);
      if (maxFadeDuration < minFadeDuration) {
        return maxFadeDuration;
      } else {
        return minFadeDuration;
      }
    } else {
      return 0;
    }
  }

  private getFadeStartTime() {
    if (this._activePlayer && this._activePlayer.instance.getDuration() > 0) {
      return this._activePlayer.instance.getDuration() - this.getFadeDuration();
    } else {
      return false;
    }
  }

  private bindListeners(player: IPlayer): void {
    this.unBindListeners();

    this._playerSubscriptions.add(player.currentTimeChange
      .subscribe(currentTime => {
        this.playQueue.get(player.track.id).progress = currentTime;
      })
    );

    this._playerSubscriptions.add(
      player.currentTimeChange
        .filter((currentTime: number) => {
          if (this._upcomingPlayer && this._upcomingPlayer.instance.getStatus() === PlayerStatus.Playing) {
            return false;
          } else if (player.getDuration()) {
            return currentTime >= player.getDuration() - this._prepareTime;
          }
        })
        .subscribe(currentTime => {
          this.prepareNextPlayer();
        })
    );

    const crossFadeSubscription = this._playerSubscriptions.add(
      player.currentTimeChange
        .filter(currentTime => {
          const fadeStartTime = this.getFadeStartTime();
          return fadeStartTime && currentTime >= fadeStartTime;
        })
        .subscribe(() => {
          crossFadeSubscription.unsubscribe();
          this.crossFade();
        })
    );

    this._playerSubscriptions.add(
      player.statusChange
        .subscribe((status: PlayerStatus) => {
          this.handlePlayerStatusChange(status);
        })
    );

    this._playerSubscriptions.add(
      player.durationChange
        .subscribe(() => {
          this.playQueue.get(player.track.id).duration = player.getDuration();
        })
    );

    const currentDuration = player.getDuration();
    if (isNumber(currentDuration) && currentDuration > 0) {
      this.playQueue.get(player.track.id).duration = player.getDuration();
    }
    this.handlePlayerStatusChange(player.getStatus());
  }

  private crossFade() {
    const currentPlayer = this._activePlayer;
    const nextPlayer = this._upcomingPlayer;

    if (nextPlayer && nextPlayer.instance.isAbleToPlay()) {
      nextPlayer.instance.play().then(() => {
        nextPlayer.instance.setSize(PlayerFactory.getPlayerSize(nextPlayer.instance.track));
        nextPlayer.instance.setVolume(this._volume);

        const fadeDuration = this.getFadeDuration();
        nextPlayer.instance.fadeIn(fadeDuration * 1000);
        currentPlayer.instance.fadeOut(fadeDuration * 1000);
        EaseService.easeInCirc(0, 1, (fadeDuration - 1) * 1000)
          .subscribe((value: number) => {
            nextPlayer.instance.setOpacity(value);
          });
      });
    }
  }

  private prepareNextPlayer() {
    const upcoming: PlayQueueItem = this.playQueue.getNextItem();

    if (upcoming) {
      if (this._upcomingPlayer && this._upcomingPlayer.instance.track.id === upcoming.track.id) {
        // Player is already prepared for the next track so do nothig
        return;
      } else {
        if (this._upcomingPlayer) {
          // Upcoming track has been changed so remove the previous prepared player
          this.removePlayer(this._upcomingPlayer);
        }
        this._upcomingPlayer = this._playerFactory.createPlayer(upcoming);
        this._upcomingPlayer.instance.setVolume(0);
        this._upcomingPlayer.instance.addClass('upcoming');
      }
    }
  }

  private setPlayQueueItemToStopped(track: ITrack) {
    const playQueueItem = this.playQueue.get(track.id);
    if (playQueueItem && playQueueItem.status === PlayQueueItemStatus.RequestedStop) {
      playQueueItem.status = PlayQueueItemStatus.Stopped;
    }
  }

  private activatePlayer(newPlayer: ComponentRef<IPlayer>, oldPlayer?: ComponentRef<IPlayer>, startTime?: number, canPlay: boolean = true) {
    this.unBindListeners();

    if (oldPlayer) {
      this.removePlayer(oldPlayer);
      this._upcomingPlayer = null;
    }

    if (canPlay) {
      newPlayer.instance.setVolume(this._volume);
      newPlayer.instance.play(startTime);
    } else {
      newPlayer.instance.setVolume(0);
      newPlayer.instance.seekTo(startTime);
    }

    newPlayer.instance.addClass('active');
    newPlayer.instance.removeClass('upcoming');
    newPlayer.instance.setOpacity(null);

    const playerSize = PlayerFactory.getPlayerSize(newPlayer.instance.track);
    this.setHeight(playerSize.height);
    newPlayer.instance.setSize(playerSize);

    this.bindListeners(newPlayer.instance);

    this._activePlayer = newPlayer;
  }

  private reusePlayer(existingPlayer: ComponentRef<IPlayer>, playQueueItem: PlayQueueItem, startTime?: number) {
    this.setPlayQueueItemToStopped(existingPlayer.instance.track);
    existingPlayer.instance.updateTrack(playQueueItem.track).then(() => {
      this.activatePlayer(existingPlayer, this._upcomingPlayer, startTime);
    });
  }

  private removePlayer(player: ComponentRef<IPlayer>) {
    this.setPlayQueueItemToStopped(player.instance.track);
    player.instance.removeClass('upcoming');
    player.instance.removeClass('active');
    this._playerFactory.destroyPlayer(player);
  }

  private startPlayerFor(playQueueItem: PlayQueueItem, startTime: number = 0) {
    const activePlayer: ComponentRef<IPlayer> = this._activePlayer;
    const nextPlayer: ComponentRef<IPlayer> = this._upcomingPlayer;
    startTime = null;
    if (activePlayer && activePlayer.instance.track.id === playQueueItem.track.id) {
      /*
       * 1. PlayQueueItem track id is the one from current player -> just trigger play
       */
      activePlayer.instance.setVolume(this._volume);
      activePlayer.instance.play(startTime);
      activePlayer.instance.addClass('active');
    } else if (nextPlayer && nextPlayer.instance.track.id === playQueueItem.track.id && nextPlayer.instance.isAbleToPlay()) {
      /*
       * 2. NextPlayer for PlayQueueTrack does exist and is able to play so start that one
       */
      this.activatePlayer(nextPlayer, activePlayer);
    } else if (activePlayer && this._playerFactory.canReusePlayer(activePlayer, playQueueItem)) {
      /*
       * 3. Existing player does exist and can be reused
       */
      this.reusePlayer(activePlayer, playQueueItem, startTime);
    } else {
      /*
       * 4. Create a new player
       */
      const newPlayer = this._playerFactory.createPlayer(playQueueItem);
      this.activatePlayer(newPlayer, activePlayer, startTime);
    }
  }

  private pausePlayer() {
    if (this._activePlayer) {
      this._activePlayer.instance.pause();
    }

    // In case pause is triggered during the crossfade progress
    // make sure that the upcoming player ist stopped so it starts from the beginning when
    if (this._upcomingPlayer) {
      this._upcomingPlayer.instance.stop();
    }
  }

  private stopPlayer() {
    if (this._activePlayer) {
      this._activePlayer.instance.stop();
    }
  }

  private reactOnPlayQueueChange(item: PlayQueueItem): void {
    switch (item.status) {
      case PlayQueueItemStatus.RequestedPlaying:
        this.startPlayerFor(item, item.progress);
        break;
      case PlayQueueItemStatus.RequestedStop:
        this.stopPlayer();
        break;
      case PlayQueueItemStatus.RequestedPause:
        this.pausePlayer();
        break;
    }
  }

  private updatePlayerWidth(width: number) {
    PlayerFactory.playerWidth = width;
    if (this._activePlayer) {
      const playerSize = PlayerFactory.getPlayerSize(this._activePlayer.instance.track);
      this._activePlayer.instance.setSize(playerSize);
      this.setHeight(playerSize.height);
    }
    if (this._upcomingPlayer) {
      this._upcomingPlayer.instance.setSize(PlayerFactory.getPlayerSize(this._upcomingPlayer.instance.track));
    }
  }

  private enteredFullScreen() {
    this._sizeBeforeFullScreen = PlayerFactory.playerWidth;
    this.updatePlayerWidth(screen.width);
  }

  private leftFullScreen() {
    this.updatePlayerWidth(this._sizeBeforeFullScreen);
  }

  public hasActivePlayer(): boolean {
    return !!this._activePlayer;
  }

  ngOnInit(): void {
    this._playerFactory.setContainer(this.container);

    this.playQueue.setLoopPlayQueue(true);
    this.playQueue.on('change:status', this.reactOnPlayQueueChange, this);
    this.playQueue.on('add', () => {
      const firstPlayQueueItem = this.playQueue.getPausedItem() || this.playQueue.getPlayingItem();
      if (!this._activePlayer && firstPlayQueueItem) {
        const firstPlayer = this._playerFactory.createPlayer(firstPlayQueueItem);
        this.activatePlayer(firstPlayer, this._activePlayer, firstPlayQueueItem.progress, false);
      }
    });

    this.fullScreenService.getObservable()
      .filter(eventType => eventType === FullScreenEventType.Enter)
      .subscribe(this.enteredFullScreen.bind(this));

    this.fullScreenService.getObservable()
      .filter(eventType => eventType === FullScreenEventType.Leave)
      .subscribe(this.leftFullScreen.bind(this));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.volume) {
      this._volume = changes.volume.currentValue / 100;
      if (this._activePlayer) {
        this._activePlayer.instance.setVolume(this._volume);
      }
      if (this._upcomingPlayer) {
        this._upcomingPlayer.instance.setVolume(this._volume);
      }
    }
  }
}

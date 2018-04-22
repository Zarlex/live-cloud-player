import {
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output, Renderer2,
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
import {isNumber, debounce} from 'underscore';
import {EaseService} from '../../../shared/services/ease.service';
import {FullScreenEventType, FullScreenService} from '../../../shared/services/fullscreen.service';
import {ITrack} from '../../../api/tracks/track.interface';
import {Players} from '../../collections/players';
import {Player} from '../../models/player';

@Component({
  selector: 'app-player-manager',
  styleUrls: ['./player-manager.scss'],
  templateUrl: './player-manager.html',
  entryComponents: [
    YoutubePlayerComponent
  ]
})
export class PlayerManagerComponent implements OnInit, OnChanges {
  private _volume = 0;
  private _playerStatus;
  private _errorOccured = false;
  private _playerSubscriptions;
  private _playerFactory: PlayerFactory;
  private _sizeBeforeFullScreen: number = PlayerFactory.playerWidth;
  private _players: Players<Player>;

  @ViewChild('playerContainer', {read: ViewContainerRef})
  private container: ViewContainerRef;

  @Input()
  public playQueue: PlayQueue<PlayQueueItem>;

  @Input()
  public volume: number;

  @Output()
  public playerStatusChange: EventEmitter<PlayerStatus> = new EventEmitter();

  @Output()
  public selectedTrackChange: EventEmitter<ITrack>;

  constructor(private resolver: ComponentFactoryResolver,
              private el: ElementRef,
              private renderer: Renderer2,
              private fullScreenService: FullScreenService) {
    this._playerSubscriptions = new Subscription();
    this._playerFactory = new PlayerFactory(this.resolver);
    this._players = new Players<Player>();
    this.selectedTrackChange = new EventEmitter<ITrack>();
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

  private unBindListeners(player: Player) {
    player.subscriptions.unsubscribe();
    player.subscriptions = null;
  }

  private bindListeners(player: Player): void {
    if (player.subscriptions) {
      player.subscriptions.unsubscribe();
    }
    player.subscriptions = new Subscription();
    player.subscriptions.add(
      this.renderer.listen(player.player.instance.el.nativeElement, 'mouseover', () => {
        player.player.instance.setVolume(100);
        this.selectedTrackChange.emit(player.player.instance.track);
      })
    );
    player.subscriptions.add(
      this.renderer.listen(player.player.instance.el.nativeElement, 'mouseout', () => {
        player.player.instance.setVolume(0);
        this.selectedTrackChange.emit(null);
      })
    );
    player.subscriptions.add(
      this.renderer.listen(player.player.instance.el.nativeElement, 'click', () => {
        this.selectedTrackChange.emit(null);
      })
    )
  }

  private activatePlayer(newPlayer: ComponentRef<IPlayer>, startTime?: number, canPlay: boolean = true) {
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

    //this.bindListeners(newPlayer.instance);
  }

  private addPlayer(playQueueItem: PlayQueueItem) {
    if (!this._players.findWhere({playQueueItemId: playQueueItem.id})) {
      const newPlayer = this._playerFactory.createPlayer(playQueueItem);
      const player = new Player();
      player.playQueueItemId = playQueueItem.id;
      player.player = newPlayer;
      this._players.add(player);
      this.activatePlayer(newPlayer);
      this.bindListeners(player);
      console.log('CREATED PLAYER');
    } else {
      console.warn('DOES ALREADY EXIST');
    }
  }

  private removePlayer(playQueueItem: PlayQueueItem) {
    const existingPlayer = this._players.findWhere({playQueueItemId: playQueueItem.id});
    if (existingPlayer) {
      existingPlayer.player.instance.removeClass('upcoming');
      existingPlayer.player.instance.removeClass('active');
      this._playerFactory.destroyPlayer(existingPlayer.player);
      this._players.remove(existingPlayer);
      this.unBindListeners(existingPlayer);
      console.warn('REMOVED PLAYER')
    }
  }

  private updatePlayerWidth(width: number) {
    // PlayerFactory.playerWidth = width;
    // if (this._activePlayer) {
    //   const playerSize = PlayerFactory.getPlayerSize(this._activePlayer.instance.track);
    //   this._activePlayer.instance.setSize(playerSize);
    //   this.setHeight(playerSize.height);
    // }
    // if (this._upcomingPlayer) {
    //   this._upcomingPlayer.instance.setSize(PlayerFactory.getPlayerSize(this._upcomingPlayer.instance.track));
    // }
  }

  private enteredFullScreen() {
    this._sizeBeforeFullScreen = PlayerFactory.playerWidth;
    this.updatePlayerWidth(screen.width);
  }

  private leftFullScreen() {
    this.updatePlayerWidth(this._sizeBeforeFullScreen);
  }

  ngOnInit(): void {
    this._playerFactory.setContainer(this.container);
    this.playQueue.on('remove', (playQueueItem) => {
      this.removePlayer(playQueueItem);
      console.log('REMOVE PLAYER');
    });

    const debouncedOnAdd = debounce(() => {
      this.playQueue.each((playQueueItem) => {
        console.log('ADD');
        this.addPlayer(playQueueItem);
      })
    }, 1000);

    this.playQueue.on('add', this.addPlayer.bind(this));

    this.fullScreenService.getObservable()
      .filter(eventType => eventType === FullScreenEventType.Enter)
      .subscribe(this.enteredFullScreen.bind(this));

    this.fullScreenService.getObservable()
      .filter(eventType => eventType === FullScreenEventType.Leave)
      .subscribe(this.leftFullScreen.bind(this));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.volume) {
      //this._volume = changes.volume.currentValue / 100;
      // if (this._activePlayer) {
      //   this._activePlayer.instance.setVolume(this._volume);
      // }
      // if (this._upcomingPlayer) {
      //   this._upcomingPlayer.instance.setVolume(this._volume);
      // }
    }
  }
}

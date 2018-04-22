import {BaseModel} from '../../backbone/models/base.model';
import {attributesKey} from '../../backbone/decorators/attributes-key.decorator';
import {IPlayer} from '../src/player.interface';
import {ComponentRef} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';

export class Player extends BaseModel {
  @attributesKey('player')
  player: ComponentRef<IPlayer>;

  @attributesKey('playQueueItemId')
  playQueueItemId: string;

  @attributesKey('subscriptions')
  subscriptions: Subscription;

  idAttribute = 'playQueueItemId';
}

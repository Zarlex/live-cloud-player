import {BaseCollection} from '../../backbone/collections/base.collection';
import {PlayerStoreItem} from '../models/player-store-item';
import {Player} from '../models/player';

export class Players<TModel extends Player> extends BaseCollection<TModel> {
  model: any = Player;
}

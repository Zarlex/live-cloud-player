import {BaseModel} from '../../backbone/models/base.model';
import {BaseCollection} from '../../backbone/collections/base.collection';

export class YoutubeProxyCollection<TModel extends BaseModel> extends BaseCollection<BaseModel> {

  model: any = BaseModel;

  hostName(){
    return 'https://www.googleapis.com/youtube/v3';
  }

  basePath() {
    return '/proxy/youtube';
  }

  parse(attributes: any) {
    return attributes.items || attributes;
  }
}



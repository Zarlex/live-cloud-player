import {BaseModel} from '../../backbone/models/base.model';
import {BaseCollection} from '../../backbone/collections/base.collection';
import {queryParam} from '../../backbone/decorators/query-param.decorator';

export class YoutubeProxyCollection<TModel extends BaseModel> extends BaseCollection<BaseModel> {

  @queryParam()
  key = 'AIzaSyChl_ZzHjy7qX1A48q-P63SjffSHVvb9aE';

  model: any = BaseModel;

  hostName(){
    return 'https://www.googleapis.com';
  }

  basePath() {
    return '/youtube/v3';
  }

  parse(attributes: any) {
    return attributes.items || attributes;
  }
}



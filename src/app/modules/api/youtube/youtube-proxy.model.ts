import {ModelSaveOptions} from 'backbone';
import {BaseModel} from '../../backbone/models/base.model';
import {queryParam} from '../../backbone/decorators/query-param.decorator';

export class YoutubeProxyModel extends BaseModel {

  @queryParam()
  key = 'AIzaSyChl_ZzHjy7qX1A48q-P63SjffSHVvb9aE';

  url = (...args): string => {
    const id = this.get(this.idAttribute);
    this.set(this.idAttribute, null, {silent: true});
    const superCall = BaseModel.prototype.url.apply(this, args);
    this.set(this.idAttribute, id, {silent: true});
    return superCall;
  };

  hostName(){
    return 'https://www.googleapis.com';
  }

  basePath() {
    return '/youtube/v3';
  }

  sync(method: string, model: any, options: any = {}) {
    const id = model.get(model.idAttribute);
    model.queryParams.id = id;
    const superCall = super.sync.call(this, method, model, options);
    delete model.queryParams.id;
    return superCall;
  }

  save(attributes?: any, options?: ModelSaveOptions): Promise<any> {
    options.patch = false;
    return super.save.call(this, attributes, options);
  }
}

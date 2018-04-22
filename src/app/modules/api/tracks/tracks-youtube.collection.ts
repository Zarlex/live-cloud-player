import {TrackYoutubeModel} from './track-youtube.model';
import {YoutubeProxyCollection} from '../youtube/youtube-proxy.collection';
import {ITrackModelConstructor} from './track.interface';
import {ITracks} from './tracks.interface';

export class TracksYoutubeCollection<TModel extends TrackYoutubeModel>
  extends YoutubeProxyCollection<TModel> implements ITracks<TModel> {

  model: ITrackModelConstructor = TrackYoutubeModel;

  endpoint = '/search';

  queryParams: {
    [key: string]: string | number | boolean
  } = {
    q: <any>null,
    part: 'snippet',
    eventType: 'live',
    locationRadius: "500km",
    maxResults: "50",
    order: "relevance",
    type: "video",
    videoEmbeddable: true
  };

  public static getTrackDetails(trackIds: Array<string>): Promise<any> {
    const url = `${YoutubeProxyCollection.prototype.hostName.call(this)}/youtube/v3/videos`;
    return TracksYoutubeCollection.prototype.request.call(this, url, 'GET', {
      params: {
        key: 'AIzaSyChl_ZzHjy7qX1A48q-P63SjffSHVvb9aE',
        part: 'statistics,player,snippet,liveStreamingDetails,recordingDetails',
        id: trackIds.join(',')
      }
    });
  }

  private fetchVideoDetails() {
    const videoIds = this.pluck('id');

    return TracksYoutubeCollection.getTrackDetails(videoIds).then((rsp: any) => {
      this.add(rsp, {parse: true, merge: true});
      return this;
    });
  }

  fetch(...args) {
    return super.fetch.apply(this, args).then(() => {
      return this.fetchVideoDetails();
    });
  }

}

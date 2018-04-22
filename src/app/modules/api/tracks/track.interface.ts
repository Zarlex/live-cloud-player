import {BaseModel} from '../../backbone/models/base.model';
import {AbstractImageModel} from '../image/abstract-image';

export interface ITrackModelConstructor {
  new(...args): ITrack;
}

export interface ITrack extends BaseModel {
  provider: string;
  image: AbstractImageModel;
  title: string;
  duration: number;
  genre: string;
  createdAt: number;
  likes: number;
  clicks: number;
  aspectRatio: number;
  isLikeable: boolean;
  location: {
    title: string;
    latitude: number;
    longitude: number;
  };

  toMiniJSON(): {};
}


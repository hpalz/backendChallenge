export interface Url {
    shortenedURL: string;
    url: string;
    id: number;
  }
  
  export interface UrlList {
    urls: Url[];
  }
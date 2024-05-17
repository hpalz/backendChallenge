import 'module-alias/register';
import 'socket.io';
import 'socket.io-client';
import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import ioclient from 'socket.io-client';
import fs from 'fs/promises';
import { Url, UrlList } from 'server/types';

const app = express();
const server = require('http').Server(app);
const port = 8080;
const io = new Server(server, {
  // ...
});
const dataPath = 'data/urls.json';

//Client confirmation they received the shortenedUrl
io.on('connection', (socket: Socket) => {
  socket.on('shortenedUrl Event', (data, callback) => {
    console.log(data); // 1
    callback({
      status: "ok"
    });
  });
});

//Returns the original URL to the client
app.get('/:id', (req: Request, res: Response) => {
   const url = req.protocol + '://' + req.get('host');
    const socketclient = ioclient(url);
    fetchUrl(req.params.id, url)
      .then(result => {
        if(result != null)
          res.json({ url: result });
        else{
          res.status(500)
          .send(
            'Url has not been shortened with id ' + req.params.id
          );
        }
      })
      .catch(error => {
        res.status(500)
        .send(
          'An error occurred when fetching the url with id ' + req.params.id
        );
      });

});

//Writes the shortened url to the local json file
app.post('/url', (req: Request, res: Response) => {
    const url = req.protocol + '://' + req.get('host');
    const socketclient = ioclient(url);
    socketclient.on('connect', async () => {
      let urlIn = req.query.url as string;
      writeShortenedUrl(urlIn, url)
      .then(result => {
        socketclient.emit('shortenedUrl Event', { shortenedUrl: result }, withTimeout(() => {
          console.log("success!");
        }, () => {
          console.log("timeout!");
        }, 1000));
        res.json({ shortenedUrl: result });
      })
      .catch(error => {
          console.error("Error:", error);
      });

  });
});

// helper function to asynchronously write to the json file and check if url has already been shortened
async function writeShortenedUrl (urlIn:string, hostUrl:string) {
    const data = await fs.readFile(dataPath, {
      encoding: 'utf8',
    });
    const allUrls: UrlList = JSON.parse(data);
    let newUrl=  {} as Url;
    let shortenedUrl:string = "";
      if (data.length > 0) {
        let url = {} as Url;
        url = {
          ...allUrls.urls.find((url) => url.url === urlIn),
        } as Url;
        if(Object.keys(url).length != 0){
          return url.shortenedURL;
        }else{
          shortenedUrl = hostUrl + "/" +randomStr(10,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
        }
      }
      newUrl.shortenedURL = shortenedUrl;
      newUrl.url = urlIn;
      const newUrlId = Date.now();
      newUrl.id = newUrlId;
       allUrls.urls.push(newUrl);

        await fs.writeFile(dataPath, JSON.stringify(allUrls, null, 2), {
          encoding: 'utf8',
        });
        return shortenedUrl;
};

//helper function that returns the original URL, returns null if encoded url doesn't exist
async function fetchUrl (shortenedUrl:string, hostUrl: string) {
    const data = await fs.readFile(dataPath, {
      encoding: 'utf8',
    });
    const allUrls: UrlList = JSON.parse(data);
    let newUrl=  {} as Url;
      if (data.length > 0) {
        let url = {} as Url;
        url = {
          ...allUrls.urls.find((url) => url.shortenedURL === hostUrl+"/"+shortenedUrl),
        } as Url;
        if(Object.keys(url).length != 0){
          return url.url;
        }
      }
      return null;
};

//helper function returns 10 random characters that takes in custom character options
function randomStr(len: number, arr: string | any[]) {
    let ans = '';
    for (let i = len; i > 0; i--) {
        ans +=
            arr[(Math.floor(Math.random() * arr.length))];
    }
    console.log(ans);
    return ans;
  }

//https://socket.io/docs/v3/emitting-events/
//socket.io's solution to retry the send if it never receives ack
const withTimeout = (onSuccess:any, onTimeout:any, timeout:any) => {
    let called = false;
  
    const timer = setTimeout(() => {
      if (called) return;
      called = true;
      onTimeout();
    }, timeout);
  
    return (...args) => {
      if (called) return;
      called = true;
      clearTimeout(timer);
      onSuccess.apply(this, args);
    }
  }
server.listen(port, () => console.log(`Example app listening on port ${port}!`));
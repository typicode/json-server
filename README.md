## Getting started

Install JSON Server 

```
npm install -g json-server

```

Install app dependences

```
npm install

```

Start JSON Server

```bash
npm start

```

Now if you go to [http://localhost:3001/posts/1](http://localhost:3001/posts/1), you'll get

```json
{ "id": 1, "name": "user1" }
```

Current routes List (basic REST exemple)

```

GET 'http://localhost:3001/exchange?from=EUR&to=MDL' => get exchange rate details
GET 'http://localhost:3001/exchange-history?from=BTC&to=MDL => get digital currency exchange history

```

Exchange API documentation: https://www.alphavantage.co/documentation/

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
json-server mock-db.js

```

Now if you go to [http://localhost:3001/posts/1](http://localhost:3001/posts/1), you'll get

```json
{ "id": 1, "name": "user1" }
```

Current routes List (basic REST exemple)

```

GET 'http://localhost:3001/posts'        //get all rows
GET 'http://localhost:3001/posts/1'      //get row by id == 1
POST 'http://localhost:3001/posts'       //add new item to DB
PUT 'http://localhost:3001/posts/1'      //update row with id == 1
DELETE 'http://localhost:3001/posts/1'   //delete row with id == 1

```

Exchange API documentation: https://www.alphavantage.co/documentation/

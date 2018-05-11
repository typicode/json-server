# FDS JSON Server

FDS JSON Server는 패스트캠퍼스 프론트엔드 스쿨의 REST API 실습을 위해 만들어진 NPM 패키지입니다. JSON Server에 JWT 인증 및 권한 설정 기능을 추가했습니다.

JSON Server는 프로토타이핑을 위한 REST API 서버를 쉽게 띄울 수 있도록 제작된 NPM 패키지입니다. 이 패키지의 기능은 JWT 인증 및 권한 설정 기능을 제외하면 JSON Server와 완전히 동일합니다.

## 설치하기

```
npm install --save fds-json-server
```

## 초기 설정하기

JSON Server를 사용하기 위해서는, 먼저 데이터 파일과 권한 설정 파일을 생성해야 합니다.

데이터 파일은 서버의 데이터 구조를 나타내는 파일로, 이 파일을 어떻게 작성하느냐에 따라 서버의 기능이 달라지게 됩니다. 예를 들어, 사용자, 게시글, 댓글을 저장하는 서버를 만들려면 데이터 파일은 아래와 같은 구조를 갖습니다.

```json
{
  "users": [
    {
      "id": 1,
      "username": "fds"
    }
  ],
  "posts": [
    {
      "id": 1,
      "userId": 1,
      "title": "Hello FDS JSON Server :)",
      "body": "..."
    }
  ],
  "comments": [
    {
      // "userId": 1,
      "postId": 1,
      "body": "🍺🎉"
    }
  ]
}
```

여기서, `users` 배열은 FDS JSON Server가 특별하게 관리하는 데이터로, 그 안에 들어있는 객체는 반드시 `username`이라는 속성을 가지고 있어야 합니다.

`auth.config.js`

write 레벨을 ownerOnly 레벨로 설정한 경우, 객체에 userId 속성이 같이 기록되어, 소유자가 누구인지를 나타냅니다.

read 레벨은 write 레벨보다 높을 수 없습니다.

## 실행하기

프로젝트 폴더 안에서 `db.json` 등의 이름으로 데이터 파일을 생성해주세요. 데이터가 실제로 이 파일에 저장되기 때문에, `.gitignore`에 파일 이름을 추가해주는 것이 좋습니다.

데이터 파일을 생성하셨다면, 프로젝트 폴더에서 아래의 명령을 실행해주세요.

```
npx fds-json-server db.json
```

## 사용자 생성하기

서버의 `/_dev/register` 주소로 접속 후, 사용자를 만들면 사용자 정보가 데이터 파일에 저장됩니다.

db.json에서 만드는 방법



## 토큰 생성하기


## 권한 설정하기

배열에 대해서

프로젝트 폴더에 `auth.config.js` 파일을 만드세요.

```js
module.exports = {
  posts: {
    read
  }
}
```

## 비밀번호 초기화

## License

MIT

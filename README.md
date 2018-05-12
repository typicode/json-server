# FDS JSON Server

FDS JSON Server는 패스트캠퍼스 프론트엔드 스쿨의 REST API 실습을 위해 만들어진 NPM 패키지입니다. [JSON Server](https://www.npmjs.com/package/json-server)에 **JWT 인증** 및 **권한 설정 기능**을 추가했습니다.

JSON Server는 프로토타이핑을 위한 REST API 서버를 쉽게 띄울 수 있도록 제작된 NPM 패키지입니다. 이 패키지의 기능은 JWT 인증 및 권한 설정 기능을 제외하면 JSON Server와 완전히 동일합니다.

**본 패키지는 개발 및 실습용으로 제작되었기 때문에, 민감한 정보를 다루는 용도로 사용되어서는 안 됩니다.**

## 설치하기

```
npm install --save fds-json-server
```

## 초기 설정하기

JSON Server를 사용하기 위해서는, 먼저 데이터 파일과 권한 설정 파일을 생성해야 합니다.

### 데이터 파일 생성

JSON Server 설정 시와 마찬가지로, 초기 데이터 파일을 생성해주어야 합니다. 여기서, `users` 배열은 FDS JSON Server가 특별하게 관리하는 데이터로, 그 안에 들어있는 객체는 반드시 `username` 속성을 가지고 있어야 합니다.

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
      "id": 1,
      "userId": 1,
      "postId": 1,
      "body": "🍺🎉"
    }
  ]
}
```

데이터 파일에는 실제 데이터가 저장되기 때문에, Git 저장소에 해당 내용이 반영되지 않도록 `.gitignore`에 파일 이름을 추가해주는 것이 좋습니다.

### 권한 설정 파일 생성

프로젝트 폴더에 `auth.config.js` 파일을 생성해서 각 API 경로에 대한 권한 설정을 할 수 있습니다.

각 경로마다 세 단계의 읽기/쓰기 권한을 설정할 수 있으며, 아래와 같은 의미를 가집니다.

- 읽기 권한
  - 설정되지 않음 - 모든 사용자에 대해 읽기 허용
  - `ifAuthed` - 인증된 사용자에 한해 읽기 허용
  - `ownerOnly` - 소유자에 한해 읽기 허용
- 쓰기 권한
  - 설정되지 않음 - 모든 사용자에 대해 데이터 생성/수정 허용
  - `ifAuthed` - 인증된 사용자에 한해 데이터 생성/수정 허용
  - `ownerOnly` - 인증된 사용자에 한해 데이터 생성 허용, 소유자에 한해 수정 허용

```js
module.exports = {
  posts: {
    read: 'ifAuthed',
    write: 'ownerOnly'
  },
  comments: {
    read: 'ifAuthed',
  }
}
```

쓰기 권한을 `ownerOnly` 단계로 설정한 경우, 데이터 객체에 userId 속성이 같이 기록되어 소유자가 누구인지를 나타냅니다.

`/users` 경로에는 기본적으로 아래와 같은 권한 설정이 되어 있어서, 따로 권한을 설정해 줄 필요가 없습니다. (모든 사용자가 읽기 가능, 소유자만 수정 가능)

```js
{
  write: 'ownerOnly'
}
```

권한 설정에는 아래와 같은 제약사항이 있습니다.

- 하나의 경로에 대해, read 레벨은 write 레벨보다 더 엄격할 수 없습니다. 예를 들어, `/posts` 경로에 대한 read 레벨이 `ownerOnly` 이면서 write 레벨이 `ifAuthed`일 수 없습니다.
- 권한 설정은 데이터 파일의 배열에 의해 생성된 API 경로에만 적용됩니다.

### 환경변수 설정하기

토큰을 생성할 때 사용할 비밀 키를 `JWT_SECRET` 환경변수로 설정해주어야 합니다.

혹은 `.env` 파일을 통해서 비밀 키를 설정해줄 수도 있습니다. 프로젝트 폴더에 `.env` 파일을 생성하고 아래와 같이 작성해주세요.

```
JWT_SECRET=mysecret
```

## 실행하기

데이터 파일과 권한 설정 파일을 모두 생성하셨다면, 프로젝트 폴더에서 아래의 명령을 실행해주세요.

```
npx fds-json-server <데이터 파일 경로>
```

## 비밀번호 초기화하기

초기 설정 시 데이터 파일에서 사용자를 만들어주었다면, 서버의 `/users/reset` 경로로 접속해 비밀번호를 설정해주어야 합니다. 비밀번호는 아래와 같은 형식으로 데이터 파일에 암호화되어 저장됩니다.

```json
{
  "users": [
    {
      "id": 1,
      "username": "fds",
      "hashedPassword": "$2a$10$4f/XNsel857PCd6GR/E.4O6iV3/wb2s9rZpZP5td0tU3PKF/47R/i"
    }
  ],
  ...
}
```

## 사용자 생성하기

서버의 `/users/register` 경로로 POST 요청을 보내 사용자를 생성할 수 있습니다. 요청 바디는 다음과 같은 형태의 JSON 문서여야 합니다.

```json
{
  "username": "fds",
  "password": "..."
}
```

응답 바디로는 다음과 같은 형태의 JSON 문서가 전송됩니다. 여기에 포함된 `token`을 사용해 다른 API 경로로 인증된 요청을 보낼 수 있습니다.

```json
{
  "token": "..."
}
```

웹 브라우저에서 서버의 `/users/register` 주소로 접속하면, 웹 페이지를 통해 새 사용자를 만들고 토큰을 생성할 수 있습니다. 이 때, 웹 페이지에 직접 접속한 경우라면 토큰이 출력되고, 팝업으로 접속한 경우라면 `opener.postMessage` 메소드를 통해 토큰이 전달됩니다.

## 사용자 이름과 비밀번호를 이용해 토큰 생성하기

서버의 `/users/login` 경로로 POST 요청을 보내 토큰을 생성할 수 있습니다. 요청 바디는 다음과 같은 형태의 JSON 문서여야 합니다.

```json
{
  "username": "fds",
  "password": "..."
}
```

응답 바디로는 다음과 같은 형태의 JSON 문서가 전송됩니다. 여기에 포함된 `token`을 사용해 다른 API 경로로 인증된 요청을 보낼 수 있습니다.

```json
{
  "token": "..."
}
```

웹 브라우저에서 서버의 `/users/login` 주소로 접속하면, 웹 페이지를 통해 토큰을 생성할 수 있습니다. 이 때, 웹 페이지에 직접 접속한 경우라면 토큰이 출력되고, 팝업으로 접속한 경우라면 `opener.postMessage` 메소드를 통해 토큰이 전달됩니다.

## 서버에 요청 보내기

토큰을 얻은 후에는 이 토큰을 이용해 인증된 요청을 서버에 보낼 수 있습니다. `Authorization` 헤더를 아래와 같은 형태로 포함시키면 됩니다.

```
Authorization: Bearer <token>
```

위의 `<token>` 부분을 서버로부터 받은 토큰으로 바꾸어주면 됩니다.

## License

MIT

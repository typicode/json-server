# JSON-Server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

> [!IMPORTANT]
> Beta v1 dokümantasyonunu görüntülüyorsunuz – kullanılabilir ancak kırıcı değişiklikler olabilir. Kararlı sürüm için [buraya](https://github.com/typicode/json-server/tree/v0) bakın.

> [!NOTE]
> React ⚛️ mı kullanıyorsun? TailwindCSS ile çalışan, tür güvenli stiller yazmanı sağlayan yeni projem [MistCSS](https://github.com/typicode/mistcss)’e göz at.

## Kurulum

```shell
npm install json-server
```

## Kullanım

`db.json` veya `db.json5` dosyası oluşturun

```json
{
  "posts": [
    { "id": "1", "title": "a title", "views": 100 },
    { "id": "2", "title": "another title", "views": 200 }
  ],
  "comments": [
    { "id": "1", "text": "a comment about post 1", "postId": "1" },
    { "id": "2", "text": "another comment about post 1", "postId": "1" }
  ],
  "profile": {
    "name": "typicode"
  }
}
```

<details>
<summary>db.json5 örneğini görüntüle</summary>

```json5
{
  posts: [
    { id: '1', title: 'a title', views: 100 },
    { id: '2', title: 'another title', views: 200 },
  ],
  comments: [
    { id: '1', text: 'a comment about post 1', postId: '1' },
    { id: '2', text: 'another comment about post 1', postId: '1' },
  ],
  profile: {
    name: 'typicode',
  },
}
```

JSON5 formatı hakkında daha fazlasını [buradan](https://github.com/json5/json5) okuyabilirsiniz.

</details>

JSON Server CLI ile çalıştırın

```shell
$ npx json-server db.json
```

Bir REST API elde edin

```shell
$ curl http://localhost:3000/posts/1
{
  "id": "1",
  "title": "a title",
  "views": 100
}
```

Seçenek listesi için `json-server --help` çalıştırın

## Sponsorlar ✨

### Altın

||
| :---: |
| <a href="https://mockend.com/" target="_blank"><img src="https://jsonplaceholder.typicode.com/mockend.svg" height="100px"></a> |
| <a href="https://zuplo.link/json-server-gh"><img src="https://github.com/user-attachments/assets/adfee31f-a8b6-4684-9a9b-af4f03ac5b75" height="100px"></a> |
| <a href="https://www.mintlify.com/"><img src="https://github.com/user-attachments/assets/bcc8cc48-b2d9-4577-8939-1eb4196b7cc5" height="100px"></a> |

### Gümüş

||
| :---: |
| <a href="https://requestly.com/"><img src="https://github.com/user-attachments/assets/f7e7b3cf-97e2-46b8-81c8-cb3992662a1c" style="height:70px; width:auto;"></a> |

### Bronz

|||
| :---: | :---: |
| <a href="https://www.storyblok.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/c6b10674-4ada-4616-91b8-59d30046b45a" height="35px"></a> | <a href="https://betterstack.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/44679f8f-9671-470d-b77e-26d90b90cbdc" height="35px"></a> |

[Bir sponsor olun ve şirket logonuz burada yer alsın](https://github.com/users/typicode/sponsorship)

## Sponsorware

> [!NOTE]
> Bu proje [Fair Source License](https://fair.io/) kullanmaktadır. Yalnızca 3+ kullanıcılı organizasyonlardan kullanım için küçük bir sponsorluk katkısı yapmaları rica edilir. __Bu lisans, projenin sürdürülebilir ve sağlıklı kalmasına yardımcı olur, herkes faydalanır.__  
>
> Daha fazla bilgi, SSS ve mantığı için şu bağlantıyı ziyaret edin: [https://fair.io/](https://fair.io/).

## Rotalar

Örnek `db.json` dosyasına göre aşağıdaki rotalar oluşturulur:

```
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id

# comments için de aynı
```

```
GET   /profile
PUT   /profile
PATCH /profile
```

## Parametreler

### Koşullar

- ` ` → `==`
- `lt` → `<`
- `lte` → `<=`
- `gt` → `>`
- `gte` → `>=`
- `ne` → `!=`

```
GET /posts?views_gt=9000
```

### Limitlendirme

- `start`
- `end`
- `limit`

```
GET /posts?_start=10&_end=20
GET /posts?_start=10&_limit=10
```

### Sayfalama

- `page`
- `per_page` (varsayılan = 10)

```
GET /posts?_page=1&_per_page=25
```

### Sıralama

- `_sort=f1,f2`

```
GET /posts?_sort=id,-views
```

### İç içe ve dizi alanlar

- `x.y.z...`
- `x.y.z[i]...`

```
GET /foo?a.b=bar
GET /foo?x.y_lt=100
GET /foo?arr[0]=bar
```

### Gömme (Embed)

```
GET /posts?_embed=comments
GET /comments?_embed=post
```

## Silme

```
DELETE /posts/1
DELETE /posts/1?_dependent=comments
```

## Statik dosya servis etme

Bir `./public` dizini oluşturursanız, JSON Server API’ye ek olarak buradaki içerikleri de servis eder.

Ayrıca `-s/--static` seçeneğiyle özel dizinler ekleyebilirsiniz:

```sh
json-server -s ./static
json-server -s ./static -s ./node_modules
```

## v0.17 ile dikkat çekici farklar

- `id` artık her zaman string’dir ve eksikse otomatik oluşturulur
- sayfalama için `_limit` yerine `_per_page` + `_page` kullanılır
- istek gecikmesi için `--delay` kaldırıldı, bunun yerine Chrome `Network > throttling` kullanılabilir

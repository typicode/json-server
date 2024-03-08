# json-server

#### This is forked version for Deno

#### [All details see in original repo](https://github.com/typicode/json-server)

## Usage with deno

> for now is little manual...

- [Install Deno](https://docs.deno.com/runtime/manual/getting_started/installation)
  - spoiler for mac/linux: `curl -fsSL https://deno.land/install.sh | sh`

- Create a `db.json` or `db.json5` file (see details in original repo)

```bash
git clone https://github.com/nik-kita/deno-json-server.git
```

```bash
deno run -A deno-json-server/main.ts -p 3000 db.json
```

// TODO:

- provide more userfrindly interface for usage
- register in npm, deno.land, etc.

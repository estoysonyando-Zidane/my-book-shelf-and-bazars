# my-book-shelf-and-bazars

際限なく増える蔵書を、楽しく管理するためのアプリ。

- 要件定義: [`docs/requirements.md`](docs/requirements.md)
- 設計(画面構成・DB設計・実装フェーズ): [`docs/design.md`](docs/design.md)

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

DB(PostgreSQL)はDocker Composeでローカル起動できる。

```bash
docker compose up -d
npx prisma migrate dev
```

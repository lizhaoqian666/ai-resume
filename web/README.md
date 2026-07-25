# AI Resume Web

## API address strategy

- Local development uses `http://localhost:3000` through Vite proxy.
- Production build uses `VITE_API_BASE_URL`.

Current behavior:

- In development (`npm run dev`): request path is `/api/analyze`, and Vite forwards `/api` to `http://localhost:3000`.
- In production (`npm run build`): request path is `${VITE_API_BASE_URL}/analyze`.

## Local run

1. Start server in `server` (default port `3000`).
2. Start web in `web`:

```bash
npm install
npm run dev
```

## Production build env

Copy `web/.env.production.example` to `.env.production` and set:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## Auto deploy to Aliyun by GitHub push

Workflow file: `.github/workflows/deploy-aliyun.yml`

It will:

1. Trigger on push to `main`.
2. Build `ai-resume/web`.
3. Upload `dist` to Aliyun server directory.

Set these GitHub repository secrets:

- `ALIYUN_HOST`: Aliyun server IP or domain.
- `ALIYUN_USER`: SSH user.
- `ALIYUN_SSH_KEY`: Private key content for SSH.
- `ALIYUN_PORT`: SSH port (usually `22`).
- `ALIYUN_WEB_ROOT`: Target static site directory on Aliyun (for example `/www/wwwroot/your-site`).
- `VITE_API_BASE_URL`: Your production API base URL, for example `https://api.your-domain.com/api`.

After setting secrets, every commit pushed to `main` will automatically deploy the latest frontend to Aliyun.

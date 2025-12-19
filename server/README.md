# Auction Auth Service (AAS) - Server

Backend server derived for use with Chrome Extension.

## 🐳 Local Development with Docker + Prisma

### 1. Prerequisites
- Docker Desktop installed and running
- Node.js installed

### 2. Setup Environment
Update your `.env` file to match the Docker configuration:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=auction_auth_service
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
# Add this for Prisma:
DATABASE_URL="mysql://root:root@localhost:3306/auction_auth_service"
```

### 3. Start Database
Run this command to start MySQL in a container:
```bash
docker-compose up -d
```
*This will automatically initialize the database with `schema.sql` and `seed_credentials.sql`.*

### 4. Setup Prisma
Generate the Prisma client:
```bash
npx prisma generate
```

### 5. Start Server
```bash
npm run dev
```

### 6. Prisma Studio (View Data)
```bash
npx prisma studio
```
*Note: If Studio fails, verify `prisma.config.ts` has the correct `url`.*

## 🛠️ Commands

- **Stop Database**: `docker-compose down`
- **Reset Database**: `docker-compose down -v` (Deletes data!)
- **View DB Logs**: `docker-compose logs -f`

## 🏗️ Architecture
... (rest of architecture docs)

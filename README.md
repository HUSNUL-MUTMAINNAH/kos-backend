# Kos Management System - Backend

Backend API untuk sistem manajemen kos dengan Express.js, Prisma ORM, dan Supabase PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin & Penyewa)
  - Password hashing dengan bcrypt
  - Secure token management

- **User Management**
  - Admin account management
  - Penyewa (tenant) registration & profile
  - Avatar upload
  - Profile editing

- **Room Management (Kamar)**
  - Create, read, update, delete rooms
  - Track room status (KOSONG, TERISI)
  - Room pricing and details

- **Payment System (Pembayaran)**
  - Create bills with two options:
    - BELUM_BAYAR: Tenant uploads proof
    - APPROVED: Direct payment recording
  - Tenant payment proof upload
  - Admin payment review (ACC/REJECT)
  - Payment history tracking

- **Notifications**
  - Auto-generated for payment events
  - Daily reminder cron job (8:00 AM)
  - Real-time notifications via Socket.IO

- **Chat System**
  - Real-time messaging between admin & tenant
  - Socket.IO integration
  - Message history

- **File Upload**
  - Avatar upload for users
  - Payment proof upload
  - Static file serving from `/uploads`

## 📋 Prerequisites

- Node.js >= 14
- npm or yarn
- PostgreSQL (via Supabase)
- Git

## 🔧 Installation

### 1. Clone Repository
```bash
git clone https://github.com/HUSNUL-MUTMAINNAH/kos-backend.git
cd kos-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env` dan isi dengan credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres?schema=public"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000

# Optional: File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### 4. Setup Database

#### Create tables (first time):
```bash
npx prisma migrate dev --name init
```

#### Or reset database (development only):
```bash
npx prisma migrate reset --force
```

### 5. Seed Initial Data
```bash
npm run seed
```

Creates:
- Admin account: `admin@kost.com` / `admin123`
- 4 sample rooms (Kamar A-D)
- Sample payment records

## 🏃 Running

### Development
```bash
npm run dev
```

Server berjalan di: `http://localhost:5000`

### Production
```bash
npm start
```

## 📁 Project Structure

```
src/
├── config/
│   └── db.js              # Prisma client setup
├── controllers/           # Business logic
│   ├── auth.controller.js
│   ├── kamar.controller.js
│   ├── penyewa.controller.js
│   ├── pembayaran.controller.js
│   ├── notifikasi.controller.js
│   └── chat.controller.js
├── routes/               # API endpoints
│   ├── auth.routes.js
│   ├── kamar.routes.js
│   ├── penyewa.routes.js
│   ├── pembayaran.routes.js
│   ├── notifikasi.routes.js
│   └── chat.routes.js
├── middleware/           # Custom middleware
│   ├── auth.js           # JWT verification
│   └── upload.js         # File upload (multer)
├── jobs/
│   └── notifikasiCron.js # Daily reminder job
├── sockets/
│   └── chatSocket.js     # Socket.IO events
├── utils/
│   └── jwt.js            # JWT utilities
├── app.js               # Express app setup
└── server.js            # Server entry point

prisma/
├── schema.prisma        # Database schema
├── seed.js              # Seed script
└── migrations/          # Database migrations

uploads/                 # File storage for avatars & payments
```

## 📊 Database Schema

### Tables

- **user** - Login accounts with passwords
- **admin** - Admin info
- **penyewa** - Tenant info with room assignment
- **kamar** - Room details (number, price, status)
- **pembayaran** - Bills and payment records
- **notifikasi** - Notification history
- **chatmessage** - Chat messages

### Key Relationships

```
User (1) ---- (1) Admin
User (1) ---- (1) Penyewa (N) --- (1) Kamar
Penyewa (1) --- (N) Pembayaran
Penyewa (1) --- (N) Notifikasi
User (1) --- (N) ChatMessage
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new penyewa
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile
- `POST /api/auth/upload-avatar` - Upload avatar

### Kamar (Rooms)
- `GET /api/kamar` - List all rooms
- `GET /api/kamar/:id` - Get room details
- `POST /api/kamar` - Create room (admin only)
- `PUT /api/kamar/:id` - Update room (admin only)
- `DELETE /api/kamar/:id` - Delete room (admin only)

### Penyewa (Tenants)
- `GET /api/penyewa` - List all tenants (admin only)
- `GET /api/penyewa/:id` - Get tenant details
- `POST /api/penyewa` - Create tenant (admin only)
- `PUT /api/penyewa/:id` - Update tenant (admin only)
- `DELETE /api/penyewa/:id` - Delete tenant (admin only)

### Pembayaran (Payments)
- `GET /api/pembayaran` - List bills (admin: all, penyewa: own)
- `GET /api/pembayaran/:id` - Get bill details
- `POST /api/pembayaran` - Create bill (admin only)
  - `inputManual: true` → Status: APPROVED (lunas)
  - `inputManual: false` → Status: BELUM_BAYAR (penyewa uploads)
- `POST /api/pembayaran/:id/upload-bukti` - Upload payment proof (penyewa)
- `PATCH /api/pembayaran/:id/review` - Review proof (admin)
- `DELETE /api/pembayaran/:id` - Delete bill (admin only)

### Notifikasi (Notifications)
- `GET /api/notifikasi` - List notifications
- `GET /api/notifikasi/:id` - Get notification
- `PATCH /api/notifikasi/:id/read` - Mark as read

### Chat
- `GET /api/chat` - List chat messages
- `POST /api/chat` - Send message
- `GET /api/chat/:id` - Get chat details

## 🔐 Authentication

### JWT Token
- Stored in `Authorization: Bearer <token>` header
- Token includes user ID, email, role
- Expires after set duration (check config)

### Roles
- **ADMIN** - Full system access
- **PENYEWA** - Limited to own data

### Protected Routes
Most endpoints require JWT token. Middleware `verifyToken()` checks:
1. Token exists in header
2. Token is valid & not expired
3. User role has permission

## 💾 File Upload

### Avatar Upload
- Endpoint: `POST /api/auth/upload-avatar`
- Requires: Auth token
- Stores: `/uploads/{timestamp}-{random}.{ext}`
- Returned: `/uploads/filename`

### Payment Proof Upload
- Endpoint: `POST /api/pembayaran/:id/upload-bukti`
- Requires: Auth token + Penyewa role
- Stores: `/uploads/{timestamp}-{random}.{ext}`

## 🕐 Cron Jobs

### Daily Notification Reminder
- **Time**: 8:00 AM (configurable in `notifikasiCron.js`)
- **Action**: Send reminder notifications for unpaid bills
- **Status**: Active when server running

## 🔄 Real-Time Features

### Socket.IO Events

**Chat Messages**
```
emit('chat:send') → receive('chat:baru')
```

**Notifications**
```
receive('notifikasi:baru')
```

**Payment Updates**
```
receive('pembayaran:updated')
```

## 🧪 Testing

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kost.com","password":"admin123"}'
```

### Test Penyewa Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Penyewa",
    "email":"john@example.com",
    "password":"password123",
    "phone":"08123456789"
  }'
```

## 🐛 Debugging

### Enable Logs
Logs are printed to console for:
- All HTTP requests
- Database queries
- Authentication events
- File uploads

### Check Database
```bash
npx prisma studio
```
Opens Prisma Studio at `http://localhost:5555`

## 📦 Dependencies

### Core
- **express** - Web framework
- **prisma** - ORM
- **@prisma/client** - Prisma client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT auth
- **socket.io** - Real-time communication
- **multer** - File upload
- **node-cron** - Cron jobs
- **cors** - Cross-origin requests
- **dotenv** - Environment variables

## 🚀 Deployment

### Environment Setup
1. Create Supabase PostgreSQL database
2. Set `DATABASE_URL` in environment
3. Run `npx prisma migrate deploy`
4. Run `npm run seed` (optional)
5. Set `JWT_SECRET` to secure random string
6. Set `FRONTEND_URL` to production frontend URL

### Server Hosting
Can be deployed on:
- Heroku
- Railway
- Render
- AWS/DigitalOcean
- Any Node.js hosting

### Uploads Folder
For production, consider:
- Upload to S3/cloud storage
- Use CDN for serving files
- Configure persistent storage on server

## 📝 Notes

- `.env` file should NOT be committed to Git
- `uploads/` folder is in `.gitignore`
- Database migrations should be committed
- Seed script should only run on development/staging

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create PR

## 📄 License

Proprietary - Kos Management System

## 👤 Author

HUSNUL-MUTMAINNAH

## 📞 Support

For issues or questions, create an issue on GitHub.

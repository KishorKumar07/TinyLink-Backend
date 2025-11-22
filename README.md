# TinyLink Backend

Backend API for TinyLink URL shortener service built with Node.js and Express.

## 🚀 Deployment

**Live URL:** https://tinylink-backend-tw9p.onrender.com

## 📋 What's Implemented

### Core Features
- ✅ **Create Short Links** - Generate short URLs with optional custom codes (6-8 alphanumeric characters)
- ✅ **URL Validation** - Validates URLs before saving
- ✅ **Custom Code Support** - Users can provide custom short codes (globally unique)
- ✅ **Redirect Functionality** - HTTP 302 redirects to original URLs with click tracking
- ✅ **Click Analytics** - Tracks total clicks, last clicked time, and detailed analytics
- ✅ **Delete Links** - Remove links (returns 404 after deletion)
- ✅ **Link Statistics** - Get detailed stats for individual links
- ✅ **Health Check** - `/healthz` endpoint for system monitoring

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/links` | Create a new short link (returns 409 if code exists) |
| GET | `/api/links` | List all links with pagination and search |
| GET | `/api/links/:code` | Get stats for a single link by code |
| DELETE | `/api/links/:code` | Delete a link |
| GET | `/:shortCode` | Redirect to original URL (302) |
| GET | `/healthz` | Health check endpoint |

### Additional Features
- **Analytics Tracking** - Captures IP address, user agent, referer, device type, browser, OS
- **Pagination** - Supports pagination for listing links
- **Search/Filter** - Search links by code, URL, or title
- **Database Connection Retry** - Automatic retry logic for database connections
- **Error Handling** - Comprehensive error handling with proper HTTP status codes
- **Input Validation** - Request validation using express-validator

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Prisma** - ORM for database management
- **PostgreSQL** - Database (via Neon)
- **express-validator** - Request validation
- **nanoid** - Short code generation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (or Neon account)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TinyLink-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
   BASE_URL="http://localhost:3001"
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up the database**
   
   Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
   
   Run migrations:
   ```bash
   npm run prisma:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## 📝 API Documentation

### Create Link

**POST** `/api/links`

Request body:
```json
{
  "originalUrl": "https://example.com",
  "shortCode": "example" // optional, 6-8 alphanumeric characters
}
```

Response (201):
```json
{
  "success": true,
  "message": "Short link created successfully",
  "data": {
    "link": {
      "id": "...",
      "shortCode": "example",
      "originalUrl": "https://example.com",
      "shortUrl": "http://localhost:3001/example",
      "clicks": 0,
      "createdAt": "..."
    }
  }
}
```

### Get All Links

**GET** `/api/links?page=1&limit=10&search=query`

Response:
```json
{
  "success": true,
  "data": {
    "links": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

### Get Link Stats

**GET** `/api/links/:code`

Response:
```json
{
  "success": true,
  "data": {
    "link": {
      "shortCode": "example",
      "originalUrl": "https://example.com",
      "clicks": 42,
      "analytics": [...]
    }
  }
}
```

### Delete Link

**DELETE** `/api/links/:code`

Response:
```json
{
  "success": true,
  "message": "Link deleted successfully"
}
```

### Redirect

**GET** `/:shortCode`

Returns HTTP 302 redirect to original URL and increments click count.

### Health Check

**GET** `/healthz`

Response:
```json
{
  "ok": true,
  "version": "1.0"
}
```

## 🔒 Environment Variables

Create a `.env` file with the following variables:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `BASE_URL` - Base URL for generating short links (default: http://localhost:3001)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 📁 Project Structure

```
TinyLink-Backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── db/              # Database configuration
│   ├── utils/           # Utility functions
│   └── server.js        # Express app entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── package.json
└── README.md
```

## 🧪 Testing

The API follows the specification for automated testing:
- Short codes follow pattern: `[A-Za-z0-9]{6,8}`
- Duplicate codes return 409 status
- Deleted links return 404
- Redirects increment click count
- Health endpoint returns 200

## 📄 License

ISC


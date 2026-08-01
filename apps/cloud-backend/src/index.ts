import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { env } from './infrastructure/config/env';
import { errorHandler } from './presentation/middlewares/errorHandler';
import { authRouter } from './presentation/routes/authRoutes';
import { albumRouter } from './presentation/routes/albumRoutes';
import { syncRouter } from './presentation/routes/syncRoutes';
import { clientRouter } from './presentation/routes/clientRoutes';
import { studioRouter } from './presentation/routes/studioRoutes';

const app = express();
app.set('trust proxy', 1); // Trust Render reverse proxy for rate-limiting
const server = http.createServer(app);

// Configure WebSocket Server
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust to specific frontend host in production
    methods: ['GET', 'POST'],
  },
});

// Real-time communication namespace for selection updates and presence
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Studios subscribe to their tenant-specific room
  socket.on('joinStudio', (studioId: string) => {
    socket.join(studioId);
    console.log(`🏢 Socket ${socket.id} joined studio workspace: ${studioId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Share Socket.io instance with Express requests
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Standard Security & Utilities Middleware
app.use(helmet());
app.use(cors({ origin: '*' })); // Customize CORS rules as needed
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiter to prevent brute force / DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 5000 : 10000, // requests limit
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

// API Routes mounting
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/albums', albumRouter);
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1/client', clientRouter);
app.use('/api/v1/studios', studioRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Centralized error middleware (Must be last)
app.use(errorHandler);

// Boot server
const PORT = env.PORT;
import { prisma } from './infrastructure/database/prisma';

async function cleanDuplicateImages() {
  try {
    console.log('🧹 Running database cleanup for duplicate images...');
    // Query duplicate rows
    const duplicates = await prisma.$queryRaw<Array<{ albumId: string; filename: string; min_id: string }>>`
      SELECT "albumId", "filename", MIN("id") as min_id
      FROM "Image"
      GROUP BY "albumId", "filename"
      HAVING COUNT(*) > 1
    `;

    console.log(`🧹 Found ${duplicates.length} duplicate image groups.`);
    for (const dup of duplicates) {
      // Delete duplicates except the oldest one
      const deleted = await prisma.image.deleteMany({
        where: {
          albumId: dup.albumId,
          filename: dup.filename,
          id: { not: dup.min_id }
        }
      });
      console.log(`🧹 Deleted ${deleted.count} duplicate records for "${dup.filename}" in album ${dup.albumId}`);
    }
    console.log('🧹 Duplicate images cleanup finished successfully.');
  } catch (err: any) {
    console.error('⚠️ Database cleanup failed:', err.message);
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 PhotoSelect REST API Gateway running on port ${PORT} [${env.NODE_ENV}]`);
  await cleanDuplicateImages();
});

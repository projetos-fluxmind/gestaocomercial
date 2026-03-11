import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { clientsRouter } from './modules/clients/clients.routes';
import { vehiclesRouter } from './modules/vehicles/vehicles.routes';
import { plansRouter } from './modules/plans/plans.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { commissionsRouter } from './modules/commissions/commissions.routes';
import { leaderboardRouter } from './modules/leaderboard/leaderboard.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';

const app = express();

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origin não permitido pelo CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api', usersRouter);
app.use('/api', clientsRouter);
app.use('/api', vehiclesRouter);
app.use('/api', plansRouter);
app.use('/api', salesRouter);
app.use('/api', commissionsRouter);
app.use('/api', leaderboardRouter);
app.use('/api', analyticsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});


import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import userRoutes from './routes/user.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/users', userRoutes);

// Swagger docs
const swaggerDoc = YAML.load(new URL('./docs/openapi.yaml', import.meta.url));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use(notFound);
app.use(errorHandler);

export default app;

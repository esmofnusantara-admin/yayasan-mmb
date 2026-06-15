import express from 'express';
import path from 'path';
import authRoutes from './routes/auth.routes';
import dataRoutes from './routes/data.routes';
import documentsRoutes from './routes/documents.routes';
import lettersRoutes from './routes/letters.routes';
import financeRoutes from './routes/finance.routes';
import systemRoutes from './routes/system.routes';
import { seedUsersIfEmpty, seedStructuresIfEmpty } from './services/seed.service';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/inward_letters', lettersRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/system', systemRoutes);

async function startServer() {
  await seedUsersIfEmpty();
  await seedStructuresIfEmpty();

  if (process.env.NODE_ENV !== 'production') {
    // Dynamically import Vite to prevent resolution errors in production environments where devDependencies are absent
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting and listening on port http://localhost:${PORT}`);
  });
}

startServer();

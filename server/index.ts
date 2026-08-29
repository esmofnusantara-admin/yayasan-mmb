import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './routes/auth.routes';
import { systemRouter } from './routes/system.routes';
import { dataRouter } from './routes/data.routes';
import { documentsRouter } from './routes/documents.routes';
import { lettersRouter } from './routes/letters.routes';
import { financeRouter } from './routes/finance.routes';
import { partnersRouter } from './routes/partners.routes';
import { membersRouter } from './routes/members.routes';
import { staffRouter } from './routes/staff.routes';
import { masterRouter } from './routes/master.routes';
import { smallGroupsRouter } from './routes/small-groups.routes';
import { approvalsRouter } from './routes/approvals.routes';
import { activitiesRouter } from './routes/activities.routes';
import { staffTasksRouter } from './routes/staff-tasks.routes';
import { seedAllInitialData } from './services/seed.service';

const PORT = 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Register and mount API Routers
app.use('/api/auth', authRouter);
app.use('/api/system', systemRouter);
app.use('/api/data', dataRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/letters', lettersRouter);
app.use('/api/inward_letters', lettersRouter); // backward compat alias
app.use('/api/finance', financeRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/members', membersRouter);
app.use('/api/staff', staffRouter);
app.use('/api/master', masterRouter);
app.use('/api/small-groups', smallGroupsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/staff-tasks', staffTasksRouter);

// Initialize server engine and register static assets handlers
async function startServer() {
  // Seed semua data awal dari BE (bukan dari FE)
  await seedAllInitialData();

  if (process.env.NODE_ENV !== 'production') {
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

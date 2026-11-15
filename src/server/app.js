import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import config from '../configuration/config.js';
import pageRoutes from '../routes/pageRoutes.js';
import apiRoutes from '../routes/apiRoutes.js';

/**
 * Creates and configures the Express application instance
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Configure Handlebars template engine
  app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(config.paths.views, 'layouts'),
    partialsDir: path.join(config.paths.views, 'partials'),
    helpers: {
      json: (context) => JSON.stringify(context),
      eq: (a, b) => a === b,
      formatDate: (date) => new Date(date).toISOString()
    }
  }));
  app.set('view engine', 'handlebars');
  app.set('views', config.paths.views);

  // Body parsing and static file middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(config.paths.public));

  // Diagnostic health probe
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      framework: 'Express + Handlebars',
      researchProject: 'Investigating Approaches to Automated Conformance Testing: DOM vs. Accessibility Tree'
    });
  });

  // Mount API routes
  app.use('/api', apiRoutes);

  // Mount Application and Page routes
  app.use('/', pageRoutes);

  // Custom 404 Handler
  app.use((req, res) => {
    res.status(404).render('pages/404', {
      title: 'Page Not Found',
      pageId: '404',
      requestedUrl: req.originalUrl,
      currentYear: new Date().getFullYear()
    });
  });

  return app;
}

export default createApp;

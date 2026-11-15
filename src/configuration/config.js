import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  paths: {
    root: ROOT_DIR,
    src: path.join(ROOT_DIR, 'src'),
    views: path.join(ROOT_DIR, 'views'),
    public: path.join(ROOT_DIR, 'public'),
    research: path.join(ROOT_DIR, 'research'),
    experiments: path.join(ROOT_DIR, 'experiments'),
    analysis: path.join(ROOT_DIR, 'analysis'),
    documentation: path.join(ROOT_DIR, 'documentation')
  },
  wcag: {
    standard: 'WCAG 2.2',
    targetLevel: 'AA',
    criteriaCount: 9
  }
};

export default config;

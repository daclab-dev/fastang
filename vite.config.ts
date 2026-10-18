import { defineFastangConfig } from '@fastang/core/vite';

import { generateAiDocs } from './scripts/generate-ai-docs';

generateAiDocs();

export default defineFastangConfig();

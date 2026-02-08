import { defineConfig } from 'orval';

export default defineConfig({
  budget: {
    input: {
      target: 'http://localhost:3001/api-json',
    },
    output: {
      target: './src/api/generated.ts',
      client: 'react-query',
      mode: 'single',
      override: {
        mutator: {
          path: './src/lib/api-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});

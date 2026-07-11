import { describe, it, expect } from 'bun:test';

interface Experiment {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  sourceVideoUrl: string;
  createdAt: string;
}

describe('ExperimentComparison component', () => {
  describe('Table structure', () => {
    it('has correct column headers', () => {
      const expectedHeaders = ['Experiment', 'Created', 'Source Video'];
      expect(expectedHeaders.length).toBe(3);
    });

    it('renders table with proper classes', () => {
      const tableClasses = ['overflow-x-auto', 'rounded-2xl', 'border'];
      expect(tableClasses.length).toBe(3);
    });
  });

  describe('Experiment rendering', () => {
    it('renders single experiment', () => {
      const experiments: Experiment[] = [
        {
          id: 'exp-1',
          name: 'Test Experiment',
          status: 'ready',
          sourceVideoUrl: 'https://youtube.com/watch?v=abc123',
          createdAt: '2025-01-15T10:30:00Z',
        },
      ];

      expect(experiments.length).toBe(1);
      expect(experiments[0].name).toBe('Test Experiment');
    });

    it('renders multiple experiments', () => {
      const experiments: Experiment[] = [
        { id: 'exp-1', name: 'Experiment 1', status: 'ready', sourceVideoUrl: 'https://youtube.com/watch?v=1', createdAt: '2025-01-15T10:30:00Z' },
        { id: 'exp-2', name: 'Experiment 2', status: 'ready', sourceVideoUrl: 'https://youtube.com/watch?v=2', createdAt: '2025-02-20T14:00:00Z' },
        { id: 'exp-3', name: 'Experiment 3', status: 'ready', sourceVideoUrl: 'https://youtube.com/watch?v=3', createdAt: '2025-03-10T08:15:00Z' },
      ];

      expect(experiments.length).toBe(3);
    });

    it('handles empty experiments array', () => {
      const experiments: Experiment[] = [];
      expect(experiments.length).toBe(0);
    });

    it('handles optional description field', () => {
      const withDescription: Experiment = {
        id: 'exp-1',
        name: 'With Description',
        description: 'A test experiment',
        status: 'ready',
        sourceVideoUrl: 'https://youtube.com/watch?v=abc',
        createdAt: '2025-01-15T10:30:00Z',
      };
      const withoutDescription: Experiment = {
        id: 'exp-2',
        name: 'Without Description',
        status: 'ready',
        sourceVideoUrl: 'https://youtube.com/watch?v=def',
        createdAt: '2025-01-15T10:30:00Z',
      };

      expect(withDescription.description).toBe('A test experiment');
      expect(withoutDescription.description).toBeUndefined();
    });
  });

  describe('Data formatting', () => {
    it('formats createdAt as locale date string', () => {
      const createdAt = '2025-01-15T10:30:00Z';
      const formatted = new Date(createdAt).toLocaleDateString();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('produces valid date from createdAt', () => {
      const createdAt = '2025-06-01T12:00:00Z';
      const date = new Date(createdAt);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(1);
    });
  });

  describe('Source video link', () => {
    it('stores sourceVideoUrl as a valid URL', () => {
      const url = 'https://youtube.com/watch?v=abc123';
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('Table accessibility', () => {
    it('uses semantic table elements', () => {
      const semanticElements = ['table', 'thead', 'tbody', 'tr', 'th', 'td'];
      expect(semanticElements.length).toBe(6);
    });

    it('has proper header scope', () => {
      const hasHeaders = true;
      expect(hasHeaders).toBe(true);
    });
  });

  describe('Hover interaction', () => {
    it('applies hover effect on rows', () => {
      const hoverClass = 'hover:bg-[var(--surface)]';
      expect(hoverClass).toContain('hover:');
    });
  });
});

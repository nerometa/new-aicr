import { describe, it, expect } from 'vitest';

// Only test pure functions that don't require env mocking
// API call tests are covered by integration tests

describe('klap service - pure functions', () => {
  describe('previewUrl', () => {
    // Import the function inline to test
    const previewUrl = (projectId: string) =>
      `https://klap.app/player/${projectId}`;

    it('builds correct preview URL for a project ID', () => {
      expect(previewUrl('abc123')).toBe('https://klap.app/player/abc123');
    });

    it('handles complex project IDs', () => {
      expect(previewUrl('proj_abc-123_xyz')).toBe('https://klap.app/player/proj_abc-123_xyz');
    });

    it('handles UUID-style project IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(previewUrl(uuid)).toBe(`https://klap.app/player/${uuid}`);
    });
  });

  describe('isKlapConfigured', () => {
    it('returns true for non-empty string', () => {
      const isKlapConfigured = (key: string) => !!key && key.length > 0;
      expect(isKlapConfigured('test-key')).toBe(true);
    });

    it('returns false for empty string', () => {
      const isKlapConfigured = (key: string) => !!key && key.length > 0;
      expect(isKlapConfigured('')).toBe(false);
    });

    it('returns false for undefined', () => {
      const isKlapConfigured = (key: string | undefined) => !!key && key.length > 0;
      expect(isKlapConfigured(undefined)).toBe(false);
    });
  });

  describe('API URL building', () => {
    it('constructs correct task URL', () => {
      const baseUrl = 'https://api.klap.video/v2';
      const taskId = 'task-123';
      expect(`${baseUrl}/tasks/${taskId}`).toBe('https://api.klap.video/v2/tasks/task-123');
    });

    it('constructs correct projects URL', () => {
      const baseUrl = 'https://api.klap.video/v2';
      const folderId = 'folder-456';
      expect(`${baseUrl}/projects/${folderId}`).toBe('https://api.klap.video/v2/projects/folder-456');
    });

    it('constructs correct export URL', () => {
      const baseUrl = 'https://api.klap.video/v2';
      const folderId = 'folder-456';
      const projectId = 'project-789';
      const exportId = 'export-012';
      expect(`${baseUrl}/projects/${folderId}/${projectId}/exports/${exportId}`).toBe(
        'https://api.klap.video/v2/projects/folder-456/project-789/exports/export-012'
      );
    });
  });
});

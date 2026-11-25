import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('./api', () => ({ default: { get } }));

import {
  getCareerAssistantConversations,
  getCareerAssistantMessages,
} from './careerAssistantService';

describe('Career Assistant history service pagination', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: [] });
  });

  it('passes bounded page and limit parameters without changing array responses', async () => {
    const conversations = [{ id: 'conversation-1' }];
    get.mockResolvedValueOnce({ data: conversations });

    await expect(getCareerAssistantConversations({ page: 2, limit: 50 })).resolves.toBe(conversations);
    expect(get).toHaveBeenCalledWith('/career-assistant/conversations', {
      params: { page: 2, limit: 50 },
    });

    await getCareerAssistantMessages('conversation-1', { page: 1000, limit: 100 });
    expect(get).toHaveBeenLastCalledWith('/career-assistant/conversations/conversation-1/messages', {
      params: { page: 1000, limit: 100 },
    });
  });

  it('rejects invalid client pagination before making a request', async () => {
    await expect(getCareerAssistantConversations({ page: 1001, limit: 50 })).rejects.toThrow(RangeError);
    await expect(getCareerAssistantMessages('conversation-1', { page: 1, limit: 101 }))
      .rejects.toThrow(RangeError);
    expect(get).not.toHaveBeenCalled();
  });
});

import { createApplicationService } from '../services/applicationService.js';

export function createApplicationController({ service = createApplicationService() } = {}) {
  return {
    async create(request, response, next) {
      try {
        const result = await service.create(request.user, request.body);
        return response.status(result.created ? 201 : 200).json(result.application);
      } catch (error) {
        return next(error);
      }
    },

    async list(request, response, next) {
      try {
        return response.status(200).json(await service.list(request.user, request.query));
      } catch (error) {
        return next(error);
      }
    },

    async stats(request, response, next) {
      try {
        return response.status(200).json(await service.stats(request.user));
      } catch (error) {
        return next(error);
      }
    },

    async getById(request, response, next) {
      try {
        return response.status(200).json(await service.getById(request.user, request.params.id));
      } catch (error) {
        return next(error);
      }
    },

    async update(request, response, next) {
      try {
        return response.status(200).json(await service.update(
          request.user,
          request.params.id,
          request.body,
        ));
      } catch (error) {
        return next(error);
      }
    },

    async remove(request, response, next) {
      try {
        await service.remove(request.user, request.params.id);
        return response.status(204).end();
      } catch (error) {
        return next(error);
      }
    },
  };
}

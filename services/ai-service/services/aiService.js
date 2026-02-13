// match-server/services/aiService.js
// Client for calling the Python ai-service

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:9000';

/**
 * Client for interacting with the AI service (Python/Claude backend)
 */
class AIService {
  /**
   * Find candidate matches for a single need
   * 
   * @param {Object} need - Need object with description and metadata
   * @param {Array} resources - Array of available resources
   * @param {number} topK - Maximum number of candidates to return (default: 10)
   * @returns {Promise<Array>} Array of candidate objects
   * 
   * @example
   * const candidates = await aiService.findMatches(
   *   { id: 'n1', description: 'I want a sandwich' },
   *   [
   *     { id: 'r1', description: 'bread' },
   *     { id: 'r2', description: 'cheese' }
   *   ]
   * );
   * 
   * // Returns:
   * // [
   * //   {
   * //     resource_ids: ['r1', 'r2'],
   * //     feasibility_score: 90,
   * //     explanation: 'Bread and cheese make a sandwich',
   * //     gaps: [],
   * //     confidence: 'high'
   * //   }
   * // ]
   */
  async findMatches(need, resources, topK = 10) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/match`,
        {
          need,
          resources,
          top_k: topK
        },
        {
          timeout: 30000, // 30 second timeout (Claude can be slow)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.candidates;
    } catch (error) {
      if (error.response) {
        // AI service returned an error
        throw new Error(
          `AI service error (${error.response.status}): ${
            error.response.data.detail || error.message
          }`
        );
      } else if (error.request) {
        // AI service didn't respond
        throw new Error(
          `AI service unreachable at ${AI_SERVICE_URL}. Is it running?`
        );
      } else {
        // Something else went wrong
        throw error;
      }
    }
  }

  /**
   * Batch match multiple needs against resources
   * More efficient for batch processing
   * 
   * @param {Array} needs - Array of need objects
   * @param {Array} resources - Array of resource objects
   * @param {number} topK - Max candidates per need (default: 5)
   * @returns {Promise<Object>} Object mapping need_id -> candidates
   * 
   * @example
   * const results = await aiService.batchMatch(
   *   [
   *     { id: 'n1', description: 'sandwich' },
   *     { id: 'n2', description: 'move furniture' }
   *   ],
   *   resources
   * );
   * 
   * // Returns:
   * // {
   * //   'n1': [{ resource_ids: [...], ... }],
   * //   'n2': [{ resource_ids: [...], ... }]
   * // }
   */
  async batchMatch(needs, resources, topK = 5) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/match/batch`,
        {
          needs,
          resources,
          top_k: topK
        },
        {
          timeout: 60000, // 60 seconds for batch (can be slow)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `AI service error (${error.response.status}): ${
            error.response.data.detail || error.message
          }`
        );
      } else if (error.request) {
        throw new Error(
          `AI service unreachable at ${AI_SERVICE_URL}. Is it running?`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Health check - verify AI service is running
   * 
   * @returns {Promise<boolean>} true if healthy, false otherwise
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`, {
        timeout: 5000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
module.exports = new AIService();
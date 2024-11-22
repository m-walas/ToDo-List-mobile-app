// src/services/github.js

import axios from 'axios';

/**
 * Fetches issues from a GitHub repository.
 * @param {string} accessToken - GitHub access token.
 * @param {string} repoOwner - Repository owner.
 * @param {string} repoName - Repository name.
 * @returns {Promise<Array>} - List of issues.
 */
export const fetchGitHubIssues = async (accessToken, repoOwner, repoName) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
      params: {
        state: 'all',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching GitHub issues:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Maps GitHub issues to tasks for the app.
 * @param {Array} issues - List of GitHub issues.
 * @returns {Array} - Mapped tasks.
 */
export const mapIssuesToTasks = (issues) => {
  return issues.map(issue => ({
    id: issue.id.toString(),
    title: issue.title,
    isCompleted: issue.state === 'closed',
  }));
};

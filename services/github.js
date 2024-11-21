// services/github.js
import axios from 'axios';

/**
 * Pobiera issues z repozytorium GitHuba.
 * @param {string} accessToken - Token dostępu GitHub.
 * @param {string} repoOwner - Właściciel repozytorium.
 * @param {string} repoName - Nazwa repozytorium.
 * @returns {Promise<Array>} - Lista issues.
 */
export const fetchGitHubIssues = async (accessToken, repoOwner, repoName) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
      params: {
        state: 'all', // info: Pobieranie zarówno opened, jak i closed issues
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching GitHub issues:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Przekształca issues na format zrozumiały dla aplikacji.
 * @param {Array} issues - Lista issues z GitHuba.
 * @returns {Array} - Przekształcone zadania.
 */
export const mapIssuesToTasks = (issues) => {
  return issues.map(issue => ({
    id: issue.id.toString(),
    title: issue.title,
    isCompleted: issue.state === 'closed',
  }));
};

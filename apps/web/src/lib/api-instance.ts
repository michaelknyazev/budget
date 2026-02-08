import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Custom instance for orval-generated API client.
 * This function is used as the mutator in orval.config.ts
 */
export const customInstance = async <T>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await apiInstance(config);
  return response.data;
};

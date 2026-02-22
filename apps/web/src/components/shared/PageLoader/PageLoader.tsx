import { Spinner } from '@blueprintjs/core';
import styles from './PageLoader.module.scss';

interface PageLoaderProps {
  size?: number;
}

export function PageLoader({ size = 50 }: PageLoaderProps) {
  return (
    <div className={styles.container}>
      <Spinner size={size} />
    </div>
  );
}

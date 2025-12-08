import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
  gradient: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'File-Based Routing',
    icon: '📁',
    description: (
      <>
        Organize routes as files. Each <code>route.ts</code> becomes an endpoint.
        No configuration, no decorators, just clean file structure.
      </>
    ),
    gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
  },
  {
    title: 'Auto-Discovery',
    icon: '🔍',
    description: (
      <>
        Fastay automatically discovers routes and middlewares. Just add files
        to the right directories and they're instantly available.
      </>
    ),
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  {
    title: 'TypeScript First',
    icon: '📘',
    description: (
      <>
        Built with TypeScript from the ground up. Full type safety, IntelliSense,
        and modern JavaScript features out of the box.
      </>
    ),
    gradient: 'linear-gradient(135deg, #0ea5e9, #10b981)',
  },
  {
    title: 'Express Power',
    icon: '⚡',
    description: (
      <>
        Full access to Express.js ecosystem. Use any Express middleware,
        package, or pattern while enjoying Fastay's productivity boost.
      </>
    ),
    gradient: 'linear-gradient(135deg, #f59e0b, #ec4899)',
  },
  {
    title: 'Zero Config',
    icon: '🚀',
    description: (
      <>
        Start coding immediately. No complex configuration files.
        Sensible defaults that you can override when needed.
      </>
    ),
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  },
  {
    title: 'Production Ready',
    icon: '🛡️',
    description: (
      <>
        Built-in security, error handling, CORS, and performance optimizations.
        Deploy with confidence to any environment.
      </>
    ),
    gradient: 'linear-gradient(135deg, #10b981, #8b5cf6)',
  },
];

function Feature({ title, icon, description, gradient }: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div 
          className={styles.featureIconContainer}
          style={{ background: gradient }}
        >
          <span className={styles.featureIcon}>{icon}</span>
        </div>
        <div className={styles.featureContent}>
          <Heading as="h3" className={styles.featureTitle}>
            {title}
          </Heading>
          <div className={styles.featureDescription}>{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <Heading as="h2" className={styles.featuresTitle}>
            Why Choose Fastay?
          </Heading>
          <p className={styles.featuresSubtitle}>
            Experience the perfect blend of simplicity and power
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
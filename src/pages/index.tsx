import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import CodeExample from "@site/src/components/CodeExample";
import CodeBlock from "@theme/CodeBlock";
import { useEffect, useState } from "react";
import styles from "./index.module.css";

// Import icons (you'll need to add these to your static folder)
// or use React Icons if you prefer

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  const codeExample = `
// src/api/users/[id].ts
import { Request } from '@syntay/fastay';

export async function GET(req: Request) {
  const { id } = req.params;

  return {
    user: { id, name: 'John Doe' }
  };
}
  `;

  const codeStart = `npx fastay create-app my-api
  `;

  const texts = [
    "file-based routing",
    "auto-discovered APIs",
    "zero-config TypeScript",
    "intentional simplicity",
    "lightning fast setup",
  ];

  useEffect(() => {
    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const type = () => {
      const currentText = texts[currentTextIndex];

      if (!isDeleting && currentCharIndex <= currentText.length) {
        setTypedText(currentText.substring(0, currentCharIndex));
        currentCharIndex++;
        typingSpeed = 100;
      } else if (isDeleting && currentCharIndex >= 0) {
        setTypedText(currentText.substring(0, currentCharIndex));
        currentCharIndex--;
        typingSpeed = 50;
      }

      if (!isDeleting && currentCharIndex === currentText.length + 1) {
        isDeleting = true;
        typingSpeed = 1500;
      } else if (isDeleting && currentCharIndex === -1) {
        isDeleting = false;
        currentTextIndex = (currentTextIndex + 1) % texts.length;
        typingSpeed = 500;
      }

      setTimeout(type, typingSpeed);
    };

    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);

    type();

    return () => {
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.badgeContainer}>
            <span className={styles.badge}>TypeScript-First</span>
            <span className={styles.badge}>Express-Powered</span>
            <span className={styles.badge}>Production Ready</span>
          </div>

          <Heading as="h1" className={clsx("hero__title", styles.heroTitle)}>
            The <span className={styles.highlight}>Modern</span> Backend
            Framework
          </Heading>

          <p className={clsx("hero__subtitle", styles.heroSubtitle)}>
            Build APIs with{" "}
            <span className={styles.typedText}>
              {typedText}
              <span
                className={cursorVisible ? styles.cursor : styles.cursorHidden}
              >
                |
              </span>
            </span>
          </p>

          <div className={styles.heroDescription}>
            Fastay is a minimalist, intuitive framework that bridges the gap
            between Express.js flexibility and NestJS structure. Create
            full-featured APIs in minutes, not hours.
          </div>

          <div
            style={{
              margin: "auto",
              marginBottom: "20px",
              display: "inline-flex",
            }}
          >
            <CodeBlock
              showLineNumbers={false}
              language="bash"
            >{`npx fastay create-app my-api`}</CodeBlock>
          </div>

          <div className={styles.buttonGroup}>
            <Link
              className={clsx("button button--lg", styles.getStartedButton)}
              to="/introduction"
            >
              Get Started →
            </Link>
            {/* <Link
              className={clsx(
                "button button--lg button--outline",
                styles.demoButton
              )}
              to="/docs/examples/quick-start"
            >
              View Examples
            </Link> */}
            <a
              href="https://github.com/syntay-team/fastay"
              className={clsx(
                "button button--lg button--secondary",
                styles.githubButton
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className={styles.githubIcon} viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              Star on GitHub
            </a>
          </div>

          <div className={styles.featurePreview}>
            <div className={styles.codePreview}>
              <CodeExample language="typescript">{codeExample}</CodeExample>
            </div>
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>⚡</div>
                <h4>File-Based Routing</h4>
                <p>
                  Routes auto-discover from directory structure. No manual
                  registration.
                </p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔧</div>
                <h4>Zero Configuration</h4>
                <p>
                  Start coding immediately with sensible defaults and TypeScript
                  ready.
                </p>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🚀</div>
                <h4>Production Ready</h4>
                <p>
                  Built-in security, error handling, and performance
                  optimizations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ComparisonSection() {
  return (
    <section className={styles.comparisonSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          The Perfect Balance
        </Heading>
        <p className={styles.sectionSubtitle}>
          Fastay finds the sweet spot between flexibility and structure
        </p>

        <div className={styles.comparisonGrid}>
          <div className={styles.frameworkCard}>
            <div className={styles.frameworkHeader}>
              <h3>Express.js</h3>
              <span className={styles.frameworkTag}>Too Minimal</span>
            </div>
            <ul className={styles.frameworkList}>
              <li className={styles.negative}>✗ Manual route registration</li>
              <li className={styles.negative}>✗ No built-in structure</li>
              <li className={styles.negative}>✗ Middleware complexity</li>
              <li className={styles.positive}>✓ Maximum flexibility</li>
              <li className={styles.positive}>✓ Lightweight</li>
            </ul>
          </div>

          <div className={styles.fastayCard}>
            <div className={styles.fastayBadge}>FASTAY</div>
            <div className={styles.connectors}>
              <div className={styles.connectorLeft}></div>
              <div className={styles.connectorRight}></div>
            </div>
            <ul className={styles.fastayList}>
              <li className={styles.positive}>✓ Auto-discovered routes</li>
              <li className={styles.positive}>✓ Smart conventions</li>
              <li className={styles.positive}>✓ TypeScript-first</li>
              <li className={styles.positive}>✓ File-based structure</li>
              <li className={styles.positive}>✓ Production ready</li>
            </ul>
          </div>

          <div className={styles.frameworkCard}>
            <div className={styles.frameworkHeader}>
              <h3>NestJS</h3>
              <span className={styles.frameworkTag}>Too Structured</span>
            </div>
            <ul className={styles.frameworkList}>
              <li className={styles.positive}>✓ Decorator-based</li>
              <li className={styles.positive}>✓ Dependency injection</li>
              <li className={styles.positive}>✓ Modular architecture</li>
              <li className={styles.negative}>✗ Steep learning curve</li>
              <li className={styles.negative}>✗ Configuration heavy</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    {
      value: "5x",
      label: "Faster Setup",
      desc: "Compared to traditional frameworks",
    },
    { value: "0", label: "Config Files", desc: "To start your first API" },
    {
      value: "100%",
      label: "TypeScript",
      desc: "First-class TypeScript support",
    },
    {
      value: "Auto",
      label: "Route Discovery",
      desc: "No manual registration needed",
    },
  ];

  return (
    <section className={styles.statsSection}>
      <div className="container">
        <div className={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statDesc}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to Build Something Amazing?
          </Heading>
          <p className={styles.ctaText}>
            Join thousands of developers who have shipped production APIs with
            Fastay. Get started in under a minute.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className={clsx(
                "button button--lg button--primary",
                styles.ctaButton
              )}
              to="/getting-started"
            >
              Start Building Now
            </Link>
            <a
              href="https://github.com/syntay-team/fastay"
              className={clsx(
                "button button--lg button--outline",
                styles.ctaButtonSecondary
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              View GitHub Repo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="Fastay - The Modern Backend Framework"
      description="Build powerful APIs with TypeScript, file-based routing, and zero configuration. Fastay combines Express.js flexibility with smart conventions for rapid development."
    >
      <HomepageHeader />
      <main>
        <ComparisonSection />
        <StatsSection />
        <HomepageFeatures />
        <CtaSection />
      </main>
    </Layout>
  );
}

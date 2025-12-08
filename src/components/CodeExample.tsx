
import React from 'react';
import CodeBlock from '@theme/CodeBlock';

interface CodeExampleProps {
  title?: string;
  language?: string;
  children: string;
  showLineNumbers?: boolean;
}

export default function CodeExample({
  title,
  language = 'typescript',
  children,
  showLineNumbers = true
}: CodeExampleProps) {
  return (
    <div className="code-example-wrapper">
      {title && (
        <div className="code-example-header">
          <span className="code-example-title">{title}</span>
        </div>
      )}
      <CodeBlock
        language={language}
        showLineNumbers={showLineNumbers}
        className="code-example"
      >
        {children.trim()}
      </CodeBlock>
    </div>
  );
}
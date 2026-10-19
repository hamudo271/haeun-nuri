import { Fragment } from 'react';

/** 원고의 **강조** 표시를 금색 글자로, \n 을 줄바꿈으로 바꿔 그린다. */
export default function Rich({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? <em key={j}>{part.slice(2, -2)}</em> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  );
}

/** 여러 줄 배열을 한 덩어리로 */
export function Lines({ lines }: { lines: string[] }) {
  return <Rich text={lines.join('\n')} />;
}

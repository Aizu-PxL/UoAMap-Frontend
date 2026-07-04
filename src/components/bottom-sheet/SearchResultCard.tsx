export type SearchResult = {
  id: number;
  title: string;
  time: string;
  place: string;
  tag: string;
};

type SearchResultCardProps = {
  result: SearchResult;
};

export function SearchResultCard({ result }: SearchResultCardProps) {
  return (
    <article className="event-card">
      <h2>{result.title}</h2>
      <p>
        {result.time} <span>{result.place}</span>
      </p>
      <div className="event-card__tag">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h9l7 7-8 8-8-8V5Z" />
          <circle cx="9" cy="10" r="1.5" />
        </svg>
        {result.tag}
      </div>
    </article>
  );
}

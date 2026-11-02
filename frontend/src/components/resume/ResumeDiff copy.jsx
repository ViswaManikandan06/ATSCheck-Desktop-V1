export default function ResumeDiff({ text, diff, className = "" }) {
  if (!text) {
    return <div className={className}>No content available.</div>;
  }

  if (!diff || (!diff.added && !diff.removed)) {
    return <div className={className}>{text}</div>;
  }

  const tokens = Array.isArray(diff.added) ? diff.added : [];
  const removed = Array.isArray(diff.removed) ? diff.removed : [];

  const rendered = String(text)
    .split(/\s+/)
    .map((chunk, index) => {
      const trimmed = chunk.trim();

      if (!trimmed) {
        return null;
      }

      const isAdded = tokens.some((token) => token && String(token).includes(trimmed));
      const isRemoved = removed.some((token) => token && String(token).includes(trimmed));

      return (
        <span
          key={`${trimmed}-${index}`}
          className={[
            "whitespace-pre-wrap",
            isAdded ? "rounded bg-[#b8ff5a] px-1 py-[1px] text-black" : "",
            isRemoved ? "rounded bg-[#ffb3b3] px-1 py-[1px] text-black line-through" : "",
          ].join(" ")}
        >
          {chunk}{" "}
        </span>
      );
    });

  return <div className={className}>{rendered}</div>;
}

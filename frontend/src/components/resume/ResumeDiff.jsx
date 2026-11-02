export default function ResumeDiff({ text, diff, className = "" }) {
  if (!text) {
    return <div className={className}>No content available.</div>;
  }

  if (!diff || (!diff.added && !diff.removed && !diff.changes)) {
    return <div className={className}>{text}</div>;
  }

  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const currentText = normalize(text);
  const changes = Array.isArray(diff.changes) ? diff.changes : [];

  const match = changes.find((change) => {
    const original = normalize(change?.original_text);
    const suggested = normalize(change?.suggested_text);
    return Boolean(suggested) && currentText === suggested;
  });

  if (match) {
    const original = String(match.original_text ?? "");
    const suggested = String(match.suggested_text ?? "");
    const originalTokens = original.match(/\s+|\S+/g) || [];
    const suggestedTokens = suggested.match(/\s+|\S+/g) || [];
    const rows = originalTokens.length + 1;
    const cols = suggestedTokens.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = originalTokens.length - 1; i >= 0; i -= 1) {
      for (let j = suggestedTokens.length - 1; j >= 0; j -= 1) {
        if (originalTokens[i] === suggestedTokens[j]) {
          dp[i][j] = dp[i + 1][j + 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    const segments = [];
    let i = 0;
    let j = 0;

    while (i < originalTokens.length && j < suggestedTokens.length) {
      if (originalTokens[i] === suggestedTokens[j]) {
        segments.push({ type: "plain", text: originalTokens[i] });
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        segments.push({ type: "removed", text: originalTokens[i] });
        i += 1;
      } else {
        segments.push({ type: "added", text: suggestedTokens[j] });
        j += 1;
      }
    }

    while (i < originalTokens.length) {
      segments.push({ type: "removed", text: originalTokens[i] });
      i += 1;
    }

    while (j < suggestedTokens.length) {
      segments.push({ type: "added", text: suggestedTokens[j] });
      j += 1;
    }

    return (
      <div className={className}>
        {segments.filter((segment) => segment.text && segment.text.trim() !== "").map((segment, index) => {
          if (segment.type === "added") {
            return <span key={`${segment.type}-${index}`} className="rounded bg-[#b8ff5a] px-1 py-[1px] text-black">{segment.text}</span>;
          }

          if (segment.type === "removed") {
            return <span key={`${segment.type}-${index}`} className="rounded bg-[#ffb3b3] px-1 py-[1px] text-black line-through">{segment.text}</span>;
          }

          return <span key={`${segment.type}-${index}`}>{segment.text}</span>;
        })}
      </div>
    );
  }

  const addValues = Array.isArray(diff.added) ? diff.added : [];
  const removeValues = Array.isArray(diff.removed) ? diff.removed : [];
  const isAdded = addValues.some((value) => normalize(value) === currentText);
  const isRemoved = removeValues.some((value) => normalize(value) === currentText);

  return (
    <div className={className}>
      <span
        className={[
          "whitespace-pre-wrap",
          isAdded ? "rounded bg-[#b8ff5a] px-1 py-[1px] text-black" : "",
          isRemoved ? "rounded bg-[#ffb3b3] px-1 py-[1px] text-black line-through" : "",
        ].join(" ")}
      >
        {text}
      </span>
    </div>
  );
}

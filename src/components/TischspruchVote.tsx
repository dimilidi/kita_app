import clsx from "clsx";

type TischspruchVoteProps = {
  options: { id: number; title: string; text: string }[];
  votes: Record<number, number>;
  onVote: (id: number) => void;
  disabled: boolean;
  /** Omit the inner "Tischspruch" heading when the parent already shows a section title. */
  hideHeading?: boolean;
  /** Denser padding and typography (e.g. lunch group cards). */
  compact?: boolean;
};

const TischspruchVote = ({
  options,
  votes,
  onVote,
  disabled,
  hideHeading = false,
  compact = false,
}: TischspruchVoteProps) => {
  if (options.length === 0) {
    return (
      <div
        className={clsx(
          "rounded-lg bg-white/80 text-center text-gray-500",
          compact ? "px-2 py-1.5 text-[10px]" : "mt-3 rounded-xl p-2 text-xs"
        )}
      >
        No Tischsprueche available.
      </div>
    );
  }

  const winner = options.reduce((best, option) => {
    const currentVotes = votes[option.id] ?? 0;
    const bestVotes = votes[best.id] ?? 0;
    return currentVotes > bestVotes ? option : best;
  }, options[0]);

  return (
    <div
      className={clsx(
        "rounded-lg bg-white/80 text-xs",
        compact ? "p-1.5" : "mt-3 rounded-xl p-2"
      )}
    >
      {!hideHeading && (
        <div className={clsx("text-center font-semibold", compact ? "mb-1 text-[11px]" : "mb-2")}>
          🍽️ Tischspruch
        </div>
      )}

      <div className={clsx("grid grid-cols-1", compact ? "gap-1" : "gap-2")}>
        {options.map((option) => (
          <div
            key={option.id}
            className={clsx(
              "rounded-lg border bg-gray-50",
              compact ? "p-1.5" : "p-2",
              winner.id === option.id && "border-green-400 bg-green-100"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onVote(option.id)}
                disabled={disabled}
                className={clsx(
                  "text-left flex-1",
                  disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                )}
              >
                <div className={clsx("font-semibold", compact && "text-[11px] leading-tight")}>
                  {option.title}
                </div>
                <div className={clsx(compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]")}>
                  Votes: {votes[option.id] ?? 0}
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className={clsx(
          "text-center font-semibold",
          compact ? "mt-1 text-[10px] leading-tight" : "mt-2 text-sm"
        )}
      >
        Winner: {winner.title}
      </div>
    </div>
  );
};

export default TischspruchVote;

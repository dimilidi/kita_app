import clsx from "clsx";

const TischspruchVote = ({
  options,
  votes,
  onVote,
  disabled,
}: {
  options: { id: number; title: string; text: string }[];
  votes: Record<number, number>;
  onVote: (id: number) => void;
  disabled: boolean;
}) => {
  if (options.length === 0) {
    return (
      <div className="mt-3 rounded-xl bg-white/80 p-2 text-xs text-center text-gray-500">
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
    <div className="mt-3 rounded-xl bg-white/80 p-2 text-xs">
      <div className="mb-2 text-center font-semibold">
        🍽️ Tischspruch
      </div>

      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => (
          <div
            key={option.id}
            className={clsx(
              "rounded-lg border p-2 bg-gray-50",
              winner.id === option.id && "border-green-400 bg-green-100"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => onVote(option.id)}
                disabled={disabled}
                className={clsx(
                  "text-left flex-1",
                  disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                )}
              >
                <div className="font-semibold">{option.title}</div>
                <div className="mt-1 text-[11px]">Votes: {votes[option.id] ?? 0}</div>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-center text-sm font-semibold">
        Winner: {winner.title}
      </div>
    </div>
  );
};
 export default TischspruchVote;
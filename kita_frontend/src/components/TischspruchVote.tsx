import clsx from "clsx";

const TischspruchVote = ({
  votes,
  onVote,
  disabled,
}: {
  votes: Record<VoteKey, number>;
  onVote: (key: VoteKey) => void;
  disabled: boolean;
}) => {
  const winner = Object.entries(votes).reduce((a, b) =>
    a[1] >= b[1] ? a : b
  )[0] as VoteKey;

  const labels: Record<VoteKey, string> = {
    danke: "🙏 Danke fürs Essen",
    piep: "🐥 Piep, piep, piep",
    apfel: "🍎 Alle Kinder essen gern",
  };

  return (
    <div className="mt-3 rounded-xl bg-white/80 p-2 text-xs">
      <div className="mb-2 text-center font-semibold">
        🍽️ Tischspruch
      </div>

      <div className="flex justify-between gap-1">
        {(Object.keys(votes) as VoteKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onVote(key)}
            disabled={disabled}
            className={clsx(
              "flex-1 rounded-lg px-2 py-1",
              disabled
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200",
              winner === key && "bg-green-200 font-semibold"
            )}
          >
            {labels[key]} ({votes[key]})
          </button>
        ))}
      </div>

      <div className="mt-2 text-center text-sm font-semibold">
        🏆 Winner: {labels[winner]}
      </div>
    </div>
  );
};
 export default TischspruchVote;
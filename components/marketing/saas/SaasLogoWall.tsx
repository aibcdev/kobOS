const LOGOS = [
  "Bills",
  "The Real Greek",
  "Leon",
  "Honest Burgers",
  "Gaucho",
  "Pizza Pilgrims",
  "BrewDog",
  "The Cosy Club",
] as const;

export function SaasLogoWall({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-[#2c2c2c]/40 uppercase">
        Loved by restaurants like yours
      </p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-10">
        {LOGOS.map((name) => (
          <li
            key={name}
            className="font-heading text-lg tracking-tight text-[#2c2c2c]/28 sm:text-xl"
            aria-hidden
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

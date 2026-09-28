import SearchBox from "../SearchBox";

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-glow" />
        <svg className="hero-lines" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <path d="M-20 520 C 300 470, 520 300, 1220 250" />
          <path d="M-20 560 C 340 520, 600 360, 1220 330" />
          <path d="M-20 600 C 380 570, 700 430, 1220 410" />
        </svg>
      </div>

      <div className="container hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title" className="hero-title">Book your train journey.</h1>
          <p className="hero-sub">
            Search trains, compare timings and fares, pick your seats and get your
            e‑ticket in minutes.
          </p>
        </div>

        <div className="hero-search" id="search">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}
